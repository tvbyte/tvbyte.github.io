
  const firebaseConfig = {
  apiKey: "AIzaSyB8Xut3Vp1K3_8LR_S79L1G5ckl7064qPM",
  authDomain: "project-e5096409-f066-48a1-954.firebaseapp.com",
  projectId: "project-e5096409-f066-48a1-954",
  storageBucket: "project-e5096409-f066-48a1-954.firebasestorage.app",
  messagingSenderId: "878934709000",
  appId: "1:878934709000:web:abb3eba0a27d3beb2352bd",
  measurementId: "G-RH8R014E5K"
};
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // Theme Switcher Logic
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const themeIcon = themeToggle.querySelector('i');

    if(localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        if(body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    });

    document.getElementById('copyright-year').innerText = new Date().getFullYear();
    document.getElementById('footer-year').innerText = new Date().getFullYear();

    let hls = null, masterMatches = [];
    let gitMatches =[];
    let firebaseMatches = {};
    const video = document.getElementById('video');

    function showAlert() {
        database.ref('settings').once('value', snap => {
            const data = snap.val();
            if (data && data.alertTitle) {
                document.getElementById('alert-title-container').innerText = data.alertTitle;
                document.getElementById('alert-message-container').innerText = data.alertMessage;
                document.getElementById('alert-modal').style.display = 'flex';
            } else { alert("No new alerts!"); }
        });
    }

    function closeAlert() { document.getElementById('alert-modal').style.display = 'none'; }

    function setWatermark(text) {
        const el = document.getElementById('livefy-text-animator');
        if(el) { el.innerText = text; el.style.display = 'block'; }
    }

    function removeWatermark() {
        const el = document.getElementById('livefy-text-animator');
        if(el) el.style.display = 'none';
    }

    function playStream(url, btn) {
        document.querySelectorAll('.server-button').forEach(b => b.classList.remove('active-server')); 
        if(btn) btn.classList.add('active-server');
        
        const urlLower = url.toLowerCase();
        
        // IFRAME FIX: Embed ba third party url ke direct video hisebe dhora jabe na
        const isDirectVideo = !urlLower.includes('embed') && !urlLower.includes('iframe') && !urlLower.includes('player') && (urlLower.includes('.m3u8') || urlLower.includes('.mp4') || urlLower.includes('.mkv'));
        
        const iframe = document.getElementById('iframe-player');
        
        // Reset Everything
        video.style.display = 'none';
        iframe.style.display = 'none';
        iframe.src = '';
        if(hls) { hls.destroy(); hls = null; }
        video.pause();
        video.removeAttribute('src');
        video.load();

        if (isDirectVideo) {
            video.style.display = 'block';
            setWatermark('LIVEFY TV');
            
            if (urlLower.includes('.mp4') || urlLower.includes('.mkv')) {
                video.src = url;
                video.play().catch(e => console.log(e));
            } else if(Hls.isSupported() && urlLower.includes('.m3u8')) { 
                hls = new Hls(); 
                hls.loadSource(url); 
                hls.attachMedia(video); 
                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                    video.play().catch(e => console.log(e));
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) { 
                video.src = url; 
                video.addEventListener('loadedmetadata', function() {
                    video.play().catch(e => console.log(e));
                });
            }
            
            // Manage Video Events
            video.onplaying = () => setWatermark('LIVEFY TV');
            video.onwaiting = () => setWatermark('LOADING...');
            video.onpause = () => removeWatermark();
            
        } else {
            // IFRAME FIX: Only pass the pure URL to avoid breaking tokenized links
            setWatermark('LIVEFY TV');
            iframe.src = url;
            iframe.style.display = 'block';
        }
    }

    function closeVideo() {
        document.getElementById('video-player').style.display = 'none';
        removeWatermark();
        
        if(hls) { hls.destroy(); hls = null; }
        video.pause();
        video.removeAttribute('src');
        video.load();
        
        const iframe = document.getElementById('iframe-player');
        iframe.src = '';
        iframe.style.display = 'none';
    }

    function showTab(id, el) {
        document.querySelectorAll('.content > div').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(id);
        if(target) target.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(el) el.classList.add('active');
        window.scrollTo(0,0);
    }

    function openPlayerServers(servers) {
        if(!servers || servers.length === 0) return alert("No Servers Found!");
        document.getElementById('video-player').style.display = 'flex';
        const sBox = document.getElementById('server-buttons'); sBox.innerHTML = '';
        servers.forEach((s, i) => {
            const btn = document.createElement('button'); btn.className = 'server-button'; btn.innerText = s.name || `Server ${i+1}`;
            btn.onclick = () => playStream(s.url, btn); sBox.appendChild(btn);
            if(i === 0) playStream(s.url, btn);
        });
    }

    function getCountdown(startTime) {
        const now = moment();
        const diff = startTime.diff(now);
        if (diff <= 0) return "Starting soon";
        const d = moment.duration(diff);
        const h = Math.floor(d.asHours()), m = d.minutes(), s = d.seconds();
        return h > 0 ? `${h}h ${m}m ${s}s left` : `${m}m ${s}s left`;
    }

    // JSON Fetch Function - Independent from Firebase
    async function fetchJsonData() {
        const jsonUrl = "https://raw.githubusercontent.com/srhady/bingstream/main/playlist.json?t=" + new Date().getTime(); // Added cache bust
        try {
            const res = await fetch(jsonUrl);
            if (res && res.ok) {
                const gitData = await res.json();
                if (gitData.channels) {
                    const grouped = {};
                    gitData.channels.forEach(item => {
                        const title = item["Match Title"] || "";
                        if (!title || title.toLowerCase().includes('intro')) return;
                        
                        let baseTitle = title.replace(/\[Server \d+\]/i, '').trim();
                        const key = baseTitle + '_' + item['Start Time'];

                        if (!grouped[key]) {
                            let stStr = item["Start Time"];
                            let st = (stStr === "Live Now" || stStr === "Always") ? moment() : moment(stStr, "h:mm A DD-MM-YYYY");
                            let isLive = (item["Match Status"] || "").toLowerCase() === 'live';
                            
                            grouped[key] = {
                                title: baseTitle,
                                team1Name: item["Team 1 Name"] || "TBA",
                                team2Name: item["Team 2 Name"] || "TBA",
                                team1Logo: item["Team 1 Logo"] || `https://placehold.co/50x50?text=T1`,
                                team2Logo: item["Team 2 Logo"] || `https://placehold.co/50x50?text=T2`,
                                start: st,
                                rank: isLive ? 1 : 2,
                                servers: [],
                                categoryName: item["Category"] || '',
                                isImportant: isLive
                            };
                        }
                        
                        let serverName = "Server " + (grouped[key].servers.length + 1);
                        const serverMatch = title.match(/\[(Server \d+)\]/i);
                        if (serverMatch) serverName = serverMatch[1];

                        // JSON FIX: Handling both Array format and String format
                        if (Array.isArray(item['Stream URL'])) {
                            item['Stream URL'].forEach(server => {
                                if (server.play_url && server.play_url.trim() !== '') {
                                    grouped[key].servers.push({ 
                                        name: server.server_name || serverName, 
                                        url: server.play_url 
                                    });
                                }
                            });
                        } else if (typeof item['Stream URL'] === 'string' && item['Stream URL'].trim() !== '') {
                            grouped[key].servers.push({ 
                                name: serverName, 
                                url: item['Stream URL'] 
                            });
                        }
                    });
                    return Object.values(grouped);
                }
            } else {
                console.error("Failed to load JSON, Status:", res.status);
            }
        } catch (e) {
            console.error("JSON fetch error:", e);
        }
        return[];
    }

    // UI Render Function
    function renderMatches() {
        const container = document.getElementById('match-list-container');
        const notifList = document.getElementById('notification-list');
        
        masterMatches =[];
        let liveTotal = 0;
        if(notifList) notifList.innerHTML = ''; 
        
        // Push Firebase Data
        Object.keys(firebaseMatches).forEach(id => {
            const m = firebaseMatches[id];
            if ((m.title || "").toLowerCase().includes('intro')) return;
            const start = moment(m.startTime);
            const end = m.endTime ? moment(m.endTime) : start.clone().add(3, 'hours');
            let rank = moment().isBetween(start, end) ? 1 : (moment().isBefore(start) ? 2 : 3);
            masterMatches.push({ ...m, start, end, rank });
        });

        // Push JSON Data
        gitMatches.forEach(m => masterMatches.push(m));

        // Sort by Rank & Time
        masterMatches.sort((a,b) => a.rank - b.rank || a.start - b.start);

        if(container) container.innerHTML = '';
        masterMatches.forEach(m => {
            const isLive = m.rank === 1, isUpcoming = m.rank === 2;
            let filterClass = isLive ? 'live' : (isUpcoming ? 'upcoming' : 'recent');
            
            const isHot = (m.isImportant === true || m.hot === true || m.isHot === true);
            const hotHTML = isHot ? `<div class="hot-badge"><i class="fas fa-fire"></i> HOT</div>` : '';

            let statusHTML = '';
            if(isLive) {
                statusHTML = `<div class="live-animation">LIVE NOW</div>`; liveTotal++;
                if(notifList) {
                    notifList.innerHTML += `<li class="notification-item" onclick='openPlayerServers(${JSON.stringify(m.servers).replace(/"/g, "&quot;")})'><img src="${m.team1Logo}" onerror="this.src='https://placehold.co/30x30';"><div class="info"><div class="teams">${m.team1Name} vs ${m.team2Name}</div><div class="title">${m.title}</div></div><div class="live-dot"></div></li>`;
                }
            } else if(isUpcoming) {
                statusHTML = `<div class="time">${m.start.format('hh:mm A')}</div><div class="date-on-card">${m.start.format('dddd, DD MMM YYYY')}</div><div class="countdown-text live-countdown" data-time="${m.start.toISOString()}">${getCountdown(m.start)}</div>`;
            } else {
                statusHTML = `<div style="color:#ffc107; font-size:11px; font-weight:bold;">FINISHED</div><div class="date-on-card">${m.start.format('dddd, DD MMM YYYY')}</div>`;
            }

            const card = document.createElement('div');
            card.className = `match-card ${filterClass} ${isLive ? 'live' : ''}`;
            
            card.innerHTML = `${hotHTML}
            <div class="match-title"><span>${m.title}</span></div>
            <div class="team">
                <div class="team-box"><img src="${m.team1Logo}" onerror="this.src='https://placehold.co/50x50?text=T1'"><span class="team-name">${m.team1Name}</span></div>
                <div class="match-status-wrapper">${statusHTML}</div>
                <div class="team-box"><img src="${m.team2Logo}" onerror="this.src='https://placehold.co/50x50?text=T2'"><span class="team-name">${m.team2Name}</span></div>
            </div>`;
            
            card.onclick = () => openPlayerServers(m.servers);
            container.appendChild(card);
        });
        document.getElementById('notification-count').innerText = liveTotal;
        document.getElementById('notification-count').style.transform = liveTotal > 0 ? 'scale(1)' : 'scale(0)';
        updateTabCounters();
    }

    async function loadAllMatches() {
        // Fetch JSON Data first
        gitMatches = await fetchJsonData();
        renderMatches();

        // Listen for Firebase Database matches
        database.ref('matches').on('value', (snapshot) => {
            firebaseMatches = snapshot.val() || {};
            renderMatches();
        });
    }

    function fetchTVandMovies() {
        database.ref('liveChannels').on('value', snap => {
            const grid = document.getElementById('channel-grid-container'); if(!grid) return; grid.innerHTML = '';
            Object.values(snap.val() || {}).forEach(c => {
                const item = document.createElement('div'); item.className = 'channel-item';
                item.onclick = () => openPlayerServers([{ name: c.name, url: c.streamUrl }]);
                item.innerHTML = `<img src="${c.logoUrl}" class="channel-logo" onerror="this.src='https://placehold.co/60x45?text=TV';"><span class="channel-name">${c.name}</span>`;
                grid.appendChild(item);
            });
        });
        
        database.ref('movies').on('value', snap => {
            const container = document.getElementById('movies-container'); if(!container) return; container.innerHTML = '';
            Object.values(snap.val() || {}).forEach(m => {
                const card = document.createElement('div'); card.className = 'movie-card';
                const url = m.videoUrl || m.streamUrl;
                const image = m.thumbnailUrl || m.posterUrl || m.logoUrl;
                
                card.onclick = () => openPlayerServers([{ name: m.title, url: url }]);
                card.innerHTML = `
                    <img src="${image}" class="movie-poster" onerror="this.src='https://placehold.co/150x225?text=Movie';">
                    <div class="movie-info">
                        <div class="movie-title">${m.title}</div>
                        <div class="movie-genre">${m.categoryName || 'Movie'}</div>
                    </div>
                `;
                container.appendChild(card);
            });
        });
    }

    function updateTabCounters() {
        const c = { all: masterMatches.length, live: 0, upcoming: 0, recent: 0 };
        masterMatches.forEach(m => { if(m.rank === 1) c.live++; else if(m.rank === 2) c.upcoming++; else c.recent++; });
        document.getElementById('count-all').innerText = c.all; document.getElementById('count-live').innerText = c.live; document.getElementById('count-upcoming').innerText = c.upcoming; document.getElementById('count-recent').innerText = c.recent;
    }

    function loadAdminSettings() {
        database.ref().on('value', snap => {
            const data = snap.val() || {}; const settings = data.settings || {};
            document.getElementById('update-text-content').innerText = settings.welcomeMessage || "";
            document.querySelectorAll('.join-now-link').forEach(el => el.href = settings.telegramLink || "#");
            
            const banners = data.banners || {};
            const updateB = (id, b) => { 
                const el = document.getElementById(id); 
                if (el) {
                    if(b && b.imageUrl) { 
                        el.querySelector('img').src = b.imageUrl; 
                        el.querySelector('a').href = b.targetUrl || "#"; 
                        el.style.display = 'block'; 
                    } else {
                        el.style.display = 'none';
                    }
                }
            };
            
            updateB('home-banner-top', banners.homeTop); 
            updateB('home-banner-bottom', banners.homeBottom); 
            updateB('channels-banner', banners.channels);
            updateB('movies-banner', banners.movies || banners.highlights); 
        });
        
        const uRef = database.ref('onlineUsers');
        database.ref('.info/connected').on('value', s => { if(s.val()) { let u = uRef.push(); u.set(true); u.onDisconnect().remove(); } });
        uRef.on('value', s => { if(document.getElementById('online-count')) document.getElementById('online-count').innerText = s.numChildren(); });
    }

    function filterMatches(f, btn) {
        if(btn) { document.querySelectorAll('#match-tabs-container .tab-btn').forEach(b => b.classList.remove('active-tab')); btn.classList.add('active-tab'); }
        document.querySelectorAll('.match-card').forEach(card => {
            if(f === 'all') card.classList.remove('hidden');
            else card.classList.toggle('hidden', !card.classList.contains(f));
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadAdminSettings(); loadAllMatches(); fetchTVandMovies();
        
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            document.querySelectorAll('.datetime-box').forEach(el => el.innerHTML = `<span style="font-size:13px; font-weight:900;">${timeStr}</span><br><span style="font-size:9px; font-weight:700;">${dateStr}</span>`);
        }, 1000);

        const menuBtn = document.getElementById('three-dot-menu'), side = document.getElementById('side-popup'), over = document.getElementById('popup-overlay');
        menuBtn.onclick = () => { side.classList.add('show'); over.classList.add('show'); };
        document.getElementById('close-popup-btn').onclick = () => { side.classList.remove('show'); over.classList.remove('show'); };
        over.onclick = () => { side.classList.remove('show'); over.classList.remove('show'); };

        const navMap = { 'popup-nav-home': 'home-section', 'popup-nav-channels': 'sports-channels-section', 'popup-nav-movies': 'movies-section', 'popup-nav-about': 'about-us-section', 'popup-nav-contact': 'contact-section', 'popup-nav-copyright': 'copyright-section' };
        Object.keys(navMap).forEach(id => {
            const el = document.getElementById(id);
            if(el) el.onclick = () => { 
                showTab(navMap[id], document.getElementById(id.replace('popup-nav-', 'nav-'))); 
                side.classList.remove('show'); over.classList.remove('show'); 
            };
        });

        const bell = document.getElementById('notification-bell'), panel = document.getElementById('notification-panel');
        bell.onclick = (e) => { e.stopPropagation(); panel.classList.toggle('show'); };
        window.onclick = () => panel.classList.remove('show');

        setInterval(() => {
            document.querySelectorAll('.live-countdown').forEach(el => {
                const startTime = moment(el.getAttribute('data-time'));
                if (startTime.diff(moment()) > 0) el.innerText = getCountdown(startTime);
                else { el.innerText = "Starting soon"; el.classList.remove('live-countdown'); }
            });
        }, 1000);
    });