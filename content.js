(function () {
	// Configuration
	const AUTO_HIDE_DELAY = 2000; // 2 seconds delay before hiding controls
	let hideTimeout = null;
	let mouseIdleInterval = null;
	let controlsManuallyHidden = false;

	// Initialize the extension
	function init() {
		checkForYouTubePlayer();
	}

	// Check if YouTube player exists and set up observers
	function checkForYouTubePlayer() {
		const player = document.querySelector(".html5-video-player");
		if (player) {
			console.log("YouTube Controls Auto-Hider: Initialized");
			setupEventListeners(player);
		} else {
			setTimeout(checkForYouTubePlayer, 500);
		}
	}

	// Toggle controls manually with keyboard shortcut
	function toggleControlsManually(player) {
		const controlsHidden = player.classList.toggle("ytp-autohide");
		controlsManuallyHidden = controlsHidden;
		clearTimeout(hideTimeout);
		stopMouseIdleTimer();
		showToast(
			`Controls ${controlsHidden ? "hidden" : "shown"} (Cmd+M/Ctrl+M to toggle)`
		);
	}

	// Show a toast notification
	function showToast(message) {
		const existingToast = document.querySelector(".yt-controls-toast");
		if (existingToast) existingToast.remove();

		const toast = document.createElement("div");
		toast.className = "yt-controls-toast";
		toast.textContent = message;
		document.body.appendChild(toast);

		setTimeout(() => {
			toast.classList.add("yt-controls-toast-fadeout");
			setTimeout(() => toast.remove(), 500);
		}, 2000);
	}

	// Setup all event listeners
	function setupEventListeners(player) {
		const video = player.querySelector("video");
		if (!video) return;

		// Track mouse activity
		player.addEventListener(
			"mouseenter",
			() => !controlsManuallyHidden && showControls(player)
		);
		player.addEventListener(
			"mouseleave",
			() =>
				!controlsManuallyHidden && video.paused && scheduleHideControls(player)
		);

		// Play/Pause events
		video.addEventListener("play", () => {
			clearTimeout(hideTimeout);
			stopMouseIdleTimer();
		});

		video.addEventListener("pause", () => {
			if (!controlsManuallyHidden)
				isFullscreen(player)
					? startMouseIdleTimer(player)
					: scheduleHideControls(player);
		});

		// Keyboard shortcut (Cmd+M / Ctrl+M)
		document.addEventListener("keydown", (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "m") {
				e.preventDefault();
				toggleControlsManually(player);
			}
		});

		// Mouse movement detection
		document.addEventListener("mousemove", () => {
			if (!controlsManuallyHidden && video.paused) {
				showControls(player);
				stopMouseIdleTimer();
				if (!isFullscreen(player)) scheduleHideControls(player);
			}
		});

		// Fullscreen tracking
		document.addEventListener("fullscreenchange", () => {
			stopMouseIdleTimer();
			if (!controlsManuallyHidden && video.paused)
				isFullscreen(player)
					? startMouseIdleTimer(player)
					: scheduleHideControls(player);
		});

		// Handle YouTube’s fullscreen button
		const fullscreenBtn = player.querySelector(".ytp-fullscreen-button");
		if (fullscreenBtn) {
			fullscreenBtn.addEventListener("click", () =>
				setTimeout(() => {
					if (!controlsManuallyHidden && video.paused)
						isFullscreen(player)
							? startMouseIdleTimer(player)
							: scheduleHideControls(player);
				}, 100)
			);
		}

		// Listen for URL changes (YouTube SPA Navigation)
		setupUrlChangeListener();
	}

	// Fullscreen check
	function isFullscreen(player) {
		return player.classList.contains("ytp-fullscreen");
	}

	// Start mouse idle timer for fullscreen mode
	function startMouseIdleTimer(player) {
		stopMouseIdleTimer();
		mouseIdleInterval = setTimeout(() => hideControls(player), AUTO_HIDE_DELAY);
	}

	// Stop mouse idle timer
	function stopMouseIdleTimer() {
		clearTimeout(mouseIdleInterval);
		mouseIdleInterval = null;
	}

	// Schedule hiding of controls
	function scheduleHideControls(player) {
		clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => hideControls(player), AUTO_HIDE_DELAY);
	}

	// Show the controls
	function showControls(player) {
		clearTimeout(hideTimeout);
		player.classList.remove("ytp-autohide");
	}

	// Hide the controls
	function hideControls(player) {
		player.classList.add("ytp-autohide");
	}

	// Setup listener for URL changes (for YouTube SPA navigation)
	function setupUrlChangeListener() {
		let lastUrl = location.href;
		const observer = new MutationObserver(() => {
			if (lastUrl !== location.href) {
				lastUrl = location.href;
				stopMouseIdleTimer();
				clearTimeout(hideTimeout);
				controlsManuallyHidden = false;
				setTimeout(init, 1000);
			}
		});
		observer.observe(document, { subtree: true, childList: true });
	}

	// Start the extension
	init();
})();
