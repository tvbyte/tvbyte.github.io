  const SMART_LINK = "";
        const JSON_URL = "https://raw.githubusercontent.com/srhady/bingstream/main/playlist.json";
        const TV_JSON_URL = "https://raw.githubusercontent.com/abusaeeidx/Mrgify-BDIX-IPTV/refs/heads/main/Channels_data.json";
        
        let clickTracker = 0;
        let allMatches =[], matchBroadcasts = {}, currentFilter = 'all';
        
        // HLS Player Instance Variable
        let hlsInstance = null;

        const infoData = {
            about: { 
                title: "About Sinvar Sports", 
                body: "Welcome to Sinvar Sports — your ultimate destination for free, premium, and uninterrupted live sports streaming! We cover everything from UCL, EPL, IPL, to World Cups and Live TV channels in HD. We provide multiple fast servers for a buffer-free experience. Join our Telegram (@sinvarsports) for instant updates." 
            },
            contact: { 
                title: "Contact Us", 
                body: "Need help or want to report an issue? The fastest way to reach us is through Telegram. Join @sinvarsports for 24/7 instant support, match requests, and updates. For business inquiries, DM us on Telegram." 
            },
            privacy: { 
                title: "Privacy Policy", 
                body: "Your privacy is safe with us. We do NOT collect any personal information, and no login is required. We only use standard browser local storage to save your theme preferences. Third-party ad networks on our site may use cookies to display relevant ads." 
            },
            disclaimer: { 
                title: "Disclaimer & DMCA", 
                body: "Sinvar Sports DOES NOT host, upload, or control any media files or streams. We only provide embedded links to third-party servers available publicly on the internet. We are not responsible for copyright violations by third-party hosts. Contact us for any removal requests." 
            }
        };

        // --- ANDROID HARDWARE BACK BUTTON LOGIC ---
        function pushHistory() {
            history.pushState({ isAppModal: true }, null, window.location.href);
        }

        window.addEventListener('popstate', function (event) {
            const playerOverlay = document.getElementById('player-overlay');
            const detailsView = document.getElementById('details-view');
            const infoModal = document.getElementById('info-modal');
            const loader = document.getElementById('player-loader');

            if (infoModal.style.display === 'flex') {
                infoModal.style.display = 'none';
            } 
            else if (playerOverlay.style.display === 'block') {
                playerOverlay.style.display = 'none';
                if (loader) loader.style.display = 'none'; 
                
                // Clear the Players
                const video = document.getElementById('videoPlayer');
                if(video) {
                    video.pause();
                    video.removeAttribute('src');
                    video.load();
                }
                document.getElementById('iframePlayer').src = "";
                if(hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
                
                document.getElementById('main-ui').classList.remove('hidden');
            } 
            else if (!detailsView.classList.contains('hidden')) {
                detailsView.classList.add('hidden');
                document.getElementById('home-view').classList.remove('hidden');
                document.getElementById('home-tabs').parentNode.classList.remove('hidden');
                document.getElementById('date-context').classList.remove('hidden');
                document.getElementById('main-footer').classList.remove('hidden');
            }
        });

        function goBack() {
            history.back();
        }

        function openInfo(t) { 
            pushHistory();
            document.getElementById('modal-title').innerText = infoData[t].title; 
            document.getElementById('modal-body').innerText = infoData[t].body; 
            document.getElementById('info-modal').style.display = 'flex'; 
        }
        
        function closeModal() { 
            history.back(); 
        }

        // Firebase Setup
        const firebaseConfig = { apiKey: "AIzaSyBcROeTFNV6haP8ZrnIFH2iuC9oNS6Ccvc", authDomain: "live-bd-24.firebaseapp.com", databaseURL: "https://live-bd-24-default-rtdb.firebaseio.com", projectId: "live-bd-24", storageBucket: "live-bd-24.firebasestorage.app", messagingSenderId: "171477012668", appId: "1:171477012668:web:f2e694da9474ef236e40b9" };
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            const isL = document.body.classList.contains('light-mode');
            const icon = document.querySelector('#theme-icon i');
            icon.className = isL ? 'fas fa-moon text-[10px]' : 'fas fa-sun text-[10px]';
            localStorage.setItem('falcon_theme', isL ? 'light' : 'dark');
        }
        if(localStorage.getItem('falcon_theme') === 'light') toggleTheme();

        // --- MAIN DATA LISTENER & GROUPING ---
        database.ref('/').on('value', async snap => {
            const data = snap.val() || {};
            if(data.settings && data.settings.notice) {
                document.getElementById('app-scrolling-notice').innerText = data.settings.notice;
            }
            
            const fbMatches = Object.values(data.matches || {});
            matchBroadcasts = data.match_broadcasts || {}; 

            // Fetch Match JSON
            let jsonMatches =[];
            try {
                const response = await fetch(JSON_URL);
                const jsonData = await response.json();
                if(jsonData.channels) {
                    jsonMatches = jsonData.channels
                        .filter(m => m.League !== "Intro" && m["Team 1 Name"] !== "Bingstream") 
                        .map((m, index) => {
                            let finalIsoDate = new Date().toISOString();
                            if (m["Start Time"] && !["Live Now", "Always"].includes(m["Start Time"])) {
                                try {
                                    const parts = m["Start Time"].split(' ');
                                    const timeParts = parts[0].split(':');
                                    const ampm = parts[1];
                                    const dateParts = parts[2].split('-');
                                    let hour = parseInt(timeParts[0]);
                                    if (ampm === 'PM' && hour < 12) hour += 12;
                                    if (ampm === 'AM' && hour === 12) hour = 0;
                                    finalIsoDate = new Date(dateParts[2], dateParts[1]-1, dateParts[0], hour, timeParts[1]).toISOString();
                                } catch(e) { finalIsoDate = new Date().toISOString(); }
                            }
                            return {
                                id: 'j-' + index,
                                leagueTitle: m.League || m.Category || "Live Match",
                                leagueLogo: m["Match Poster"] || m["Team 1 Logo"],
                                team1Name: m["Team 1 Name"] || "TBA",
                                team1Logo: m["Team 1 Logo"] || "https://i.ibb.co.com/JWj71bth/20260323-130824.png",
                                team2Name: m["Team 2 Name"] || "TBA",
                                team2Logo: m["Team 2 Logo"] || "https://i.ibb.co.com/JWj71bth/20260323-130824.png",
                                matchTime: finalIsoDate,
                                matchEndTime: new Date(new Date(finalIsoDate).getTime() + 7200000).toISOString(),
                                streamLinks: Array.isArray(m["Stream URL"]) 
                                    ? m["Stream URL"].map((s, i) => ({ name: s.server_name || `Server ${i + 1}`, link: s.play_url })) 
                                    : (m["Stream URL"] ? [{ name: m["Channel Name"] || m.name || "Server 1", link: m["Stream URL"] }] : []),
                                isLiveJ: m["Match Status"] === "Live" || m["Start Time"] === "Live Now"
                            };
                        });
                }
            } catch(e) { console.error("JSON fetch error", e); }

            let rawMatches =[...fbMatches, ...jsonMatches];
            
            // --- FIX FOR EMPTY LOGOS ---
            const DEFAULT_TEAM_LOGO = "https://i.ibb.co.com/JWj71bth/20260323-130824.png";
            const DEFAULT_LEAGUE_LOGO = "https://cdn-icons-png.flaticon.com/512/5351/5351315.png";

            rawMatches.forEach(m => {
                if (!m.team1Logo || m.team1Logo.trim() === "") m.team1Logo = DEFAULT_TEAM_LOGO;
                if (!m.team2Logo || m.team2Logo.trim() === "") m.team2Logo = DEFAULT_TEAM_LOGO;
                if (!m.leagueLogo || m.leagueLogo.trim() === "") m.leagueLogo = DEFAULT_LEAGUE_LOGO;
            });

            // --- MATCH GROUPING LOGIC ---
            let groupedMap = {};
            rawMatches.forEach(m => {
                let t1 = (m.team1Name || "TBA").trim().toLowerCase();
                let t2 = (m.team2Name || "TBA").trim().toLowerCase();
                let key = t1 + "_vs_" + t2;
                
                if (key === "tba_vs_tba" || key === "_vs_") {
                    key = m.id;
                }

                if (!groupedMap[key]) {
                    groupedMap[key] = { ...m, streamLinks: m.streamLinks ?[...m.streamLinks] :[] };
                } else {
                    if (m.streamLinks && m.streamLinks.length > 0) {
                        groupedMap[key].streamLinks.push(...m.streamLinks);
                    }
                }
            });

            allMatches = Object.values(groupedMap);

            allMatches.forEach(m => {
                if (m.streamLinks && m.streamLinks.length > 0) {
                    m.streamLinks.forEach((link, idx) => {
                        if (!link.name || link.name.trim() === "") {
                            link.name = `SERVER ${idx + 1}`;
                        }
                    });
                }
            });

            renderMatches();
            fetchTVChannels(); 
        });

        // --- FETCH & RENDER TV CHANNELS ---
        async function fetchTVChannels() {
            const container = document.getElementById('tv-list-view');
            try {
                const response = await fetch(TV_JSON_URL);
                const data = await response.json();
                if (data.channels) {
                    container.innerHTML = "";
                    data.channels.forEach(ch => {
                        if(!ch.name || ch.name.trim() === "") return;
                        const channelLogo = "https://cdn-icons-png.flaticon.com/512/716/716429.png";
                        
                        let chImg = ch.logo || channelLogo;
                        
                        container.innerHTML += `
                            <div class="tv-card" onclick="handleInteraction('${ch.url}', '${ch.name}')">
                                <div class="tv-logo-container">
                                    <img src="${chImg}" onerror="this.src='${channelLogo}'" alt="${ch.name}">
                                </div>
                                <p class="tv-name">${ch.name}</p>
                            </div>`;
                    });
                }
            } catch (e) {
                container.innerHTML = `<div class="col-span-4 text-center py-10 text-[var(--danger)] text-[10px] font-bold uppercase tracking-wider">Failed to load channels</div>`;
            }
        }

        // --- NAVIGATION LOGIC ---
        function navigate(view) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const homeView = document.getElementById('home-view');
            const tvView = document.getElementById('tv-view');
            const detailsView = document.getElementById('details-view');

            if (view === 'home') {
                document.querySelector('.nav-btn:nth-child(1)').classList.add('active');
                homeView.classList.remove('hidden');
                tvView.classList.add('hidden');
                detailsView.classList.add('hidden');
                document.getElementById('home-tabs').parentNode.classList.remove('hidden');
                document.getElementById('date-context').classList.remove('hidden');
                document.getElementById('main-footer').classList.remove('hidden');
            } else if (view === 'tv') {
                document.querySelector('.nav-btn:nth-child(2)').classList.add('active');
                homeView.classList.add('hidden');
                tvView.classList.remove('hidden');
                detailsView.classList.add('hidden');
                document.getElementById('main-footer').classList.remove('hidden');
            }
            window.scrollTo(0,0);
        }

        function switchTab(f, btn) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active'); currentFilter = f; renderMatches();
        }

        function getElapsed(st) {
            const diff = new Date() - new Date(st);
            if(diff < 0) return "00:00";
            const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
            return (h>0?h+":":"")+m.toString().padStart(2,'0')+":"+Math.floor((diff%60000)/1000).toString().padStart(2,'0');
        }

        function getCountdown(st) {
            const diff = new Date(st) - new Date();
            if (diff <= 0) return "Starts in...";
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            return (h > 0 ? h + "h " : "") + m + "m " + s + "s";
        }

        // --- RENDER MATCHES ---
        function renderMatches() {
            const container = document.getElementById('list-view');
            container.innerHTML = "";
            const now = new Date();

            let filtered = allMatches.filter(m => {
                const s = new Date(m.matchTime), e = new Date(m.matchEndTime);
                if (currentFilter === 'live') return (now >= s && now <= e) || m.isLiveJ;
                if (currentFilter === 'upcoming') return now < s && !m.isLiveJ;
                if (currentFilter === 'finished') return now > e;
                return true;
            }).sort((a,b) => {
                const getStatusPrio = (match) => {
                    const s = new Date(match.matchTime), e = new Date(match.matchEndTime);
                    if ((now >= s && now <= e) || match.isLiveJ) return 1;
                    if (now < s) return 2;
                    return 3;
                };
                const prioA = getStatusPrio(a), prioB = getStatusPrio(b);
                if (prioA !== prioB) return prioA - prioB;
                return new Date(a.matchTime) - new Date(b.matchTime);
            });

            if(filtered.length === 0) {
                container.innerHTML = `<div class="text-center py-16 text-[var(--text-muted)] font-bold uppercase tracking-widest text-[10px]"><i class="fas fa-box-open text-2xl mb-3 block opacity-50"></i>No matches found</div>`;
                return;
            }

            filtered.forEach(m => {
                const s = new Date(m.matchTime), e = new Date(m.matchEndTime);
                const isLive = (now >= s && now <= e) || m.isLiveJ;
                
                let badge = isLive 
                    ? `<div class="flex items-center gap-2"><span class="bg-rose-600 text-white px-2 py-0.5 rounded text-[9px] font-black animate-pulse shadow-md tracking-wider">LIVE</span><span class="text-rose-500 text-[9px] font-bold"><span class="live-timer-span" data-start="${m.matchTime}">${getElapsed(m.matchTime)}</span></span></div>`
                    : (now > e 
                        ? `<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-600 tracking-wider">FINISHED</span>`
                        : `<div class="flex items-center gap-2"><span class="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-black shadow-md tracking-wider">UPCOMING</span><span class="text-blue-400 text-[9px] font-bold flex items-center gap-1"><i class="fas fa-clock text-[8px]"></i> <span class="upcoming-countdown-span" data-start="${m.matchTime}">${getCountdown(m.matchTime)}</span></span></div>`
                      );

                const animateClass = isLive ? 'live-match-animate' : '';
                
                let serverCount = m.streamLinks ? m.streamLinks.length : 0;
                let serverBadge = serverCount > 0 ? `<div class="text-[8px] font-black text-rose-500 mt-1 bg-rose-500/10 px-2 py-0.5 rounded flex items-center w-max"><i class="fas fa-play text-[7px] mr-1"></i> ${serverCount} Links</div>` : '';

                container.innerHTML += `
                    <div class="pro-match-card ${animateClass}" onclick="showDetails('${m.id}')">
                        <div class="flex justify-between items-center p-3 border-b border-[var(--border-color)] bg-[var(--bg-color)]/50">
                            <div class="flex items-center gap-2">
                                <img src="${m.leagueLogo}" class="w-4 h-4 object-contain rounded-full bg-white/10" onerror="this.src='https://cdn-icons-png.flaticon.com/512/5351/5351315.png'">
                                <span class="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider truncate max-w-[150px]">${m.leagueTitle}</span>
                            </div>
                            ${badge}
                        </div>
                        
                        <div class="flex justify-between items-center p-3">
                            <div class="flex flex-col gap-3 w-[70%]">
                                <div class="flex items-center gap-3">
                                    <img src="${m.team1Logo}" class="w-6 h-6 object-contain bg-white rounded-full p-0.5 border border-[#e2e8f0]" onerror="this.src='https://i.ibb.co.com/JWj71bth/20260323-130824.png'">
                                    <span class="text-[12px] font-bold text-[var(--text-main)] truncate leading-none uppercase tracking-wide">${m.team1Name}</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <img src="${m.team2Logo}" class="w-6 h-6 object-contain bg-white rounded-full p-0.5 border border-[#e2e8f0]" onerror="this.src='https://i.ibb.co.com/JWj71bth/20260323-130824.png'">
                                    <span class="text-[12px] font-bold text-[var(--text-main)] truncate leading-none uppercase tracking-wide">${m.team2Name}</span>
                                </div>
                            </div>
                            
                            <div class="w-[30%] flex flex-col items-end justify-center border-l border-[var(--border-color)] pl-3">
                                <span class="text-[10px] font-bold text-[var(--text-muted)] text-right leading-tight uppercase tracking-wider">
                                    ${s.toLocaleDateString([],{day:'numeric',month:'short'})}<br>${s.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                </span>
                                ${serverBadge}
                            </div>
                        </div>
                    </div>`;
            });
        }

        function showDetails(id) { 
            pushHistory();
            renderDetailsUI(id); 
        }

        function renderDetailsUI(id) {
            const m = allMatches.find(x => x.id == id); if(!m) return;
            document.getElementById('home-view').classList.add('hidden');
            document.getElementById('home-tabs').parentNode.classList.add('hidden');
            document.getElementById('date-context').classList.add('hidden');
            document.getElementById('main-footer').classList.add('hidden');
            document.getElementById('details-view').classList.remove('hidden');
            document.getElementById('player-overlay').style.display = 'none';

            // Clean up player on switching to details
            const video = document.getElementById('videoPlayer');
            if(video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
            if(hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

            document.getElementById('det-league-name').innerText = m.leagueTitle;
            document.getElementById('det-league-img').src = m.leagueLogo;
            document.getElementById('det-t1-name').innerText = m.team1Name;
            document.getElementById('det-t2-name').innerText = m.team2Name;
            
            const t1Img = document.getElementById('det-t1-img');
            t1Img.src = m.team1Logo;
            t1Img.onerror = function() { this.src = 'https://i.ibb.co.com/JWj71bth/20260323-130824.png'; };

            const t2Img = document.getElementById('det-t2-img');
            t2Img.src = m.team2Logo;
            t2Img.onerror = function() { this.src = 'https://i.ibb.co.com/JWj71bth/20260323-130824.png'; };

            document.getElementById('det-time-box').innerHTML = `<i class="fas fa-clock text-[var(--primary)] mr-1"></i> ` + new Date(m.matchTime).toLocaleString([], {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}).toUpperCase();

            const s = new Date(m.matchTime), e = new Date(m.matchEndTime), now = new Date();
            const isLive = (now >= s && now <= e) || m.isLiveJ;
            
            let statusText = isLive ? 'LIVE NOW' : (now > e ? 'FINISHED' : 'UPCOMING');
            let statusClass = isLive 
                ? 'text-[10px] font-black px-4 py-1.5 rounded-md uppercase tracking-widest text-white bg-rose-600 animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.5)]' 
                : (now > e 
                    ? 'text-[10px] font-black px-4 py-1.5 rounded-md uppercase tracking-widest text-slate-300 bg-slate-700 border border-slate-600' 
                    : 'text-[10px] font-black px-4 py-1.5 rounded-md uppercase tracking-widest text-white bg-blue-600 shadow-md');
            
            const detStatusEl = document.getElementById('detStatus');
            detStatusEl.innerText = statusText;
            detStatusEl.className = statusClass;

            const bTableContainer = document.getElementById('broadcaster-table-container');
            let foundChans = matchBroadcasts[id] ? matchBroadcasts[id].channels || [] :[];
            if (foundChans.length > 0) {
                let html = `<div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;"><table style="width:100%; border-collapse:collapse; background:var(--bg-color); font-size:10px; text-align:left;"><thead><tr style="background:var(--border-color); color:var(--text-muted); text-transform:uppercase; font-weight:900; letter-spacing:1px;"><th style="padding:10px 15px;">Sport</th><th style="padding:10px 15px;">Channel Name</th></tr></thead><tbody>`;
                foundChans.forEach(ch => {
                    html += `<tr style="border-top:1px solid var(--border-color); color:var(--text-main);"><td style="padding:12px 15px; font-weight:700;">${matchBroadcasts[id].sport || 'Live'}</td><td style="padding:12px 15px; font-weight:800; color:var(--primary);">${ch.name}</td></tr>`;
                });
                bTableContainer.innerHTML = html + `</tbody></table></div>`;
            } else {
                bTableContainer.innerHTML = `<span class="text-[10px] text-[var(--text-muted)] italic uppercase block py-2">No Broadcasters Available</span>`;
            }

            const sL = document.getElementById('server-list'); sL.innerHTML = "";
            if (!m.streamLinks || m.streamLinks.length === 0) {
                sL.innerHTML = `
                <div class="p-6 bg-[var(--primary)]/5 border border-dashed border-[var(--primary)]/20 rounded-xl text-center">
                    <p class="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider mb-2"><i class="fas fa-tools mr-1"></i> Links Updating Soon</p>
                    <p class="text-[8px] font-bold text-[var(--text-muted)] uppercase">Available 15-30 mins before kick-off</p>
                </div>`;
            } else {
                m.streamLinks.forEach((l, i) => {
                    sL.innerHTML += `<button onclick="handleInteraction('${l.link}', '${m.team1Name} vs ${m.team2Name}')" class="stream-btn flex items-center justify-between p-3.5 rounded-xl font-bold text-xs w-full shadow-sm"><span><i class="fas fa-play-circle mr-3 opacity-70 text-[var(--primary)]"></i> ${l.name}</span><i class="fas fa-external-link-alt opacity-50 text-[10px]"></i></button>`;
                });
            }
            window.scrollTo(0,0);
        }

        function handleInteraction(u, t) {
            clickTracker++;
            if (clickTracker === 2) { window.open(SMART_LINK, '_blank'); }
            startStreaming(u, t);
        }

        // ==============================================
        // NEW START STREAMING LOGIC (Using hls.js + video)
        // ==============================================
        function startStreaming(u, t) {
            pushHistory();
            document.getElementById('player-match-title').innerText = t;
            document.getElementById('player-overlay').style.display = 'block';
            document.getElementById('main-ui').classList.add('hidden');
            
            const wrapper = document.getElementById('player-wrapper');
            const video = document.getElementById('videoPlayer');
            const iframe = document.getElementById('iframePlayer');
            const loader = document.getElementById('player-loader');
            
            if (loader) loader.style.display = 'flex';

            video.style.display = 'none';
            iframe.style.display = 'none';
            iframe.src = "";
            if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }

            wrapper.style.aspectRatio = "16/9";
            wrapper.style.height = "auto";

            if (u.includes('.m3u8') || u.includes('.mp4')) {
                video.style.display = 'block';
                if(u.includes('.mp4')) {
                    video.src = u;
                    if (loader) loader.style.display = 'none';
                } else if (Hls.isSupported()) {
                    hlsInstance = new Hls();
                    hlsInstance.loadSource(u);
                    hlsInstance.attachMedia(video);
                    hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () { 
                        video.play(); 
                        if (loader) loader.style.display = 'none';
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = u;
                    video.addEventListener('loadedmetadata', function() {
                        video.play();
                        if (loader) loader.style.display = 'none';
                    });
                }
            } else {
                // IFRAME PLAYER
                iframe.style.display = 'block';
                
                if (u.includes('dadocric') || u.includes('player.php')) {
                    iframe.style.height = "800px"; 
                    iframe.style.top = "-230px"; 
                } else {
                    iframe.style.height = "100%";
                    iframe.style.top = "0px";
                }
                
                iframe.onload = () => {
                    setTimeout(() => {
                        if (loader) loader.style.display = 'none';
                    }, 1500); 
                };

                if (u.toLowerCase().includes('<iframe') && u.toLowerCase().includes('src=')) {
                    const match = u.match(/src=["'](.*?)["']/);
                    if (match && match[1]) {
                        iframe.src = match[1];
                    } else {
                        iframe.src = u; 
                    }
                } else {
                    iframe.src = u;
                }
            }

            // Fallback timeout to hide loader
            setTimeout(() => {
                if (loader) loader.style.display = 'none';
            }, 8000);
        }

        setInterval(() => {
            const vEl = document.getElementById('player-viewer-count');
            if(vEl) {
                let current = parseInt(vEl.innerText.replace(/,/g,'')) || 14250;
                vEl.innerText = (current + (Math.floor(Math.random()*40)-15)).toLocaleString();
            }
            document.querySelectorAll('.live-timer-span').forEach(el => el.innerText = getElapsed(el.getAttribute('data-start')));
            document.querySelectorAll('.upcoming-countdown-span').forEach(el => el.innerText = getCountdown(el.getAttribute('data-start')));
        }, 1000);

        document.getElementById('today-date-str').innerText = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });