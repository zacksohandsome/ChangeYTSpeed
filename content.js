(() => {
  const BUTTONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const BAR_ID = "yt-speed-buttons-extension";
  const SPEED_STEP = 0.25;
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4;

  const getVideo = () => document.querySelector("video.html5-main-video");

  function formatSpeed(speed) {
    return `${Number(speed.toFixed(2))}×`;
  }

  function setSpeed(speed) {
    const video = getVideo();
    if (!video) return;

    video.playbackRate = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
    updateActiveButton();
  }

  function updateActiveButton() {
    const video = getVideo();
    const bar = document.getElementById(BAR_ID);
    if (!video || !bar) return;

    bar.querySelectorAll("button[data-speed]").forEach((button) => {
      const speed = Number(button.dataset.speed);
      const active = Math.abs(video.playbackRate - speed) < 0.01;
      button.classList.toggle("yt-speed-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const label = bar.querySelector(".yt-speed-current");
    if (label) label.textContent = formatSpeed(video.playbackRate);
  }

  function createButton(label, title, onClick, speed) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = title;
    if (speed !== undefined) button.dataset.speed = String(speed);
    button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function createBar() {
    if (document.getElementById(BAR_ID)) return;

    const player = document.querySelector("#movie_player");
    if (!player) return;

    const bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "影片播放速度");

    const decrease = createButton("−", "速度減少 0.25 倍", () => {
      const video = getVideo();
      if (video) setSpeed(video.playbackRate - SPEED_STEP);
    });
    bar.append(decrease);

    BUTTONS.forEach((speed) => bar.append(createButton(
      formatSpeed(speed),
      `設定速度為 ${formatSpeed(speed)}`,
      () => setSpeed(speed),
      speed,
    )));

    const increase = createButton("+", "速度增加 0.25 倍", () => {
      const video = getVideo();
      if (video) setSpeed(video.playbackRate + SPEED_STEP);
    });
    bar.append(increase);

    const current = document.createElement("span");
    current.className = "yt-speed-current";
    current.title = "目前播放速度";
    bar.append(current);
    player.append(bar);
    updateActiveButton();
  }

  function sync() {
    createBar();
    updateActiveButton();
  }

  let syncTimer;
  function scheduleSync(delay = 0) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay);
  }

  function initializePlayer(attempt = 0) {
    sync();
    if (!document.getElementById(BAR_ID) && attempt < 20) {
      setTimeout(() => initializePlayer(attempt + 1), 250);
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;

    if (event.key === "[") {
      event.preventDefault();
      const video = getVideo();
      if (video) setSpeed(video.playbackRate - SPEED_STEP);
    }
    if (event.key === "]") {
      event.preventDefault();
      const video = getVideo();
      if (video) setSpeed(video.playbackRate + SPEED_STEP);
    }
  });

  document.addEventListener("ratechange", updateActiveButton, true);
  document.addEventListener("yt-navigate-finish", () => initializePlayer());
  document.addEventListener("yt-page-data-updated", () => scheduleSync(250));
  initializePlayer();
})();
