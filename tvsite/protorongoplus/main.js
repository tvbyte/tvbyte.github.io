
var allChannels = [],
      filteredChannels = [],
      currentChannel = null,
      hlsInstance = null,
      activeTab = 'all';
    var deadChannels = {},
      aliveChannels = {};
    var favorites = JSON.parse(localStorage.getItem('tp_favorites') || '{}');
    var showOnlyFavorites = false;

    var PROXY_BASE = 'https://proxyserver2.nurmd2006-official.workers.dev/?url=';
    var PROXY_PLAYLISTS = ['roarzone', 'aynaott'];

    var FALLBACK_LOGO = 'https://pro-torongoplus.vercel.app/img.png';

    
    function updateCount() { 
      var el = document.getElementById('channelCount_nurmd2006');
      if (el) el.textContent = allChannels.length + ' channels'; 
    }

    function getFlag(cc) { 
      if (!cc || cc.length !== 2) return '🌐'; 
      return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65); 
    }

    function setStatus(msg) { 
      var el = document.getElementById('statusMsg_nurmd2006'); 
      if (el) el.textContent = msg; 
    }

    function showOverlay(show) { 
      var el = document.getElementById('overlay_nurmd2006'); 
      if (el) el.classList.toggle('hidden_nurmd2006', !show); 
    }

    function clearStorage() { 
      if (confirm('Clear all saved data?')) { 
        localStorage.clear();
        location.reload(); 
      } 
    }

    function togglePlayPause() { 
      var v = document.getElementById('vid_nurmd2006'); 
      if (!v) return;
      v.paused ? v.play().catch(function() {}) : v.pause(); 
    }

    function toggleFullscreen() { 
      var el = document.getElementById('player_nurmd2006'); 
      if (!el) return;
      document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen().catch(function() {}); 
    }

    function prevChannel() { 
      if (!currentChannel && filteredChannels.length) { 
        tuneToChannel(filteredChannels[0].id); 
        return; 
      }
      if (!currentChannel) return; 
      var idx = filteredChannels.findIndex(function(c) { return c.id === currentChannel.id; }); 
      if (idx === -1) return;
      tuneToChannel(filteredChannels[idx > 0 ? idx - 1 : filteredChannels.length - 1].id); 
    }

    function nextChannel() { 
      if (!currentChannel && filteredChannels.length) { 
        tuneToChannel(filteredChannels[0].id); 
        return; 
      }
      if (!currentChannel) return; 
      var idx = filteredChannels.findIndex(function(c) { return c.id === currentChannel.id; }); 
      if (idx === -1) return; 
      var next = idx, tries = 0; 
      do { 
        next = (next + 1) % filteredChannels.length;
        tries++; 
      } while (deadChannels[filteredChannels[next]?.id] && tries < filteredChannels.length); 
      if (filteredChannels[next]) tuneToChannel(filteredChannels[next].id); 
    }

    document.addEventListener('DOMContentLoaded', function() {
      var player = document.getElementById('player_nurmd2006');
      if (player) {
        player.addEventListener('dblclick', function(e) { 
          e.preventDefault(); 
          var v = document.getElementById('vid_nurmd2006'); 
          if (v) v.muted = !v.muted; 
        });
        var lastTap = 0;
        player.addEventListener('touchstart', function(e) { 
          var now = Date.now(); 
          if (now - lastTap < 300) { 
            e.preventDefault(); 
            var v = document.getElementById('vid_nurmd2006'); 
            if (v) v.muted = !v.muted; 
          } 
          lastTap = now; 
        });
      }
      var v = document.getElementById('vid_nurmd2006');
      if (v) {
        v.addEventListener('play', function() { 
          var btn = document.getElementById('playPauseBtn_nurmd2006'); 
          if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
        });
        v.addEventListener('pause', function() { 
          var btn = document.getElementById('playPauseBtn_nurmd2006'); 
          if (btn) btn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
        });
      }
    });

    function toggleFavsFilter() { 
      showOnlyFavorites = !showOnlyFavorites; 
      var btn = document.getElementById('favsFilterBtn_nurmd2006'); 
      if (btn) { 
        btn.classList.toggle('active_nurmd2006', showOnlyFavorites);
        btn.innerHTML = showOnlyFavorites ? '<i class="fa-solid fa-star" style="color:var(--yel_nurmd2006);"></i>' : '<i class="fa-solid fa-star"></i>'; 
      }
      applyFilter(); 
    }

    function needsProxy(name) { 
      if (!name) return false;
      return PROXY_PLAYLISTS.some(function(n) { 
        return name.toLowerCase().includes(n.toLowerCase()); 
      }); 
    }

    async function fetchWithProxy(url, name) { 
      var targetUrl = needsProxy(name) ? PROXY_BASE + encodeURIComponent(url) : url; 
      var res = await fetch(targetUrl, { signal: AbortSignal.timeout(20000) }); 
      if (!res.ok) throw new Error('HTTP ' + res.status); 
      return await res.text(); 
    }

    async function initialize() { 
      showOverlay(true);
      setStatus('Loading channels...'); 
      var list = document.getElementById('chlist_nurmd2006'); 
      if (list) list.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3_nurmd2006);">Downloading playlists...</div>'; 
      await new Promise(function(r) { setTimeout(r, 2000); }); 
      await loadAllPlaylists();
      updateCount();
      setStatus(allChannels.length + ' streams ready'); 
      if (filteredChannels.length > 0 && !currentChannel) { 
        await new Promise(function(r) { setTimeout(r, 1000); });
        tuneToChannel(filteredChannels[0].id); 
      } 
    }

    async function refreshAll() { 
      var currentUrl = currentChannel ? currentChannel.u : null;
      allChannels = [];
      deadChannels = {};
      aliveChannels = {};
      activeTab = 'all';
      showOnlyFavorites = false;
      var favBtn = document.getElementById('favsFilterBtn_nurmd2006');
      if (favBtn) { 
        favBtn.classList.remove('active_nurmd2006'); 
        favBtn.innerHTML = '<i class="fa-solid fa-star"></i>'; 
      }
      var srchInput = document.getElementById('srch_nurmd2006');
      if (srchInput) srchInput.value = '';
      var list = document.getElementById('chlist_nurmd2006'); 
      if (list) list.innerHTML = '<div style="padding:30px;text-align:center;color:var(--t3_nurmd2006);">Refreshing playlists...</div>'; 
      await loadAllPlaylists();
      updateCount();
      setStatus(allChannels.length + ' streams ready'); 
      if (currentUrl) { 
        var found = allChannels.find(function(c) { return c.u === currentUrl; }); 
        if (found) { 
          currentChannel = found; 
          var nameEl = document.getElementById('np_name_nurmd2006'); 
          if (nameEl) nameEl.textContent = found.n; 
          var metaEl = document.getElementById('np_meta_nurmd2006'); 
          if (metaEl) metaEl.textContent = (found.playlist || found.cat || ''); 
        } 
      }
      applyFilter();
      showOverlay(false); 
    }

    async function loadAllPlaylists() { 
      var nextId = allChannels.length; 
      var seen = new Set(allChannels.map(function(c) { return c.u; })); 
      for (var i = 0; i < PLAYLIST_SOURCES.length; i++) { 
        var src = PLAYLIST_SOURCES[i]; 
        try { 
          setStatus('Loading ' + src.name + '...'); 
          var text = await fetchWithProxy(src.url, src.name); 
          var channels = parseM3U(text, src.name);
          var added = 0; 
          for (var j = 0; j < channels.length; j++) { 
            var ch = channels[j]; 
            if (!seen.has(ch.u)) { 
              nextId++;
              added++;
              ch.id = nextId;
              ch.playlist = src.name;
              allChannels.push(ch);
              seen.add(ch.u); 
            } 
          }
          setStatus(src.name + ': +' + added); 
          await new Promise(function(r) { setTimeout(r, 400); }); 
        } catch (e) {
          setStatus(src.name + ': failed'); 
          await new Promise(function(r) { setTimeout(r, 300); }); 
        } 
      }
      buildTabs();
      applyFilter(); 
    }

    function parseM3U(content, playlistName) {
      var lines = content.split('\n'),
        result = [],
        current = {};
      var useProxy = needsProxy(playlistName);
        
      for (var i = 0; i < lines.length; i++) { 
        var line = lines[i].trim(); 
        if (line.startsWith('#EXTINF:')) { 
          var nameMatch = line.match(/,(.+)$/),
            groupMatch = line.match(/group-title="([^"]*)"/),
            logoMatch = line.match(/tvg-logo="([^"]*)"/); 
          var name = nameMatch ? nameMatch[1].trim() : 'Unknown';
          name = name.replace(/\s*[ⓃⓊⓇ]/g, '').trim();
          current = { 
            n: name, 
            cat: groupMatch ? groupMatch[1] : 'other', 
            logo: logoMatch ? logoMatch[1] : null,
            cc: null, 
            q: null, 
            chId: null 
          }; 
        } else if (line && !line.startsWith('#') && line.startsWith('http')) { 
          if (!line.includes('youtube.com') && !line.includes('youtu.be') && !line.includes('twitch.tv') && !line.includes('dailymotion.com')) { 
            current.u = useProxy ? PROXY_BASE + encodeURIComponent(line) : line;
            result.push(current);
            current = {}; 
          } 
        } 
      } 
      return result; 
    }

    function buildTabs() { 
      var playlists = [], seen = {}; 
      for (var i = 0; i < allChannels.length; i++) { 
        var p = allChannels[i].playlist; 
        if (p && !seen[p]) { 
          playlists.push(p);
          seen[p] = true; 
        } 
      } 
      var container = document.getElementById('tabContainer_nurmd2006'); 
      if (!container) return;
      container.innerHTML = ''; 
      
      var allDiv = document.createElement('div');
      allDiv.className = 'tab_nurmd2006' + (activeTab === 'all' ? ' on_nurmd2006' : '');
      allDiv.textContent = 'All';
      allDiv.setAttribute('data-tab', 'all');
      allDiv.onclick = function() { switchTab('all'); };
      container.appendChild(allDiv);
      
      for (var j = 0; j < playlists.length; j++) { 
        (function(p) { 
          var div = document.createElement('div');
          div.className = 'tab_nurmd2006' + (activeTab === p ? ' on_nurmd2006' : '');
          div.textContent = p;
          div.setAttribute('data-tab', p);
          div.onclick = function() { switchTab(p); };
          container.appendChild(div); 
        })(playlists[j]); 
      } 
    }

    function switchTab(tab) { 
      activeTab = tab; 
      var tabs = document.querySelectorAll('.tab_nurmd2006'); 
      for (var i = 0; i < tabs.length; i++) { 
        tabs[i].classList.remove('on_nurmd2006'); 
        if (tabs[i].getAttribute('data-tab') === tab) { 
          tabs[i].classList.add('on_nurmd2006'); 
        } 
      }
      applyFilter(); 
    }

    function doSearch() { 
      clearTimeout(window._searchTimer);
      window._searchTimer = setTimeout(applyFilter, 200); 
    }

    function applyFilter() { 
      var query = (document.getElementById('srch_nurmd2006')?.value || '').toLowerCase(); 
      var src = allChannels; 
      if (showOnlyFavorites) src = src.filter(function(c) { return favorites[c.id]; }); 
      if (activeTab !== 'all') src = src.filter(function(c) { return c.playlist === activeTab; });
      filteredChannels = src.filter(function(c) { 
        return !query || (c.n || '').toLowerCase().indexOf(query) !== -1; 
      });
      renderChannelList(); 
    }

    function esc(str) { 
      return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; 
    }

    function createChannelHTML(ch) { 
      var isActive = currentChannel && currentChannel.id === ch.id; 
      var logoHTML = ch.logo ? '<img src="' + esc(ch.logo) + '" onerror="this.onerror=null;this.src=\'' + FALLBACK_LOGO + '\';">' : '<img src="' + FALLBACK_LOGO + '" style="width:100%;height:100%;object-fit:contain;">';
      var statusDot = aliveChannels[ch.id] ? '<span class="live_dot_nurmd2006 online_nurmd2006"></span>' : deadChannels[ch.id] ? '<span class="live_dot_nurmd2006 offline_nurmd2006"></span>' : '';
      var favClass = favorites[ch.id] ? ' active_nurmd2006' : ''; 
      var favHTML = '<span class="fav_star_nurmd2006' + favClass + '" onclick="event.stopPropagation();toggleFavorite(' + ch.id + ')">' + (favorites[ch.id] ? '★' : '☆') + '</span>';
      return '<div class="ch_nurmd2006' + (isActive ? ' on_nurmd2006' : '') + '" onclick="tuneToChannel(' + ch.id + ')"><div class="ch_logo_nurmd2006">' + logoHTML + '</div><div class="ch_info_nurmd2006"><div class="ch_name_nurmd2006" title="' + esc(ch.n) + '">' + statusDot + esc(ch.n) + '</div><div class="ch_meta_nurmd2006">' + (ch.cc ? getFlag(ch.cc) + ' ' : '') + esc(ch.playlist || ch.cat || '') + '</div></div>' + favHTML + '</div>'; 
    }

    function injectAdIntoContainer(containerId) { 
      var container = document.getElementById(containerId); 
      if (!container) return;
      container.innerHTML = ''; 
      var script = document.createElement('script');
      script.src = '';
      container.appendChild(script); 
    }

     function renderChannelList() { 
      
        html += createChannelHTML(filteredChannels[i]); 
      }
      if (filteredChannels.length === 0) { 
        html = '<div style="padding:30px;font-size:12px;color:var(--t3_nurmd2006);text-align:center">No channels</div>'; 
      } 
      var list = document.getElementById('chlist_nurmd2006'); 
      if (list) list.innerHTML = html;
      setTimeout(function() { 
        if (document.getElementById('adSlot1_nurmd2006')) injectAdIntoContainer('adSlot1_nurmd2006'); 
        if (document.getElementById('adSlot2_nurmd2006')) injectAdIntoContainer('adSlot2_nurmd2006'); 
      }, 1000); 
    }

    function toggleFavorite(id) { 
      favorites[id] ? delete favorites[id] : favorites[id] = 1;
      localStorage.setItem('tp_favorites', JSON.stringify(favorites));
      renderChannelList(); 
    }

    function cleanupPlayer() { 
      var v = document.getElementById('vid_nurmd2006'); 
      if (hlsInstance) { 
        hlsInstance.destroy();
        hlsInstance = null; 
      } 
      if (v) { 
        v.pause(); 
        try { 
          v.removeAttribute('src');
          v.load(); 
        } catch (e) {} 
      } 
    }

    function tuneToChannel(id) { 
      var ch = null; 
      for (var i = 0; i < allChannels.length; i++) { 
        if (allChannels[i].id === id) { 
          ch = allChannels[i]; 
          break; 
        } 
      } 
      if (!ch || !ch.u) return;
      currentChannel = ch;
      renderChannelList(); 
      var nameEl = document.getElementById('np_name_nurmd2006'); 
      if (nameEl) nameEl.textContent = ch.n; 
      var metaEl = document.getElementById('np_meta_nurmd2006'); 
      if (metaEl) metaEl.textContent = (ch.cc ? getFlag(ch.cc) + ' ' : '') + (ch.playlist || ch.cat || ''); 
      var logoEl = document.getElementById('np_logo_nurmd2006'); 
      if (logoEl) logoEl.innerHTML = ch.logo ? '<img src="' + esc(ch.logo) + '" onerror="this.onerror=null;this.src=\'' + FALLBACK_LOGO + '\';" style="width:100%;height:100%;object-fit:contain;">' : '<img src="' + FALLBACK_LOGO + '" style="width:100%;height:100%;object-fit:contain;">';
      cleanupPlayer(); 
      var v = document.getElementById('vid_nurmd2006'); 
      if (!v) return;
      showOverlay(true);
      setStatus('Tuning ' + ch.n + '...'); 
      if (window._skipTimer) clearTimeout(window._skipTimer);
      window._skipTimer = setTimeout(function() { 
        if (currentChannel && currentChannel.id === ch.id) { 
          deadChannels[ch.id] = 1; 
          delete aliveChannels[ch.id];
          nextChannel(); 
        } 
      }, 15000); 
      if (typeof Hls !== 'undefined' && Hls.isSupported()) { 
        hlsInstance = new Hls({
          enableWorker: true,
          maxBufferLength: 20,
          manifestLoadingTimeOut: 12000 
        });
        hlsInstance.loadSource(ch.u);
        hlsInstance.attachMedia(v);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() { 
          clearTimeout(window._skipTimer);
          showOverlay(false);
          v.play().catch(function() {});
          aliveChannels[ch.id] = 1; 
          delete deadChannels[ch.id]; 
        });
        hlsInstance.on(Hls.Events.ERROR, function() { 
          clearTimeout(window._skipTimer);
          deadChannels[ch.id] = 1; 
          delete aliveChannels[ch.id];
          nextChannel(); 
        }); 
      } else { 
        v.src = ch.u;
        v.load();
        v.play().then(function() { 
          clearTimeout(window._skipTimer);
          showOverlay(false);
          aliveChannels[ch.id] = 1; 
        }).catch(function() { 
          v.muted = true;
          v.play().catch(function() {});
          showOverlay(false);
          aliveChannels[ch.id] = 1; 
        });
        v.addEventListener('error', function() { 
          deadChannels[ch.id] = 1;
          nextChannel(); 
        }, { once: true }); 
      }
      closeMenu(); 
    }

    function toggleMenu() { 
      var side = document.getElementById('side_nurmd2006'); 
      if (side) side.classList.toggle('open_nurmd2006'); 
      var shade = document.getElementById('shade_nurmd2006'); 
      if (shade) shade.classList.toggle('open_nurmd2006'); 
    }

    function closeMenu() { 
      var side = document.getElementById('side_nurmd2006'); 
      if (side) side.classList.remove('open_nurmd2006'); 
      var shade = document.getElementById('shade_nurmd2006'); 
      if (shade) shade.classList.remove('open_nurmd2006'); 
    }

    document.addEventListener('keydown', function(e) { 
      if (e.target.tagName === 'INPUT') return; 
      if (e.key === 'ArrowUp') { 
        e.preventDefault();
        prevChannel(); 
      } 
      if (e.key === 'ArrowDown') { 
        e.preventDefault();
        nextChannel(); 
      } 
      if (e.key === ' ') { 
        e.preventDefault();
        togglePlayPause(); 
      } 
    });

    initialize();
