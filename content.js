(() => {
  const BUTTONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const BAR_ID = "yt-speed-buttons-extension";
  const VOLUME_BAR_ID = "yt-volume-buttons-extension";
  const VOLUME_STEP = 0.05;
  const SETTINGS_KEY = "yt-speed-buttons-session-settings";
  const initializedVideos = new WeakSet();
  let isLoadingNewVideo = false;

  const getVideo = () => document.querySelector("video.html5-main-video");

  function getSavedSettings() {
    try {
      const settings = JSON.parse(sessionStorage.getItem(SETTINGS_KEY) || "{}");
      return {
        playbackRate: typeof settings.playbackRate === "number" ? settings.playbackRate : null,
      };
    } catch {
      return { playbackRate: null };
    }
  }

  let savedSettings = getSavedSettings();

  function saveSettings(video) {
    savedSettings = {
      playbackRate: video.playbackRate,
    };

    try {
      sessionStorage.setItem(SETTINGS_KEY, JSON.stringify(savedSettings));
    } catch {
      // Browser privacy settings can disable session storage.
    }
  }

  function applySavedSettings(video = getVideo(), force = false) {
    if (!video || (!force && initializedVideos.has(video))) return;

    initializedVideos.add(video);
    if (savedSettings.playbackRate !== null && savedSettings.playbackRate > 0) {
      video.playbackRate = savedSettings.playbackRate;
    }
  }

  function formatSpeed(speed) {
    return `${Number(speed.toFixed(2))}×`;
  }

  function setSpeed(speed) {
    const video = getVideo();
    if (!video) return;

    video.playbackRate = speed;
    updateActiveButton();
  }

  function changeVolume(amount) {
    const video = getVideo();
    if (!video) return;

    const volume = Math.min(1, Math.max(0, video.volume + amount));
    video.volume = volume;
    if (volume > 0) video.muted = false;
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

  function enableDragging(bar, player, handle) {
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;

      const barBounds = bar.getBoundingClientRect();
      dragOffsetX = event.clientX - barBounds.left;
      dragOffsetY = event.clientY - barBounds.top;
      handle.setPointerCapture(event.pointerId);
      bar.classList.add("yt-speed-dragging");
      event.preventDefault();
      event.stopPropagation();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!handle.hasPointerCapture(event.pointerId)) return;

      const playerBounds = player.getBoundingClientRect();
      const barBounds = bar.getBoundingClientRect();
      const left = Math.min(
        Math.max(0, event.clientX - playerBounds.left - dragOffsetX),
        playerBounds.width - barBounds.width,
      );
      const top = Math.min(
        Math.max(0, event.clientY - playerBounds.top - dragOffsetY),
        playerBounds.height - barBounds.height,
      );

      bar.style.left = `${left}px`;
      bar.style.top = `${top}px`;
      bar.style.right = "auto";
      bar.style.bottom = "auto";
    });

    const stopDragging = (event) => {
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      bar.classList.remove("yt-speed-dragging");
    };

    handle.addEventListener("pointerup", stopDragging);
    handle.addEventListener("pointercancel", stopDragging);
  }

  function createBar() {
    if (document.getElementById(BAR_ID)) return;

    const player = document.querySelector("#movie_player");
    if (!player) return;

    const bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "影片播放速度");

    const dragHandle = document.createElement("span");
    dragHandle.className = "yt-speed-drag-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = "拖曳以移動倍速按鈕";
    dragHandle.setAttribute("aria-label", "拖曳以移動倍速按鈕");
    bar.append(dragHandle);

    BUTTONS.forEach((speed) => bar.append(createButton(
      formatSpeed(speed),
      `設定速度為 ${formatSpeed(speed)}`,
      () => setSpeed(speed),
      speed,
    )));

    const current = document.createElement("span");
    current.className = "yt-speed-current";
    current.title = "目前播放速度";
    bar.append(current);
    player.append(bar);
    enableDragging(bar, player, dragHandle);
    updateActiveButton();
  }

  function createVolumeBar() {
    if (document.getElementById(VOLUME_BAR_ID)) return;

    const player = document.querySelector("#movie_player");
    if (!player) return;

    const bar = document.createElement("div");
    bar.id = VOLUME_BAR_ID;
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "影片音量");

    const dragHandle = document.createElement("span");
    dragHandle.className = "yt-speed-drag-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = "拖曳以移動音量按鈕";
    dragHandle.setAttribute("aria-label", "拖曳以移動音量按鈕");
    bar.append(dragHandle);

    bar.append(createButton("音−", "音量減少 5%", () => changeVolume(-VOLUME_STEP)));
    bar.append(createButton("音+", "音量增加 5%", () => changeVolume(VOLUME_STEP)));
    player.append(bar);
    enableDragging(bar, player, dragHandle);
  }

  function sync() {
    createBar();
    createVolumeBar();
    applySavedSettings();
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

  document.addEventListener("ratechange", (event) => {
    const video = getVideo();
    if (event.target !== video) return;
    applySavedSettings();
    if (!isLoadingNewVideo) saveSettings(video);
    updateActiveButton();
  }, true);

  document.addEventListener("yt-navigate-start", () => {
    isLoadingNewVideo = true;
  });

  document.addEventListener("loadstart", (event) => {
    if (event.target === getVideo()) isLoadingNewVideo = true;
  }, true);

  document.addEventListener("loadedmetadata", (event) => {
    const video = getVideo();
    if (event.target !== video) return;
    applySavedSettings(video, true);
    isLoadingNewVideo = false;
    updateActiveButton();
  }, true);

  document.addEventListener("yt-navigate-finish", () => initializePlayer());
  document.addEventListener("yt-page-data-updated", () => scheduleSync(250));
  initializePlayer();
})();
