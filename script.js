// script.js — minimal edit: backend host changed to perontips-fliers-backend.onrender.com
document.addEventListener('DOMContentLoaded', () => {
  checkQuizVersion().then(() => {
    let section = parseInt(localStorage.getItem('quizSection')) || 1;
    let isRetry = localStorage.getItem('quizRetry') === 'true';
    let phone = localStorage.getItem('quizPhone') || '';
    const contentDiv = document.getElementById('content');
    let questions = [];

    // NEW: backend base URL (Render)
    const BACKEND_BASE = 'https://perontips-fliers-backend.onrender.com';

    function showSectionSelector() {
      contentDiv.innerHTML = `
        <h2>Select Quiz Section</h2>
        <select id="section-select">
          ${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === section ? 'selected' : ''}>Section ${String.fromCharCode(65 + i)}</option>`).join('')}
        </select>
        <button id="select-btn">Continue</button>
      `;
      document.getElementById('select-btn').addEventListener('click', () => {
        section = parseInt(document.getElementById('section-select').value);
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

      const payload = { phone: phone, amount: isRetry ? 20 : (section <= 5 ? 5 : 10) };

      try {
        // POST to the Render backend's /pay (unchanged logic)
        const res = await fetch(`${BACKEND_BASE}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.ResponseCode === '0' || data.ResponseCode === 0) {
          document.getElementById('payment-status').innerText = 'STK Push sent. Enter your M-PESA PIN.';
          const interval = setInterval(async () => {
            const statusRes = await fetch(`${BACKEND_BASE}/status?phone=${phone}`);
            const statusData = await statusRes.json();
            if (statusData.status && statusData.status !== 'Pending') {
              clearInterval(interval);
              if (statusData.status === 'Success') {
                window.location.href = 'quiz.html';
              } else {
                document.getElementById('payment-status').innerText = 'Payment failed: ' + statusData.status;
                isRetry = true;
                localStorage.setItem('quizRetry', 'true');
                setTimeout(showPayment, 2000);
              }
            }
          }, 3000);
        } else {
          document.getElementById('payment-status').innerText = 'Payment request failed.';
        }
      } catch (err) {
        console.error(err);
        document.getElementById('payment-status').innerText = 'Error initiating payment.';
      }
    }

    async function loadQuestionsFromSheet() {
      const field = localStorage.getItem('quizField') || 'default';
      const section = parseInt(localStorage.getItem('quizSection')) || 1;
      const sheetURL = window.SHEET_CONFIG.sheets[field] || window.SHEET_CONFIG.default;

      try {
        const res = await fetch(sheetURL);
        const text = await res.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;

        const startIndex = (section - 1) * 10;
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
              <p><strong>Q${i + 1}:</strong> ${q.question}</p>
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
          const userAnswer = formData.get(`q${i}`).trim().toLowerCase();
          const correctAnswer = questions[i].answer.toLowerCase();
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
