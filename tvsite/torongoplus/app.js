// State Variables
let channels = [];
let currentIndex = -1;
let hlsInstance = null;
let hideControlsTimeout = null;
let isCompactMode = false;
let autoHideTimeout = null;
let currentCategory = 'All';
let categories = [];
let favorites = new Set();

// DOM Elements
const videoPlayer = document.getElementById('videoPlayer');
const playerWrapper = document.getElementById('playerWrapper');
const loadingCorner = document.getElementById('loadingCorner');
const channelsGrid = document.getElementById('channelsGrid');
const playPauseIcon = document.getElementById('playPauseIcon');
const muteIcon = document.getElementById('muteIcon');
const liveBtn = document.getElementById('liveBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResultsGrid');
// ... (many more UI elements are cached)

// Simple Caesar Cipher decoder used to decrypt channel URLs
function decodeString(str, offset = 1) {
    if (!str) return '';
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) - offset);
    }
    return result;
}

async function loadChannels() {
    renderSkeletonLoading(); // Show loading animation
    let parsedChannels = [];

    try {
        // Fetch channel data from external API
        const response = await fetch(`https://database.official.work/bd.json?nocache=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            if (data.channels && Array.isArray(data.channels)) {
                parsedChannels = data.channels.map(ch => {
                    let url = ch.url || '';
                    // Decrypt URL based on provided encryption type
                    if (ch.url_enc) url = decodeString(ch.url_enc, 1); 
                    else if (ch.secure_url) url = decodeString(ch.secure_url, -1);

                    return {
                        name: ch.name || 'Unknown',
                        logo: ch.logo || 'img.png',
                        url: url + '?retry=1',
                        category: ch.category || 'Uncategorized'
                    };
                });
            }
        }
    } catch (error) {}

    // Fallback channel if fetch fails
    if (!parsedChannels.length) {
        channels = [{ name: 'No Signal', logo: 'img.png', url: 'tv.mp4', category: 'Uncategorized' }];
    } else {
        channels = parsedChannels;
    }

    buildCategories();
    renderCategories();
    renderChannels();

    if (channels.length) {
        playChannel(0, true); // Auto-play first channel
        if (isCompactMode) renderCompactChannels();
    }
}

function playChannel(index, autoplay = true) {
    if (!channels[index]) return;
    const channel = channels[index];

    // Destroy previous HLS instance if it exists
    if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
    
    hideLoading();
    videoPlayer.removeAttribute('poster');
    videoPlayer.load();

    const streamUrl = channel.url;
    const isHls = streamUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
        hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsInstance.attachMedia(videoPlayer);
        hlsInstance.loadSource(streamUrl);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (autoplay) videoPlayer.play().catch(() => {});
            showControlsOverlay();
        });

        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hlsInstance.startLoad(); // Try to recover network errors
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hlsInstance.recoverMediaError(); // Try to recover media errors
                } else {
                    nextChannel(); // Skip to next channel if unrecoverable
                }
            }
            setTimeout(() => showControlsOverlay(), 3000);
        });
    } else {
        // Native video playback for non-HLS
        videoPlayer.src = streamUrl;
        if (autoplay) videoPlayer.play().catch(() => {});
        videoPlayer.addEventListener('canplay', function onCanPlay() {
            showControlsOverlay();
            videoPlayer.removeEventListener('canplay', onCanPlay);
        });
    }

    updateActiveChannelUI();
    currentIndex = index;

    // Show Ads
    if (window.TorongoAds) TorongoAds.show();
}

// Play/Pause
function togglePlayPause() {
    if (videoPlayer.paused) videoPlayer.play();
    else videoPlayer.pause();
    updatePlayPauseIcon();
}

// Volume & Mute
videoPlayer.addEventListener('wheel', (e) => {
    e.preventDefault();
    let delta = e.deltaY > 0 ? -0.05 : 0.05;
    videoPlayer.volume = Math.max(0, Math.min(1, videoPlayer.volume + delta));
    updateVolumeIcon();
}, { passive: false });

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (document.activeElement === searchInput) return; // Don't capture keys while searching

    switch (e.key) {
        case 'ArrowRight': nextChannel(); break;
        case 'ArrowLeft': prevChannel(); break;
        case 'ArrowUp': 
            e.preventDefault(); 
            videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1); 
            break;
        case 'ArrowDown': 
            e.preventDefault(); 
            videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1); 
            break;
        case ' ': // Spacebar
        case 'Space': 
            togglePlayPause(); 
            break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'm': case 'M': toggleMute(); break;
        case 's': case 'S': openSearch(); break;
        case 'u': case 'U': toggleCompactMode(); break;
    }
});

const ORIGINAL_SITE = '';
const ALLOWED = [''];
const host = window.location.hostname;

const isAllowed = ALLOWED.some(domain => host === domain || host.endsWith('.' + domain));

if (!isAllowed) {
    document.documentElement.innerHTML = ''; // Wipes the entire DOM
    window.location.replace(ORIGINAL_SITE); // Forces redirect
}
