(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const now = () => new Date();
  const fmtTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const number = (value, digits = 1) => value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(digits);

  const icons = {
    Router: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h.01M11 12h.01M15 12h.01M7 4v3m10-3v3"/></svg>',
    Switch: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="m7 12 2-2m-2 2 2 2m8-2-2-2m2 2-2 2"/></svg>',
    Server: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5m-5 10h5"/></svg>',
    Workstation: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
    Printer: '<svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7zM17 11h.01"/></svg>',
    'Access Point': '<svg viewBox="0 0 24 24"><path d="M5 9a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0m-5 3a2 2 0 0 1 2 0M12 18h.01"/></svg>',
    Firewall: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="M8 11h8M12 7v8"/></svg>',
    Other: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4m0 4h.01"/></svg>'
  };

  const seedDevices = [
    {id:1,name:'HQ Edge Router',ip_address:'192.0.2.1',device_type:'Router',location:'HQ / Server Room',parent_id:null,status:'online',latency_ms:8.4,uptime:99.98,checked_at:ago(1),check_method:'both',ports:[22,80,443],open_ports:[80,443],detail:'Simulated ICMP and TCP checks',is_sample:1},
    {id:2,name:'Core Switch 01',ip_address:'192.0.2.2',device_type:'Switch',location:'HQ / Server Room',parent_id:1,status:'online',latency_ms:2.1,uptime:99.99,checked_at:ago(1),check_method:'icmp',ports:[],open_ports:[],detail:'Simulated ICMP check',is_sample:1},
    {id:3,name:'Distribution Switch 02',ip_address:'192.0.2.3',device_type:'Switch',location:'HQ / Floor 2',parent_id:2,status:'online',latency_ms:3.7,uptime:99.91,checked_at:ago(2),check_method:'icmp',ports:[],open_ports:[],detail:'Simulated ICMP check',is_sample:1},
    {id:4,name:'Directory Server',ip_address:'192.0.2.10',device_type:'Server',location:'HQ / Server Room',parent_id:2,status:'online',latency_ms:12.5,uptime:99.98,checked_at:ago(1),check_method:'both',ports:[53,88,389,443],open_ports:[53,443],detail:'Simulated ICMP and TCP checks',is_sample:1},
    {id:5,name:'ERP Application Server',ip_address:'192.0.2.20',device_type:'Server',location:'HQ / Server Room',parent_id:2,status:'online',latency_ms:246.8,uptime:98.72,checked_at:ago(1),check_method:'tcp',ports:[443,8443],open_ports:[443,8443],detail:'Elevated response time in sample data',is_sample:1},
    {id:6,name:'Backup Server',ip_address:'192.0.2.30',device_type:'Server',location:'Disaster Recovery Room',parent_id:2,status:'offline',latency_ms:null,uptime:96.42,checked_at:ago(3),check_method:'both',ports:[22,443],open_ports:[],detail:'Simulated timeout — demonstration data',is_sample:1},
    {id:7,name:'Finance Workstation',ip_address:'192.0.2.41',device_type:'Workstation',location:'HQ / Finance',parent_id:3,status:'online',latency_ms:17.6,uptime:99.74,checked_at:ago(2),check_method:'icmp',ports:[],open_ports:[],detail:'Simulated ICMP check',is_sample:1},
    {id:8,name:'Wireless Access Point 03',ip_address:'192.0.2.50',device_type:'Access Point',location:'HQ / Floor 2',parent_id:3,status:'online',latency_ms:5.8,uptime:99.94,checked_at:ago(1),check_method:'both',ports:[80,443],open_ports:[443],detail:'Simulated ICMP and TCP checks',is_sample:1},
    {id:9,name:'DMZ Firewall',ip_address:'192.0.2.254',device_type:'Firewall',location:'HQ / Network Edge',parent_id:1,status:'online',latency_ms:6.1,uptime:99.99,checked_at:ago(1),check_method:'both',ports:[443],open_ports:[443],detail:'Simulated ICMP and TCP checks',is_sample:1},
    {id:10,name:'HR Workstation 14',ip_address:'192.0.2.42',device_type:'Workstation',location:'HQ / Human Resources',parent_id:3,status:'online',latency_ms:24.2,uptime:99.86,checked_at:ago(1),check_method:'icmp',ports:[],open_ports:[],detail:'Simulated ICMP check',is_sample:1},
    {id:11,name:'Reception Printer',ip_address:'192.0.2.60',device_type:'Printer',location:'HQ / Reception',parent_id:3,status:'offline',latency_ms:null,uptime:97.15,checked_at:ago(8),check_method:'icmp',ports:[],open_ports:[],detail:'Simulated timeout — demonstration data',is_sample:1},
    {id:12,name:'Public Web Server',ip_address:'192.0.2.80',device_type:'Server',location:'DMZ / Rack 02',parent_id:9,status:'online',latency_ms:31.4,uptime:99.97,checked_at:ago(1),check_method:'tcp',ports:[80,443],open_ports:[80,443],detail:'Simulated TCP service checks',is_sample:1}
  ];

  const seedAlerts = [
    {id:1,device_id:6,device_name:'Backup Server',ip_address:'192.0.2.30',event_type:'device_down',severity:'critical',message:'Backup Server is not responding to monitoring checks.',created_at:ago(3),acknowledged:0},
    {id:2,device_id:5,device_name:'ERP Application Server',ip_address:'192.0.2.20',event_type:'high_latency',severity:'warning',message:'Response time reached 246.8 ms, above the 200 ms threshold.',created_at:ago(34),acknowledged:0},
    {id:3,device_id:11,device_name:'Reception Printer',ip_address:'192.0.2.60',event_type:'device_down',severity:'warning',message:'Reception Printer has missed its latest availability checks.',created_at:ago(55),acknowledged:0},
    {id:4,device_id:7,device_name:'Finance Workstation',ip_address:'192.0.2.41',event_type:'recovered',severity:'info',message:'Finance Workstation recovered after a short connectivity interruption.',created_at:ago(88),acknowledged:1},
    {id:5,device_id:9,device_name:'DMZ Firewall',ip_address:'192.0.2.254',event_type:'recovered',severity:'info',message:'DMZ Firewall is responding normally following a previous timeout.',created_at:ago(160),acknowledged:1}
  ];

  const state = {
    devices: structuredClone(seedDevices),
    alerts: structuredClone(seedAlerts),
    mode: 'demo', apiConnected: false, apiBase: '',
    currentPage: 'overview', activeDevice: null,
    deviceFilter: 'all', deviceTypeFilter: 'all', deviceSearch: '',
    alertFilter: 'all', alertSearch: '',
    latencyThreshold: 200,
    history: Array.from({length:24}, (_, i) => ({hour:i, latency:Math.round((25 + Math.sin(i * .62) * 9 + Math.cos(i * .24) * 5 + (i===11?48:0) + (i===12?26:0)) * 10) / 10}))
  };

  function toast(message, type = 'success') {
    const region = $('#toast-region');
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.innerHTML = `<span class="toast-icon">${type === 'error' ? '!' : type === 'warning' ? '!' : '✓'}</span><span>${escapeHTML(message)}</span>`;
    region.appendChild(element);
    setTimeout(() => element.remove(), 3600);
  }

  function statusClass(status) { return status === 'online' ? 'status-online' : status === 'offline' ? 'status-offline' : 'status-unknown'; }
  function statusLabel(status) { return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'; }
  function statusBadge(status) { return `<span class="status-badge ${statusClass(status)}"><i></i>${statusLabel(status)}</span>`; }
  function deviceIcon(type) { return icons[type] || icons.Other; }
  function deviceIconMarkup(device) { return `<span class="device-type-icon">${deviceIcon(device.device_type || device.type || 'Other')}</span>`; }
  function getDevice(id) { return state.devices.find(device => Number(device.id) === Number(id)); }
  function currentStats() {
    const total = state.devices.length;
    const online = state.devices.filter(d => d.status === 'online').length;
    const offline = state.devices.filter(d => d.status === 'offline').length;
    const unknown = total - online - offline;
    const values = state.devices.filter(d => d.status === 'online' && d.latency_ms != null).map(d => Number(d.latency_ms));
    const latency = values.length ? values.reduce((a,b) => a+b, 0) / values.length : null;
    const unack = state.alerts.filter(a => !Number(a.acknowledged)).length;
    return {total, online, offline, unknown, latency, unack};
  }

  function renderStats() {
    const s = currentStats();
    $('#stat-total').textContent = s.total;
    $('#stat-online').textContent = s.online;
    $('#stat-offline').textContent = s.offline;
    $('#stat-latency').textContent = number(s.latency, 1);
    $('#chart-current').innerHTML = `${number(s.latency, 1)} <small>ms</small>`;
    $('#stat-total-note').textContent = state.apiConnected ? 'Registered devices' : 'Across all locations';
    $('#stat-online-note').textContent = s.online ? '●  Healthy connectivity' : '●  No responding devices';
    $('#stat-offline-note').textContent = s.offline ? '●  Requires attention' : '●  No devices offline';
    $('#stat-latency-note').textContent = s.latency == null ? 'No response measurements' : 'Across responding devices';
    $('#donut-total').textContent = s.total;
    $('#health-online').textContent = s.online;
    $('#health-offline').textContent = s.offline;
    $('#health-unknown').textContent = s.unknown;
    const circumference = 395.84;
    const onlineLen = s.total ? circumference * s.online / s.total : 0;
    const offlineLen = s.total ? circumference * s.offline / s.total : 0;
    const unknownLen = s.total ? circumference * s.unknown / s.total : 0;
    $('#donut-online').setAttribute('stroke-dasharray', `${onlineLen} ${circumference-onlineLen}`);
    $('#donut-online').setAttribute('stroke-dashoffset', '0');
    $('#donut-offline').setAttribute('stroke-dasharray', `${offlineLen} ${circumference-offlineLen}`);
    $('#donut-offline').setAttribute('stroke-dashoffset', String(-onlineLen));
    $('#donut-unknown').setAttribute('stroke-dasharray', `${unknownLen} ${circumference-unknownLen}`);
    $('#donut-unknown').setAttribute('stroke-dashoffset', String(-(onlineLen+offlineLen)));
    $('#nav-device-count').textContent = s.total;
    $('#nav-alert-dot').style.display = s.unack ? 'block' : 'none';
    $('#notification-indicator').style.display = s.unack ? 'block' : 'none';
    $('#footer-mode').textContent = state.mode === 'live' ? 'Live monitoring environment' : 'Demo environment';
    $('#sidebar-status-title').textContent = state.mode === 'live' ? 'Live environment' : 'Demo environment';
    $('#sidebar-status-sub').textContent = state.apiConnected ? 'Local monitoring service' : 'Sample network data';
    $('#environment-label').textContent = state.mode === 'live' ? 'LIVE MONITORING' : 'DEMO MODE';
    $('#environment-pill').classList.toggle('live', state.mode === 'live');
    $('#demo-notice').classList.toggle('hidden', state.mode === 'live');
    $('#environment-pill .pulse-dot').style.background = state.mode === 'live' ? '#20ad73' : '#d9982d';
    $('#last-updated').textContent = fmtTime(now());
    $('#report-availability').textContent = s.total ? `${(100*s.online/s.total).toFixed(1)}%` : '—';
    $('#report-latency').textContent = s.latency == null ? '—' : `${number(s.latency,1)} ms`;
    $('#report-incidents').textContent = state.alerts.length;
  }

  function renderDeviceRow(device, compact = false) {
    const latency = device.latency_ms == null ? '—' : `${number(device.latency_ms)} ms`;
    const latencyClass = device.latency_ms == null ? 'latency-na' : Number(device.latency_ms) >= state.latencyThreshold ? 'latency-high' : 'latency-good';
    const type = device.device_type || device.type || 'Other';
    const uptime = device.uptime == null ? '—' : `${number(device.uptime,2)}%`;
    const checked = device.checked_at || device.last_checked;
    const actions = compact
      ? `<button class="table-action" data-detail="${device.id}" title="View device"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>`
      : `<div class="row-actions"><button class="row-action" data-check="${device.id}" title="Run check"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg></button><button class="row-action" data-detail="${device.id}" title="View details"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button><button class="row-action" data-delete="${device.id}" title="Remove device"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></svg></button></div>`;
    return `<tr>
      <td><div class="device-name-cell">${deviceIconMarkup(device)}<span class="device-name-copy"><strong>${escapeHTML(device.name)}</strong><small>${escapeHTML(type)}</small></span></div></td>
      ${compact ? '' : `<td>${escapeHTML(type)}</td>`}
      <td>${escapeHTML(device.ip_address)}</td>
      ${compact ? '' : `<td>${escapeHTML(device.location || '—')}</td>`}
      <td>${statusBadge(device.status)}</td>
      <td class="${latencyClass}">${latency}</td>
      ${compact ? `<td>${checked ? fmtTime(checked) : '—'}</td>` : `<td>${uptime}</td>`}
      <td>${actions}</td>
    </tr>`;
  }

  function renderDeviceTables() {
    const onlineFirst = [...state.devices].sort((a,b) => (a.status === 'offline') - (b.status === 'offline'));
    $('#overview-device-rows').innerHTML = onlineFirst.slice(0,6).map(d => renderDeviceRow(d,true)).join('') || '<tr><td colspan="6">No registered devices.</td></tr>';
    const query = state.deviceSearch.toLowerCase();
    const filtered = onlineFirst.filter(d => {
      const matchesStatus = state.deviceFilter === 'all' || d.status === state.deviceFilter;
      const matchesType = state.deviceTypeFilter === 'all' || d.device_type === state.deviceTypeFilter;
      const haystack = `${d.name} ${d.ip_address} ${d.location || ''} ${d.device_type}`.toLowerCase();
      return matchesStatus && matchesType && haystack.includes(query);
    });
    $('#all-device-rows').innerHTML = filtered.map(d => renderDeviceRow(d,false)).join('');
    $('#device-empty').classList.toggle('hidden', filtered.length > 0);
    $('#devices-table-count').textContent = `${filtered.length} device${filtered.length===1?'':'s'}`;
    $('#table-showing').textContent = `Showing ${filtered.length} of ${state.devices.length} devices`;
    $('#filter-all-count').textContent = state.devices.length;
    $('#filter-online-count').textContent = state.devices.filter(d => d.status==='online').length;
    $('#filter-offline-count').textContent = state.devices.filter(d => d.status==='offline').length;
    $('#device-type-filter').value = state.deviceTypeFilter;
    $$('#device-filters [data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === state.deviceFilter));
  }

  function alertSymbol(alert) {
    const type = alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info';
    const icon = type === 'critical' ? '<path d="M12 8v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z"/>' : type === 'warning' ? '<path d="M12 8v4m0 4h.01"/><circle cx="12" cy="12" r="9"/>' : '<path d="M12 11v5m0-8h.01"/><circle cx="12" cy="12" r="9"/>';
    return `<span class="alert-symbol ${type}"><svg viewBox="0 0 24 24">${icon}</svg></span>`;
  }

  function renderAlertItem(alert, full = false) {
    const isAck = Number(alert.acknowledged) === 1 || alert.acknowledged === true;
    const severity = alert.severity || 'info';
    const deviceName = alert.device_name || getDevice(alert.device_id)?.name || 'Network device';
    const address = alert.ip_address || getDevice(alert.device_id)?.ip_address || '';
    const time = alert.created_at ? new Date(alert.created_at) : now();
    const detail = full ? `<p class="alert-description">${escapeHTML(alert.message)}${address ? ` · ${escapeHTML(address)}` : ''}</p>` : `<p>${escapeHTML(alert.message)}</p>`;
    return `<div class="alert-item">
      ${alertSymbol(alert)}
      <div class="alert-copy"><strong>${escapeHTML(deviceName)}</strong>${detail}<div class="alert-meta"><span class="severity-label ${severity}">${severity}</span><span>·</span><span>${fmtTime(time)}</span>${full ? `<span>·</span><span>${time.toLocaleDateString()}</span>` : ''}</div></div>
      ${full ? `<div class="alert-actions">${isAck ? '<span class="acknowledged-tag">✓ Acknowledged</span>' : `<button class="ack-button" data-ack="${alert.id}">Acknowledge</button>`}</div>` : ''}
    </div>`;
  }

  function renderAlerts() {
    const recent = [...state.alerts].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0,4);
    $('#overview-alert-list').innerHTML = recent.map(a => renderAlertItem(a,false)).join('') || '<div class="empty-state">No recent alerts</div>';
    const search = state.alertSearch.toLowerCase();
    const filtered = [...state.alerts].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).filter(a => {
      const matches = state.alertFilter === 'all' || a.severity === state.alertFilter;
      return matches && `${a.message} ${a.device_name || ''} ${a.ip_address || ''}`.toLowerCase().includes(search);
    });
    $('#all-alert-list').innerHTML = filtered.map(a => renderAlertItem(a,true)).join('');
    $('#alerts-empty').classList.toggle('hidden', filtered.length > 0);
    $('#alerts-unack').textContent = state.alerts.filter(a => !Number(a.acknowledged)).length;
    $('#alerts-critical').textContent = state.alerts.filter(a => a.severity==='critical').length;
    $('#alerts-warning').textContent = state.alerts.filter(a => a.severity==='warning').length;
    $('#alerts-info').textContent = state.alerts.filter(a => a.severity==='info').length;
    $$('#alert-filters [data-alert-filter]').forEach(button => button.classList.toggle('active', button.dataset.alertFilter === state.alertFilter));
  }

  function renderReports() {
    const s = currentStats();
    const rows = [
      ['Online devices',s.online,'#20b77b'],['Offline devices',s.offline,'#e35c68'],['Unknown status',s.unknown,'#bbc5d1'],['Open alerts',s.unack,'#d99a35']
    ];
    $('#report-summary-rows').innerHTML = rows.map(([label,value,color]) => `<div class="summary-row"><span class="summary-color"><i style="background:${color}"></i>${label}</span><strong>${value}</strong></div>`).join('');
    $('#report-disclaimer').textContent = state.mode === 'demo'
      ? 'The dashboard is showing simulated demonstration data. Availability, latency and event values are illustrative and must not be treated as measurements of a production network. Switch to Live mode to collect checks from explicitly registered, authorised devices.'
      : 'This report is based on measurements recorded by the LANPulse service for the devices currently registered in Live mode. ICMP may be blocked by host firewalls; use TCP checks for a specific service when appropriate.';
  }

  function renderTopology() {
    const nodesRoot = $('#topology-nodes');
    const linesRoot = $('#topology-lines');
    const devices = state.devices;
    $('#topology-device-count').textContent = devices.length;
    $('#topology-empty').classList.toggle('hidden', devices.length > 0);
    if (!devices.length) { nodesRoot.innerHTML=''; linesRoot.innerHTML=''; return; }
    const levels = new Map();
    const getLevel = (d, seen = new Set()) => {
      if (!d.parent_id || seen.has(Number(d.id))) return 0;
      seen.add(Number(d.id));
      const parent = getDevice(d.parent_id);
      return parent ? Math.min(3, 1 + getLevel(parent, seen)) : 0;
    };
    devices.forEach(d => { const level = getLevel(d); if(!levels.has(level))levels.set(level,[]); levels.get(level).push(d); });
    const positions = new Map();
    const nodeWidth=150, canvasWidth=Math.max(900,nodesRoot.clientWidth || $('#topology-canvas').clientWidth || 900);
    const layerY=[35,165,295,425];
    for (const [level,items] of levels.entries()) {
      const gap = canvasWidth/(items.length+1);
      items.forEach((d,i) => positions.set(Number(d.id), {x:gap*(i+1)-nodeWidth/2,y:layerY[level] || 425}));
    }
    nodesRoot.innerHTML = devices.map(d => {
      const p=positions.get(Number(d.id)) || {x:20,y:20};
      return `<button class="topology-node" data-detail="${d.id}" style="left:${Math.max(8,p.x)}px;top:${p.y}px"><span class="node-status ${d.status || 'unknown'}"></span><span class="topology-node-head">${deviceIconMarkup(d)}<strong title="${escapeHTML(d.name)}">${escapeHTML(d.name)}</strong></span><small>${escapeHTML(d.ip_address)}</small></button>`;
    }).join('');
    const lineParts=[];
    devices.forEach(d => {
      if (!d.parent_id) return;
      const a=positions.get(Number(d.parent_id)), b=positions.get(Number(d.id));
      if(a&&b) lineParts.push(`<line x1="${a.x+nodeWidth/2}" y1="${a.y+76}" x2="${b.x+nodeWidth/2}" y2="${b.y}"/>`);
    });
    linesRoot.setAttribute('viewBox',`0 0 ${canvasWidth} 560`);
    linesRoot.innerHTML=lineParts.join('');
  }

  function drawCanvas(canvas, series, threshold = state.latencyThreshold) {
    if (!canvas) return;
    const rect=canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr=Math.max(1,window.devicePixelRatio||1);
    canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    const w=rect.width,h=rect.height,pad={l:31,r:10,t:12,b:15};
    ctx.clearRect(0,0,w,h);
    const values=series.map(x=>Number(x.latency)||0);
    const max=Math.max(80,threshold*1.18,...values);
    const min=0, plotW=w-pad.l-pad.r, plotH=h-pad.t-pad.b;
    ctx.font='9px DM Sans, sans-serif'; ctx.fillStyle='#a2adbb';ctx.strokeStyle='#edf1f5';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=pad.t+(plotH/4)*i;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
      const val=Math.round(max-(max/4)*i);ctx.fillText(String(val),1,y+3);
    }
    const thresholdY=pad.t+plotH-(threshold/max)*plotH;
    ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle='#e5b15f';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(pad.l,thresholdY);ctx.lineTo(w-pad.r,thresholdY);ctx.stroke();ctx.restore();
    if(values.length>1){
      const pts=values.map((v,i)=>({x:pad.l+(i/(values.length-1))*plotW,y:pad.t+plotH-(v/max)*plotH}));
      const gradient=ctx.createLinearGradient(0,pad.t,0,h);gradient.addColorStop(0,'rgba(62,117,240,.20)');gradient.addColorStop(1,'rgba(62,117,240,0)');
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,pad.t+plotH);ctx.lineTo(pts[0].x,pad.t+plotH);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#4779ef';ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
      const last=pts[pts.length-1];ctx.beginPath();ctx.arc(last.x,last.y,3.5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#4779ef';ctx.stroke();
    }
  }

  function renderAll() {
    renderStats();renderDeviceTables();renderAlerts();renderReports();renderTopology();
    requestAnimationFrame(() => { drawCanvas($('#latency-chart'),state.history);drawCanvas($('#report-chart'),state.history); });
  }

  function showPage(page) {
    if (!$('#page-'+page)) page='overview';
    state.currentPage=page;
    $$('.page-view').forEach(el=>el.classList.toggle('active',el.id==='page-'+page));
    $$('.nav-link[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===page));
    $('#breadcrumb-current').textContent=({overview:'Overview',devices:'Devices',topology:'Topology',alerts:'Alerts & events',reports:'Reports',settings:'Settings'})[page] || 'Overview';
    $('#sidebar').classList.remove('open');
    if(page==='topology') requestAnimationFrame(renderTopology);
    if(page==='reports') requestAnimationFrame(()=>drawCanvas($('#report-chart'),state.history));
  }

  function openModal(id) { $('#'+id).classList.remove('hidden'); document.body.style.overflow='hidden'; }
  function closeModals() { $$('.modal-backdrop').forEach(m=>m.classList.add('hidden'));document.body.style.overflow=''; }
  function updateParentOptions() {
    const select=$('#parent-device-select');
    const current=select.value;
    select.innerHTML='<option value="">No parent / top-level device</option>'+state.devices.map(d=>`<option value="${d.id}">${escapeHTML(d.name)} (${escapeHTML(d.ip_address)})</option>`).join('');
    if(current)select.value=current;
  }

  function isPrivateIPv4(value) {
    const parts=String(value).trim().split('.');
    if(parts.length!==4 || parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))return false;
    const [a,b]=parts.map(Number);
    return a===10 || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || a===127;
  }

  function addLocalDevice(payload) {
    const id=Math.max(0,...state.devices.map(d=>Number(d.id)||0))+1;
    const parent=payload.parent_id?Number(payload.parent_id):null;
    state.devices.push({...payload,id,parent_id:parent,status:'unknown',latency_ms:null,uptime:100,checked_at:new Date().toISOString(),open_ports:[],detail:'Awaiting first monitoring check',is_sample:0});
    toast('Device added to the demonstration workspace.');
    if(state.mode==='demo') runLocalCheck(id);
    renderAll();
  }

  function runLocalCheck(deviceId) {
    const target=getDevice(deviceId);if(!target)return;
    const prior=target.status;
    const failChance=target.device_type==='Printer'?.17:.055;
    const offline=Math.random()<failChance;
    target.status=offline?'offline':'online';
    target.latency_ms=offline?null:Number((5+Math.random()*54).toFixed(1));
    target.checked_at=new Date().toISOString();
    target.detail='Simulated demonstration check';
    if(target.check_method==='tcp'||target.check_method==='both')target.open_ports=offline?[]:(target.ports||[]).filter(()=>Math.random()>.35);
    else target.open_ports=[];
    if(prior!==target.status && target.status==='offline') addLocalAlert(target,'device_down','critical',`${target.name} became unreachable during the simulated check.`);
    if(prior==='offline'&&target.status==='online') addLocalAlert(target,'recovered','info',`${target.name} is responding again in the simulated environment.`);
    if(target.latency_ms!=null&&target.latency_ms>=state.latencyThreshold)addLocalAlert(target,'high_latency','warning',`${target.name} recorded ${target.latency_ms} ms, above the configured threshold.`);
    const points=state.history.slice(1);points.push({hour:24,latency:target.latency_ms||0});state.history=points;
  }

  function addLocalAlert(device,type,severity,message) {
    state.alerts.unshift({id:Math.max(0,...state.alerts.map(a=>Number(a.id)||0))+1,device_id:device.id,device_name:device.name,ip_address:device.ip_address,event_type:type,severity,message,created_at:new Date().toISOString(),acknowledged:0});
  }

  async function fetchJSON(path, options={}) {
    const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    let body={};try{body=await response.json();}catch(_){ }
    if(!response.ok)throw new Error(body.error||`Request failed (${response.status})`);
    return body;
  }

  function mapApiDevice(d) {
    return {...d,device_type:d.device_type||d.type||'Other',uptime:d.uptime??(d.status==='online'?99.7:96.2),checked_at:d.checked_at||d.last_checked,ports:d.ports||[],open_ports:d.open_ports||[],detail:d.detail||'Live monitoring result'};
  }
  function mapApiAlert(a) {
    return {...a,device_name:a.device_name||'Network device',created_at:a.created_at||new Date().toISOString(),acknowledged:Number(a.acknowledged)||0};
  }

  async function connectBackend() {
    try {
      const health=await fetchJSON('/api/health');
      if(!health.ok)return;
      state.apiConnected=true;state.apiBase='';
      const payload=await fetchJSON('/api/dashboard');
      state.mode=payload.mode||'demo';
      const selectedMode=$(`input[name=\"monitor-mode\"][value=\"${state.mode}\"]`);
      if(selectedMode)selectedMode.checked=true;
      state.devices=(payload.devices||[]).map(mapApiDevice);
      state.alerts=(payload.alerts||[]).map(mapApiAlert);
      if(Array.isArray(payload.history)&&payload.history.length){
        state.history=payload.history.slice(-24).map((x,i)=>({hour:i,latency:Number(x.avg_latency)||0}));
      }
      if(payload.threshold_ms)state.latencyThreshold=Number(payload.threshold_ms);
      $('#service-connection-text').textContent='Connected to local LANPulse Python service';
      $('#service-connection-badge').classList.remove('disconnected');$('#service-connection-badge').classList.add('connected');
      $('#service-connection-badge').innerHTML='<i></i>Connected';
      toast('Connected to the LANPulse monitoring service.');
      renderAll();
    } catch (_) {
      state.apiConnected=false;
      $('#service-connection-text').textContent='Standalone demo — no backend connected';
      $('#service-connection-badge').classList.remove('connected');$('#service-connection-badge').classList.add('disconnected');
      $('#service-connection-badge').innerHTML='<i></i>Not connected';
    }
  }

  async function reloadFromBackend() {
    const payload=await fetchJSON('/api/dashboard');
    state.mode=payload.mode||state.mode;
    const selectedMode=$(`input[name=\"monitor-mode\"][value=\"${state.mode}\"]`);
    if(selectedMode)selectedMode.checked=true;
    state.devices=(payload.devices||[]).map(mapApiDevice);
    state.alerts=(payload.alerts||[]).map(mapApiAlert);
    if(Array.isArray(payload.history)&&payload.history.length)state.history=payload.history.slice(-24).map((x,i)=>({hour:i,latency:Number(x.avg_latency)||0}));
    renderAll();
  }

  async function runChecks() {
    const button=$('#run-checks');
    button.disabled=true;button.querySelector('span').textContent='Checking…';
    try {
      if(state.apiConnected){await fetchJSON('/api/check-all',{method:'POST',body:'{}'});await reloadFromBackend();toast('Monitoring checks completed.');}
      else {
        state.devices.forEach(d=>runLocalCheck(d.id));
        state.devices.forEach(d=>{ if(d.checked_at==null)d.checked_at=new Date().toISOString(); });
        renderAll();toast('Demonstration checks completed. Results are simulated.','warning');
      }
    } catch(error){toast(error.message,'error');}
    finally{button.disabled=false;button.querySelector('span').textContent='Run checks';}
  }

  async function checkDevice(id) {
    try {
      if(state.apiConnected){await fetchJSON(`/api/devices/${id}/check`,{method:'POST',body:'{}'});await reloadFromBackend();}
      else {runLocalCheck(id);renderAll();}
      toast('Device check completed.');
    } catch(error){toast(error.message,'error');}
  }

  async function deleteDevice(id) {
    const device=getDevice(id);if(!device)return;
    if(!window.confirm(`Remove ${device.name} from LANPulse?`))return;
    try {
      if(state.apiConnected){await fetchJSON(`/api/devices/${id}`,{method:'DELETE'});await reloadFromBackend();}
      else {state.devices=state.devices.filter(d=>Number(d.id)!==Number(id));state.alerts=state.alerts.filter(a=>Number(a.device_id)!==Number(id));renderAll();}
      toast('Device removed.');
    } catch(error){toast(error.message,'error');}
  }

  async function acknowledge(id) {
    try {
      if(state.apiConnected){await fetchJSON(`/api/alerts/${id}/ack`,{method:'POST',body:'{}'});await reloadFromBackend();}
      else {const alert=state.alerts.find(a=>Number(a.id)===Number(id));if(alert)alert.acknowledged=1;renderAll();}
      toast('Alert acknowledged.');
    } catch(error){toast(error.message,'error');}
  }

  async function acknowledgeAll() {
    const pending=state.alerts.filter(a=>!Number(a.acknowledged));
    for(const alert of pending)await acknowledge(alert.id);
    if(!pending.length)toast('There are no unacknowledged alerts.','warning');
  }

  function downloadCSV() {
    if(state.apiConnected){window.location.href='/api/export.csv';return;}
    const columns=['Device','IP address','Type','Location','Status','Latency (ms)','Uptime (%)','Last checked','Check detail'];
    const rows=state.devices.map(d=>[d.name,d.ip_address,d.device_type,d.location,d.status,d.latency_ms??'',d.uptime??'',d.checked_at??'',d.detail??'']);
    const csv=[columns,...rows].map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='lanpulse-network-report.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    toast('CSV report exported.');
  }

  function openDetails(id) {
    const device=getDevice(id);if(!device)return;
    state.activeDevice=Number(id);
    $('#detail-title').textContent=device.name;
    $('#detail-subtitle').textContent=`${device.device_type} · ${device.ip_address}`;
    const portList=(device.open_ports||[]).length?(device.open_ports||[]).join(', '):'No TCP ports confirmed open';
    const detailHistory=[
      ['Latest status',statusLabel(device.status)],['Response time',device.latency_ms==null?'No response':`${number(device.latency_ms)} ms`],['Location',device.location||'Not specified'],['Uptime estimate',device.uptime==null?'Not available':`${number(device.uptime,2)}%`],['Monitoring method',(device.check_method||'both').toUpperCase()],['Last checked',device.checked_at?new Date(device.checked_at).toLocaleString():'Not checked'],['TCP ports configured',(device.ports||[]).join(', ')||'None'],['Open TCP ports',portList]
    ];
    $('#detail-content').innerHTML=detailHistory.map(([label,value])=>`<div class="detail-tile"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join('')+`<div class="detail-section-title">Latest check information</div><div class="detail-check-list"><div class="detail-check-row"><span>Check result</span><strong>${escapeHTML(device.detail||'No check detail available')}</strong></div><div class="detail-check-row"><span>Data source</span><strong>${state.mode==='demo'?'Simulated demonstration data':'Live monitoring service'}</strong></div></div>`;
    $('#detail-check').onclick=()=>{closeModals();checkDevice(id);};
    openModal('detail-modal');
  }

  async function saveMode() {
    const selected=$('input[name="monitor-mode"]:checked').value;
    const status=$('#mode-save-status');
    try {
      if(state.apiConnected){await fetchJSON('/api/mode',{method:'POST',body:JSON.stringify({mode:selected})});await reloadFromBackend();}
      else if(selected==='live'){
        status.textContent='Start the Python service to enable live monitoring.';
        status.style.color='#c17b27';
        const demoRadio=$('input[name=\"monitor-mode\"][value=\"demo\"]');if(demoRadio)demoRadio.checked=true;
        toast('Live monitoring requires the Python backend. Run run_windows.bat or run_kali.sh.','warning');return;
      } else {state.mode='demo';renderAll();}
      status.textContent='Monitoring mode saved.';status.style.color='#169b68';
      toast(selected==='live'?'Live monitoring enabled.':'Demonstration mode enabled.');
    } catch(error){status.textContent=error.message;status.style.color='#d65360';toast(error.message,'error');}
  }

  function submitDevice(event) {
    event.preventDefault();
    const form=event.currentTarget;const formData=new FormData(form);
    const payload=Object.fromEntries(formData.entries());
    payload.name=payload.name.trim();payload.ip_address=payload.ip_address.trim();payload.ports=(payload.ports||'').split(',').map(s=>s.trim()).filter(Boolean).map(Number);payload.parent_id=payload.parent_id?Number(payload.parent_id):null;
    if(!isPrivateIPv4(payload.ip_address)){toast('Enter an authorised private IPv4 address (10.x, 172.16–31.x, 192.168.x or 127.x).','error');return;}
    if(payload.ports.some(port=>!Number.isInteger(port)||port<1||port>65535)||payload.ports.length>20){toast('Enter up to 20 valid TCP ports (1–65535).','error');return;}
    if(state.devices.some(d=>d.ip_address===payload.ip_address)){toast('That IP address is already registered.','error');return;}
    if(payload.check_method==='icmp')payload.ports=[];
    const saveButton=$('#save-device-button');saveButton.disabled=true;saveButton.textContent='Adding…';
    (async()=>{
      try{
        if(state.apiConnected){await fetchJSON('/api/devices',{method:'POST',body:JSON.stringify(payload)});await reloadFromBackend();toast('Device registered.');}
        else addLocalDevice(payload);
        closeModals();form.reset();form.elements.ports.value='80,443';updateParentOptions();
      }catch(error){toast(error.message,'error');}
      finally{saveButton.disabled=false;saveButton.textContent='Add device';}
    })();
  }

  function bindEvents() {
    $$('.nav-link[data-page]').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.page)));
    $$('[data-page-link]').forEach(button=>button.addEventListener('click',()=>showPage(button.dataset.pageLink)));
    $$('[data-open-settings]').forEach(button=>button.addEventListener('click',()=>showPage('settings')));
    $('#header-alerts').addEventListener('click',()=>showPage('alerts'));
    $('#mobile-menu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
    $('#run-checks').addEventListener('click',runChecks);
    $('#export-overview').addEventListener('click',downloadCSV);$('#devices-export').addEventListener('click',downloadCSV);$('#reports-export').addEventListener('click',downloadCSV);
    $('#add-device').addEventListener('click',()=>{updateParentOptions();openModal('device-modal');});
    $('#device-form').addEventListener('submit',submitDevice);
    $('#device-search').addEventListener('input',event=>{state.deviceSearch=event.target.value;renderDeviceTables();});
    $('#device-type-filter').addEventListener('change',event=>{state.deviceTypeFilter=event.target.value;renderDeviceTables();});
    $('#device-filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;state.deviceFilter=button.dataset.filter;renderDeviceTables();});
    $('#alert-search').addEventListener('input',event=>{state.alertSearch=event.target.value;renderAlerts();});
    $('#alert-filters').addEventListener('click',event=>{const button=event.target.closest('[data-alert-filter]');if(!button)return;state.alertFilter=button.dataset.alertFilter;renderAlerts();});
    $('#all-device-rows').addEventListener('click',event=>{const button=event.target.closest('[data-check],[data-detail],[data-delete]');if(!button)return;if(button.dataset.check)checkDevice(button.dataset.check);if(button.dataset.detail)openDetails(button.dataset.detail);if(button.dataset.delete)deleteDevice(button.dataset.delete);});
    $('#overview-device-rows').addEventListener('click',event=>{const button=event.target.closest('[data-detail]');if(button)openDetails(button.dataset.detail);});
    $('#topology-nodes').addEventListener('click',event=>{const button=event.target.closest('[data-detail]');if(button)openDetails(button.dataset.detail);});
    $('#all-alert-list').addEventListener('click',event=>{const button=event.target.closest('[data-ack]');if(button)acknowledge(button.dataset.ack);});
    $('#ack-all').addEventListener('click',acknowledgeAll);
    $('#topology-refresh').addEventListener('click',()=>{renderTopology();toast('Network map refreshed.');});
    $('#save-mode').addEventListener('click',saveMode);
    $('#latency-threshold').addEventListener('change',event=>{state.latencyThreshold=Math.max(10,Math.min(5000,Number(event.target.value)||200));renderAll();toast('Visual latency threshold updated.');});
    $$('.settings-tab').forEach(button=>button.addEventListener('click',()=>{
      $$('.settings-tab').forEach(b=>b.classList.toggle('active',b===button));
      $$('.settings-section').forEach(s=>s.classList.toggle('active',s.id==='settings-'+button.dataset.settingsTab));
    }));
    $('#form-check-method').addEventListener('change',event=>$('#ports-field').classList.toggle('hidden',event.target.value==='icmp'));
    $$('[data-close-modal]').forEach(button=>button.addEventListener('click',closeModals));
    $$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModals();}));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModals();});
    window.addEventListener('resize',()=>{drawCanvas($('#latency-chart'),state.history);if(state.currentPage==='reports')drawCanvas($('#report-chart'),state.history);if(state.currentPage==='topology')renderTopology();});
  }

  async function init() {
    bindEvents();renderAll();
    try {
      const savedThreshold=Number(localStorage.getItem('lanpulse-threshold'));
      if(savedThreshold>=10&&savedThreshold<=5000){state.latencyThreshold=savedThreshold;$('#latency-threshold').value=savedThreshold;}
      $('#latency-threshold').addEventListener('change',()=>localStorage.setItem('lanpulse-threshold',String(state.latencyThreshold)));
    } catch (_) { /* Storage may be disabled in some local-file contexts. */ }
    await connectBackend();
    updateParentOptions();
    setInterval(()=>{
      if(state.apiConnected){reloadFromBackend().catch(()=>{});}
      else if(state.mode==='demo'){
        // A light-touch demo refresh changes only the sample latency values; all values remain labelled as simulated.
        state.devices.filter(d=>d.status==='online').forEach(d=>{if(d.latency_ms!=null)d.latency_ms=Math.max(1,Number((d.latency_ms+(Math.random()-.5)*2).toFixed(1)));});
        renderStats();
      }
    },30000);
  }

  document.addEventListener('DOMContentLoaded',init);
})();
