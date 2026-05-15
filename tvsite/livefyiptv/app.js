
    const JSON_URL = 'https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/main/Channels_data.json'; 
    
    const video = document.getElementById('video-player');
    const playerLoader = document.getElementById('playerLoader');
    const playerPoster = document.getElementById('player-poster');
    const errorDisplay = document.getElementById('error-display');
    const controls = document.getElementById('controls');
    const watermark = document.getElementById('watermark');
    
    let hls = new Hls();
    let allChannels =[];
    let loadTimeout;

    function startLoading() {
        playerLoader.style.display = 'block';
        errorDisplay.style.display = 'none';
        controls.classList.remove('hide-elements');
        watermark.classList.remove('hide-elements');
        
        clearTimeout(loadTimeout);
        loadTimeout = setTimeout(() => {
            if (video.paused || video.readyState < 3) {
                playerLoader.style.display = 'none';
                errorDisplay.style.display = 'flex';
                playerPoster.style.display = 'block';
                controls.classList.add('hide-elements');
                watermark.classList.add('hide-elements');
            }
        }, 8000); 
    }

    video.addEventListener('playing', () => {
        playerLoader.style.display = 'none';
        errorDisplay.style.display = 'none';
        playerPoster.style.display = 'none';
        controls.classList.remove('hide-elements');
        watermark.classList.remove('hide-elements');
        clearTimeout(loadTimeout);
    });

    video.addEventListener('waiting', startLoading);

    document.getElementById('playPauseBtn').onclick = () => video.paused ? video.play() : video.pause();
    video.addEventListener('play', () => document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>');
    video.addEventListener('pause', () => document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>');
    
    const volSlider = document.getElementById('volumeSlider');
    volSlider.oninput = (e) => { video.volume = e.target.value; video.muted = (e.target.value == 0); updateVolIcon(); };
    document.getElementById('muteBtn').onclick = () => { video.muted = !video.muted; volSlider.value = video.muted ? 0 : video.volume; updateVolIcon(); };
    function updateVolIcon() { document.getElementById('muteBtn').innerHTML = (video.muted || video.volume == 0) ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>'; }
    
    document.getElementById('fullScreenBtn').onclick = () => {
        if (!document.fullscreenElement) { document.getElementById('playerContainer').requestFullscreen(); } 
        else { document.exitFullscreen(); }
    };
    
    document.getElementById('qualityBtn').onclick = (e) => { e.stopPropagation(); document.getElementById('qualityMenu').classList.toggle('active'); };
    document.addEventListener('click', () => document.getElementById('qualityMenu').classList.remove('active'));

    async function init() {
        try {
            const response = await fetch(JSON_URL);
            const data = await response.json();
            
            const channelList = data.channels ||[];
            
            allChannels = channelList.map(ch => {
                let channelName = ch.name || "Unknown TV";
                let nameLower = channelName.toLowerCase();
                let cat = 'others';
                
                if (nameLower.match(/sports|cricket|bein|ten|ipl|sport/)) cat = 'sports';
                else if (nameLower.match(/somoy|desh|boishakhi|ekushey|gtv|btv|jumuna|ekattor|ntv|dipto|channel i|channel 24|independent|news 24|sa tv|tv|g-tv/)) cat = 'bangla';
                else if (nameLower.match(/kolkata|r plus|jalsha/)) cat = 'kolkata';
                else if (nameLower.match(/hindi|india|ndtv|zee|star|bollywood|b4u/)) cat = 'india';

                return {
                    name: channelName,
                    logo: "https://i.ibb.co.com/604f9xmX/file-000000005814720bbb4c1485d0863b3a.png", 
                    group: cat,
                    url: ch.url || ""
                };
            });

            document.getElementById('totalChannelCount').innerText = allChannels.length;

            document.getElementById('preloader').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            document.getElementById('customFooter').style.display = 'block';
            
            loadChannels('bangla'); 
        } catch (e) { 
            console.error("Error loading JSON playlist", e); 
            document.getElementById('preloader').innerHTML = "<h3 style='color:red'>Failed to load channels</h3>";
        }
    }

    function loadChannels(cat) {
        const grid = document.getElementById('channelGrid');
        grid.innerHTML = '';
        const filtered = allChannels.filter(c => cat === 'others' ? !['sports', 'bangla', 'kolkata', 'india'].includes(c.group) : c.group === cat);
        
        filtered.forEach(ch => {
            const div = document.createElement('div');
            div.className = 'channel-item';
            div.title = ch.name;
            div.innerHTML = `
                <img src="${ch.logo}" alt="TV Logo">
                <div class="channel-title">${ch.name}</div>
            `;
            div.onclick = () => {
                playerPoster.style.display = 'block'; 
                playStream(ch.url);
            };
            grid.appendChild(div);
        });
    }

    function playStream(url) {
        startLoading(); 
        if (Hls.isSupported()) {
            hls.destroy(); hls = new Hls();
            hls.loadSource(url); hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); updateQualMenu(); });
            hls.on(Hls.Events.ERROR, (event, data) => { if(data.fatal) { errorDisplay.style.display = 'flex'; playerPoster.style.display = 'block'; controls.classList.add('hide-elements'); watermark.classList.add('hide-elements'); } });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => { video.play(); });
        }
    }

    function updateQualMenu() {
        const qMenu = document.getElementById('qualityMenu');
        qMenu.innerHTML = '<div class="quality-option" onclick="hls.currentLevel=-1">Auto</div>';
        hls.levels.forEach((level, index) => {
            const opt = document.createElement('div');
            opt.className = 'quality-option';
            opt.innerText = level.height + 'p';
            opt.onclick = () => { hls.currentLevel = index; qMenu.classList.remove('active'); };
            qMenu.appendChild(opt);
        });
    }

    document.getElementById('categoryList').onclick = (e) => {
        if (e.target.tagName === 'LI') {
            document.querySelectorAll('#categoryList li').forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');
            loadChannels(e.target.dataset.category);
        }
    };
    init();
