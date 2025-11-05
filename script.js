// script.js — updated to point to Render server and handle new API shape
document.addEventListener('DOMContentLoaded', () => {
  checkQuizVersion().then(() => {
    let section = parseInt(localStorage.getItem('quizSection')) || 1;
    let isRetry = localStorage.getItem('quizRetry') === 'true';
    let phone = localStorage.getItem('quizPhone') || '';
    const contentDiv = document.getElementById('content');
    let questions = [];

    // Backend base URL (your Render service)
    const BACKEND_BASE = 'https://perontips-fliers-backend.onrender.com';

    function showSectionSelector() {
      contentDiv.innerHTML = `
        <h2>Select Quiz Section</h2>
        <select id="section-select">
          ${Array.from({ length: 10 }, (_, i) =>
            `<option value="${i + 1}" ${i + 1 === section ? 'selected' : ''}>Section ${String.fromCharCode(65 + i)}</option>`
          ).join('')}
        </select>
        <button id="select-btn">Continue</button>
      `;
      document.getElementById('select-btn').addEventListener('click', () => {
        section = parseInt(document.getElementById('section-select').value, 10);
        localStorage.setItem('quizSection', section);
        showPayment();
      });
    }

    function showPayment() {
      contentDiv.innerHTML = '';
      const amount = isRetry ? 20 : (section <= 5 ? 5 : 10);
      contentDiv.innerHTML = `
        <h2>Section ${String.fromCharCode(64 + section)}</h2>
        <p>Payment required: Ksh ${amount}</p>
        <input id="phone-input" placeholder="Enter phone (e.g., 07XXXXXXXX)" value="${phone}" />
        <button id="pay-btn">Pay Now</button>
        <div id="payment-status"></div>
      `;
      document.getElementById('pay-btn').addEventListener('click', initiatePayment);
    }

    async function initiatePayment() {
      const input = document.getElementById('phone-input');
      let rawPhone = input.value.trim();

      if (/^07\d{8}$/.test(rawPhone)) {
        phone = '254' + rawPhone.substring(1);
      } else if (/^2547\d{8}$/.test(rawPhone)) {
        phone = rawPhone;
      } else {
        alert('Enter valid phone number starting with 07 or 2547');
        return;
      }

      localStorage.setItem('quizPhone', rawPhone);
      document.getElementById('payment-status').innerText = 'Processing payment...';

      // Note: the new backend uses a fixed amount for flyer payments.
      // For your quiz flow we still send the amount so backend can log it (backend will ignore or use fixed amount).
      const payload = {
        phone: phone,
        // keep the existing amount semantics for quiz (backend will use its fixed price if configured)
        amount: isRetry ? 20 : (section <= 5 ? 5 : 10),
        event: 'quiz-section', // optional metadata
        template: `section-${section}`
      };

      try {
        const res = await fetch(`${BACKEND_BASE}/api/mpesa/stk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          // try to read error body
          const errText = await res.text().catch(() => '');
          document.getElementById('payment-status').innerText = `Payment initiation failed: ${res.status} ${res.statusText} ${errText}`;
          return;
        }

        const data = await res.json();

        // Backend returns { checkoutId, data } — handle both old and new shapes
        const checkoutId = data.checkoutId || data.CheckoutRequestID || data?.data?.CheckoutRequestID;
        const darajaData = data.data || data;

        if (checkoutId) {
          document.getElementById('payment-status').innerText = 'STK Push sent. Enter your M-PESA PIN.';
          // poll /api/mpesa/status?checkoutId=...
          const interval = setInterval(async () => {
            try {
              const statusRes = await fetch(`${BACKEND_BASE}/api/mpesa/status?checkoutId=${encodeURIComponent(checkoutId)}`);
              if (!statusRes.ok) {
                // fallback to old phone-based status if available
                const fallbackRes = await fetch(`${BACKEND_BASE}/status?phone=${encodeURIComponent(phone)}`).catch(() => null);
                if (fallbackRes && fallbackRes.ok) {
                  const fallbackData = await fallbackRes.json();
                  if (fallbackData.status && fallbackData.status !== 'Pending') {
                    clearInterval(interval);
                    handleStatusResult(fallbackData.status);
                  }
                }
                return;
              }
              const statusData = await statusRes.json();
              // statusData.status expected to be 'Pending' | 'Success' | 'Failed'
              if (statusData.status && statusData.status !== 'Pending') {
                clearInterval(interval);
                handleStatusResult(statusData.status);
              }
            } catch (pollErr) {
              console.error('Status poll error', pollErr);
            }
          }, 3000);
        } else if (darajaData && (darajaData.ResponseCode === '0' || darajaData.ResponseCode === 0)) {
          // older style response from Daraja inside 'data'
          document.getElementById('payment-status').innerText = 'STK Push sent. Enter your M-PESA PIN.';
          // fallback polling by phone
          const interval = setInterval(async () => {
            try {
              const statusRes = await fetch(`${BACKEND_BASE}/status?phone=${encodeURIComponent(phone)}`);
              if (!statusRes.ok) return;
              const statusData = await statusRes.json();
              if (statusData.status && statusData.status !== 'Pending') {
                clearInterval(interval);
                handleStatusResult(statusData.status);
              }
            } catch (pollErr) {
              console.error('Status poll error', pollErr);
            }
          }, 3000);
        } else {
          document.getElementById('payment-status').innerText = 'Payment request failed.';
          console.warn('Unexpected payment response', data);
        }
      } catch (err) {
        console.error(err);
        document.getElementById('payment-status').innerText = 'Error initiating payment.';
      }
    }

    function handleStatusResult(status) {
      const statusTextEl = document.getElementById('payment-status');
      if (status === 'Success' || status === 'success' || status === 0) {
        statusTextEl.innerText = 'Payment confirmed — loading quiz...';
        // clear retry flag
        isRetry = false;
        localStorage.setItem('quizRetry', 'false');
        // navigate to quiz
        setTimeout(() => { window.location.href = 'quiz.html'; }, 800);
      } else {
        statusTextEl.innerText = 'Payment failed: ' + status;
        isRetry = true;
        localStorage.setItem('quizRetry', 'true');
        setTimeout(showPayment, 2000);
      }
    }

    async function loadQuestionsFromSheet() {
      const field = localStorage.getItem('quizField') || 'default';
      const sectionIndex = parseInt(localStorage.getItem('quizSection')) || 1;
      const sheetURL = window.SHEET_CONFIG?.sheets?.[field] || window.SHEET_CONFIG?.default;

      try {
        const res = await fetch(sheetURL);
        const text = await res.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;

        const startIndex = (sectionIndex - 1) * 10;
        questions = rows.slice(startIndex, startIndex + 10).map(row => ({
          question: row.c[0]?.v || '',
          answer: row.c[1]?.v || ''
        }));

        if (questions.length < 1) {
          contentDiv.innerHTML = '<p>No questions found for this section.</p>';
          return;
        }

        showQuiz();
      } catch (error) {
        console.error('Error loading sheet:', error);
        contentDiv.innerHTML = '<p>Failed to load questions.</p>';
      }
    }

    function showQuiz() {
      const timeLimit = (section <= 5 || isRetry) ? 60 : 90;
      let timer = timeLimit;

      contentDiv.innerHTML = `
        <h2>Section ${String.fromCharCode(64 + section)} Quiz</h2>
        <form id="quiz-form">
          ${questions.map((q, i) => `
            <div>
              <p><strong>Q${i + 1}:</strong> ${escapeHtml(q.question)}</p>
              <input type="text" name="q${i}" placeholder="Your answer" required />
            </div>
          `).join('')}
          <p>Time left: <span id="timer">${timer}</span> seconds</p>
          <button type="submit">Submit Answers</button>
          <div id="result"></div>
        </form>
      `;

      const timerEl = document.getElementById('timer');
      const countdown = setInterval(() => {
        timer--;
        timerEl.innerText = timer;
        if (timer <= 0) {
          clearInterval(countdown);
          document.getElementById('result').innerText = 'Time is up!';
          handleIncorrect();
        }
      }, 1000);

      document.getElementById('quiz-form').addEventListener('submit', e => {
        e.preventDefault();
        clearInterval(countdown);

        const formData = new FormData(e.target);
        let correct = true;
        for (let i = 0; i < questions.length; i++) {
          const userAnswer = (formData.get(`q${i}`) || '').trim().toLowerCase();
          const correctAnswer = (questions[i].answer || '').toLowerCase();
          if (userAnswer !== correctAnswer) {
            correct = false;
            break;
          }
        }

        const result = document.getElementById('result');
        if (correct) {
          result.innerText = 'All answers correct! Moving to next section.';
          isRetry = false;
          section += 1;
          localStorage.setItem('quizSection', section);
          localStorage.setItem('quizRetry', 'false');
          setTimeout(showSectionSelector, 2000);
        } else {
          result.innerText = 'Some answers were incorrect. Please retry.';
          handleIncorrect();
        }
      });
    }

    function handleIncorrect() {
      isRetry = true;
      localStorage.setItem('quizRetry', 'true');
      setTimeout(showPayment, 2000);
    }

    showSectionSelector();
  });
});

async function checkQuizVersion() {
  try {
    const metaURL = 'https://docs.google.com/spreadsheets/d/1xRdS5vJ-aUuG_7VcrYgk6StHCuLoOjU4zqG-0I1uHp8/gviz/tq?sheet=Meta&tqx=out:json';
    const res = await fetch(metaURL);
    const text = await res.text();
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const versionCell = json.table.rows[0].c[1]?.v;

    const storedVersion = localStorage.getItem('quizVersion');

    if (versionCell && storedVersion !== versionCell) {
      localStorage.setItem('quizSection', '1');
      localStorage.setItem('quizRetry', 'false');
      localStorage.setItem('quizVersion', versionCell);
    }
  } catch (err) {
    console.error('Failed to check quiz version:', err);
  }
}

const slideshowVideos = [
  { url: "https://www.w3schools.com/html/mov_bbb.mp4", caption: "Play smart, win smart!" },
  { url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm", caption: "Challenge your brain daily" },
  { url: "https://media.w3.org/2010/05/sintel/trailer.mp4", caption: "New quizzes every week" }
];

let currentVideo = 0;
const videoEl = document.getElementById('slideshow-video');
const captionEl = document.getElementById('video-caption');

function showVideo(index) {
  if (!videoEl || !captionEl) return;
  currentVideo = (index + slideshowVideos.length) % slideshowVideos.length;
  videoEl.pause();
  videoEl.src = slideshowVideos[currentVideo].url;
  captionEl.textContent = slideshowVideos[currentVideo].caption;
  videoEl.load();
  videoEl.muted = true;
  videoEl.play().catch(() => {});
}

function changeVideo(step) {
  showVideo(currentVideo + step);
}

setInterval(() => changeVideo(1), 5000);

document.addEventListener('DOMContentLoaded', () => showVideo(0));

function goToAdmin() {
  const password = prompt("Enter admin password:");
  if (password === "@perontips.") {
    localStorage.setItem("isAdmin", "true");
    window.location.href = "admin.html";
  } else {
    alert("Access denied! Wrong password.");
  }
}

// small helper to avoid HTML injection
function escapeHtml(s){
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
         }
