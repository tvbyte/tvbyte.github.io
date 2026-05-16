(function () {
  const allowedDomain = "";
  const currentDomain = window.location.hostname;

  if (currentDomain !== allowedDomain) {

    document.documentElement.innerHTML = "https://tvbyte.github.io/";

    const style = document.createElement("style");
    style.innerHTML = `
      body {
        margin: 0;
        padding: 0;
        height: 100vh;
        background: #0b0b0f;
        font-family: Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .box {
        text-align: center;
        max-width: 520px;
        padding: 30px;
      }

      .warning {
        font-size: 28px;
        font-weight: 900;
        color: #ff3b3b;
        letter-spacing: 2px;
        margin-bottom: 12px;
      }

      .text {
        font-size: 15px;
        color: #cfcfcf;
        line-height: 1.7;
        margin-bottom: 25px;
      }

      .timer {
        font-size: 52px;
        font-weight: bold;
        color: #8b6cff;
      }

      .sub {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
      }

      /* Improved Progress Bar */
      .bar {
        width: 100%;
        height: 8px;
        background: #1a1a1f;
        margin-top: 25px;
        border-radius: 50px;
        overflow: hidden;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.6);
      }

      .bar-fill {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, #8b6cff, #b9a5ff);
        border-radius: 50px;
        transition: width 1s linear;
        box-shadow: 0 0 12px rgba(139,108,255,0.8);
      }
    `;

    const box = document.createElement("div");
    box.className = "box";
    box.innerHTML = `
      <div class="warning">WARNING !</div>
      <div class="text">
        Access is restricted to official server only.<br>
        Contact me without stealing, I will give you a better quality script!
      </div>

      <div class="timer" id="timer">8</div>
      <div class="sub">Contact : nurmd2006.official@gmail.com</div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>
    `;

    document.head.appendChild(style);
    document.body.appendChild(box);

    let time = 8;
    const timerEl = document.getElementById("timer");
    const bar = document.getElementById("bar");

    const interval = setInterval(() => {
      time--;
      timerEl.innerText = time;

      bar.style.width = (time / 8) * 100 + "%";

      if (time <= 0) {
        clearInterval(interval);

        
        window.location.href = "https://tvbyte.github.io/";
      }
    }, 1000);

    throw new Error("Blocked: Unauthorized domain");
  }
})();
