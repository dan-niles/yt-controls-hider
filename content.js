(function () {
	// Configuration
	const AUTO_HIDE_DELAY = 2000; // 2 seconds delay before hiding controls
	let hideTimeout = null;
	let isMouseOverPlayer = false;
	let isFullscreen = false;
	let mouseIdleTime = 0;
	let mouseIdleInterval = null;
	let controlsManuallyHidden = false; // Track manual control state

	// Main function to initialize the extension
	function init() {
		// Wait for the YouTube player to be fully loaded
		checkForYouTubePlayer();
	}

	// Function to check if YouTube player exists and set up observers
	function checkForYouTubePlayer() {
		const videoPlayer = document.querySelector(".html5-video-player");

		if (videoPlayer) {
			console.log("YouTube Controls Auto-Hider: Player found, initializing...");
			setupEventListeners(videoPlayer);
			setupKeyboardShortcuts(videoPlayer);
		} else {
			// If player isn't found, try again in 500ms
			setTimeout(checkForYouTubePlayer, 500);
		}
	}

	// Check if player is in fullscreen mode
	function checkFullscreenStatus(player) {
		isFullscreen = player.classList.contains("ytp-fullscreen");
		return isFullscreen;
	}

	// Set up keyboard shortcuts
	function setupKeyboardShortcuts(player) {
		document.addEventListener("keydown", (e) => {
			// Check for Cmd+M (Mac) or Ctrl+M (Windows/Linux)
			if ((e.metaKey || e.ctrlKey) && e.key === "m") {
				e.preventDefault(); // Prevent default browser behavior

				toggleControlsManually(player);
			}

			// Handle ESC key for exiting fullscreen
			if (e.key === "Escape" && isFullscreen) {
				setTimeout(() => {
					checkFullscreenStatus(player);
					stopMouseIdleTimer();

					if (
						!controlsManuallyHidden &&
						player.querySelector("video").paused &&
						!isFullscreen &&
						!isMouseOverPlayer
					) {
						scheduleHideControls(player);
					}
				}, 100);
			}
		});
	}

	// Toggle controls manually with keyboard shortcut
	function toggleControlsManually(player) {
		const video = player.querySelector("video");

		// If controls are currently showing, hide them and set flag
		if (!player.classList.contains("ytp-autohide")) {
			hideControls(player);
			controlsManuallyHidden = true;

			// Also clear any auto-hide timers
			clearTimeout(hideTimeout);
			stopMouseIdleTimer();

			// Show feedback to user
			showToast("Controls hidden (Cmd+M/Ctrl+M to toggle)");
		}
		// If controls are currently hidden, show them and clear flag
		else {
			showControls(player);
			controlsManuallyHidden = false;

			// Resume auto-hide behavior if video is paused and mouse not over player
			if (video.paused && !isMouseOverPlayer) {
				if (isFullscreen) {
					startMouseIdleTimer(player);
				} else {
					scheduleHideControls(player);
				}
			}

			// Show feedback to user
			showToast("Controls shown (Cmd+M/Ctrl+M to toggle)");
		}
	}

	// Show a toast notification to the user
	function showToast(message) {
		// Remove any existing toast
		const existingToast = document.querySelector(".yt-controls-toast");
		if (existingToast) {
			existingToast.remove();
		}

		// Create toast element
		const toast = document.createElement("div");
		toast.className = "yt-controls-toast";
		toast.textContent = message;

		// Add to player
		document.body.appendChild(toast);

		// Auto-remove after 2 seconds
		setTimeout(() => {
			toast.classList.add("yt-controls-toast-fadeout");
			setTimeout(() => {
				if (toast.parentNode) {
					toast.parentNode.removeChild(toast);
				}
			}, 500); // Remove after fade out animation
		}, 2000);
	}

	// Set up all necessary event listeners
	function setupEventListeners(player) {
		const video = player.querySelector("video");
		if (!video) return;

		// Track when mouse enters/leaves the player
		player.addEventListener("mouseenter", () => {
			isMouseOverPlayer = true;

			// Only show controls if they're not manually hidden
			if (!controlsManuallyHidden) {
				showControls(player);
				resetMouseIdleTimer();
			}
		});

		player.addEventListener("mouseleave", () => {
			isMouseOverPlayer = false;

			// Only schedule hiding if not manually hidden and video is paused
			if (!controlsManuallyHidden && video.paused) {
				scheduleHideControls(player);
			}
		});

		// Handle play/pause state changes
		video.addEventListener("play", () => {
			// Let YouTube handle this case, but reset our manual state
			controlsManuallyHidden = false;
			clearTimeout(hideTimeout);
			stopMouseIdleTimer();
		});

		video.addEventListener("pause", () => {
			// Only handle auto-hiding if not manually controlled
			if (!controlsManuallyHidden) {
				if (checkFullscreenStatus(player)) {
					// In fullscreen, we use mouse idle detection
					startMouseIdleTimer(player);
				} else if (!isMouseOverPlayer) {
					scheduleHideControls(player);
				}
			}
		});

		// For when the page loads with a paused video
		if (video.paused && !controlsManuallyHidden) {
			if (checkFullscreenStatus(player)) {
				startMouseIdleTimer(player);
			} else {
				scheduleHideControls(player);
			}
		}

		// Add movement detection for showing controls
		document.addEventListener("mousemove", () => {
			// Only respond to mouse movement if not manually hidden
			if (!controlsManuallyHidden && video.paused) {
				showControls(player);
				resetMouseIdleTimer();

				if (checkFullscreenStatus(player)) {
					// In fullscreen, reset idle timer on mouse movement
					resetMouseIdleTimer();
				} else if (!isMouseOverPlayer) {
					scheduleHideControls(player);
				}
			}
		});

		// Listen for fullscreen changes
		document.addEventListener("fullscreenchange", () => {
			checkFullscreenStatus(player);

			if (video.paused && !controlsManuallyHidden) {
				if (isFullscreen) {
					stopMouseIdleTimer();
					startMouseIdleTimer(player);
				} else {
					stopMouseIdleTimer();
					if (!isMouseOverPlayer) {
						scheduleHideControls(player);
					}
				}
			}
		});

		// Also handle YouTube's own fullscreen mechanism
		const fullscreenButton = player.querySelector(".ytp-fullscreen-button");
		if (fullscreenButton) {
			fullscreenButton.addEventListener("click", () => {
				// Give time for fullscreen to engage
				setTimeout(() => {
					checkFullscreenStatus(player);

					if (video.paused && !controlsManuallyHidden) {
						if (isFullscreen) {
							stopMouseIdleTimer();
							startMouseIdleTimer(player);
						} else {
							stopMouseIdleTimer();
							if (!isMouseOverPlayer) {
								scheduleHideControls(player);
							}
						}
					}
				}, 100);
			});
		}

		// Handle navigation and URL changes
		setupUrlChangeListener();
	}

	// Start mouse idle timer for fullscreen mode
	function startMouseIdleTimer(player) {
		stopMouseIdleTimer();
		mouseIdleTime = 0;

		mouseIdleInterval = setInterval(() => {
			mouseIdleTime += 100;
			if (mouseIdleTime >= AUTO_HIDE_DELAY) {
				hideControls(player);
				stopMouseIdleTimer();
			}
		}, 100);
	}

	// Reset mouse idle timer
	function resetMouseIdleTimer() {
		mouseIdleTime = 0;
	}

	// Stop mouse idle timer
	function stopMouseIdleTimer() {
		if (mouseIdleInterval) {
			clearInterval(mouseIdleInterval);
			mouseIdleInterval = null;
		}
	}

	// Schedule hiding of controls
	function scheduleHideControls(player) {
		clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			hideControls(player);
		}, AUTO_HIDE_DELAY);
	}

	// Show the controls
	function showControls(player) {
		clearTimeout(hideTimeout);
		player.classList.remove("ytp-autohide");
		player.classList.add("ytp-autohide-active");
	}

	// Hide the controls
	function hideControls(player) {
		player.classList.add("ytp-autohide");
		player.classList.remove("ytp-autohide-active");
	}

	// Setup listener for URL changes (for YouTube SPA navigation)
	function setupUrlChangeListener() {
		let lastUrl = location.href;

		// Create an observer to watch for URL changes
		const observer = new MutationObserver(() => {
			if (lastUrl !== location.href) {
				lastUrl = location.href;
				// When URL changes, reinitialize the extension
				stopMouseIdleTimer();
				clearTimeout(hideTimeout);
				// Reset manual state when navigating to new video
				controlsManuallyHidden = false;
				setTimeout(init, 1000);
			}
		});

		observer.observe(document, { subtree: true, childList: true });
	}

	// Start the extension
	init();
})();
