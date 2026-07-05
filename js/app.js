import {
  openDb, seedIfEmpty, getAll, put, remove, uid,
  assumptionStatus, daysSince, getMeta, setMeta, exportAll, importAll,
} from './db.js';
import { RESEARCH_META, GAP_FINDINGS, MARKET_WHITESPACE, IMPACT_MODEL } from './research.js';
import { computeOrgHealth, alignmentGaps, cascadeRisk, driftRadar, pillarHealth } from './analysis.js';
import { renderGraphSvg } from './graph.js';
import { randomPremortem, randomBlindSpot } from './prompts.js';
import { buildBoardBrief } from './export.js';
import { checkHealth, ai, signals as signalApi } from './api.js';

const CATEGORIES = ['market', 'customer', 'technology', 'regulatory', 'people', 'financial', 'operations'];

let state = {
  assumptions: [],
  decisions: [],
  signals: [],
  pillars: [],
  premortems: [],
  teams: [],
  orgName: 'Demo Organization',
  currentView: 'setup',
  filterCategory: '',
  premortemPrompt: randomPremortem(),
  blindSpotPrompt: randomBlindSpot(),
  apiHealth: null,
  aiAnalysis: null,
  aiLoading: false,
};

const $ = (sel) => document.querySelector(sel);
const views = {};
document.querySelectorAll('[data-view]').forEach((btn) => {
  const v = btn.dataset.view;
  if (btn.classList.contains('nav-btn')) views[v] = $(`#view-${v}`);
});

const subtitles = {
  setup: 'Clone, copy .env.example → .env, plug in 3 API keys, npm run dev',
  command: 'Organizational assumption health at a glance',
  research: 'Why corporations need a strategic ground truth layer',
  pillars: 'Strategic bets and the assumptions they stand on',
  assumptions: 'Beliefs your strategy, KPIs, and decisions depend on',
  graph: 'How assumptions depend on and contradict each other',
  signals: 'Contradicting evidence linked to specific beliefs',
  decisions: 'Major calls — traced to the assumptions that had to be true',
  premortem: 'Imagine failure before it happens; log the beliefs that break',
  alignment: 'Where teams disagree on what must be true',
  export: 'Board-ready brief — assumption health, not vanity metrics',
};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2800);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function confidenceDots(n) {
  return `<span class="confidence">${[1, 2, 3, 4, 5].map((i) =>
    `<span class="${i <= n ? 'on' : ''}"></span>`).join('')}</span>`;
}

function badgeFor(a) {
  const st = assumptionStatus(a);
  return `<span class="badge badge-${st}">${st}</span>`;
}

function assumptionCard(a, { showActions = true, compact = false } = {}) {
  const st = assumptionStatus(a);
  const days = a.lastValidated ? `${Math.floor(daysSince(a.lastValidated))}d ago` : 'never';
  const crit = a.criticality ? `crit ${a.criticality}/5` : '';
  return `
    <article class="card" data-id="${a.id}">
      <div class="card-head">
        <div class="card-title">${esc(a.statement)}</div>
        ${badgeFor(a)}
      </div>
      <div class="card-meta">
        <span>${esc(a.category)}</span>
        <span>${esc(a.owner || 'no owner')}</span>
        ${!compact ? `<span>confidence ${confidenceDots(a.confidence)}</span>` : ''}
        ${crit ? `<span>${crit}</span>` : ''}
        <span>validated: ${days}</span>
      </div>
      ${!compact && a.evidence ? `<div class="insight">Evidence: ${esc(a.evidence)}</div>` : ''}
      ${!compact && a.notes ? `<div class="insight">${esc(a.notes)}</div>` : ''}
      ${showActions ? `
      <div class="card-actions">
        <button class="btn btn-sm btn-ghost" data-action="validate" data-id="${a.id}">Validate today</button>
        <button class="btn btn-sm btn-ghost" data-action="invalidate" data-id="${a.id}">Invalidate</button>
        <button class="btn btn-sm btn-ghost" data-action="edit-assumption" data-id="${a.id}">Edit</button>
        <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-assumption" data-id="${a.id}">Delete</button>
      </div>` : ''}
    </article>`;
}

async function reload() {
  await openDb();
  state.assumptions = await getAll('assumptions');
  state.decisions = await getAll('decisions');
  state.signals = await getAll('signals');
  state.pillars = await getAll('pillars');
  state.premortems = await getAll('premortems');
  state.teams = await getAll('teams');
  state.orgName = (await getMeta('orgName')) || 'Organization';
  updateHealthPill();
  render();
}

function updateHealthPill() {
  const h = computeOrgHealth(state.assumptions, state.signals, state.decisions);
  const pill = $('#org-health-pill');
  pill.textContent = `Health ${h.score}/100 · ${h.grade}`;
  pill.className = 'health-pill ' + (h.score >= 80 ? 'good' : h.score >= 50 ? 'warn' : 'bad');
}

function switchView(name) {
  state.currentView = name;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  Object.entries(views).forEach(([k, el]) => el?.classList.toggle('active', k === name));
  $('#view-title').textContent = name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
  const titles = {
    setup: 'Setup', command: 'Command Center', research: 'Research Thesis', pillars: 'Strategy Pillars',
    assumptions: 'Assumptions', graph: 'Dependency Graph', signals: 'Signal Feed',
    decisions: 'Decision Trace', premortem: 'Premortem Lab', alignment: 'Alignment Matrix', export: 'Board Brief',
  };
  $('#view-title').textContent = titles[name] || name;
  $('#view-subtitle').textContent = subtitles[name] || '';
  render();
}

function orgContext() {
  return {
    orgName: state.orgName,
    assumptions: state.assumptions,
    decisions: state.decisions,
    signals: state.signals,
    pillars: state.pillars,
    premortems: state.premortems,
    teams: state.teams,
  };
}

function apiStatusBadge(ok, label) {
  return `<span class="badge badge-${ok ? 'low' : 'high'}">${ok ? '✓' : '○'} ${label}</span>`;
}

function renderSetup() {
  const h = state.apiHealth;
  const apis = h?.apis || {};
  const offline = h?.status === 'offline';

  views.setup.innerHTML = `
    <div class="research-hero">
      <h2>Clone → Configure → Run</h2>
      <p>Like MiroFish: copy <code>.env.example</code> to <code>.env</code>, add your keys, run <code>npm run dev</code>.</p>
    </div>

    <div class="grid-3" style="margin-bottom:1.25rem">
      <div class="stat-card">
        <div class="label">Backend</div>
        <div class="value" style="font-size:1.25rem;color:${offline ? 'var(--danger)' : 'var(--success)'}">${offline ? 'Offline' : 'Online'}</div>
        <div class="sub">${esc(h?.message || 'Checking…')}</div>
      </div>
      <div class="stat-card">
        <div class="label">AI (LLM)</div>
        <div class="value" style="font-size:1.25rem">${apis.llm ? 'Ready' : '—'}</div>
        <div class="sub">${apis.model || 'Add LLM_API_KEY'}</div>
      </div>
      <div class="stat-card">
        <div class="label">Web scan</div>
        <div class="value" style="font-size:1.25rem">${apis.search_ready ? 'Ready' : '—'}</div>
        <div class="sub">Tavily + Serper</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <div class="card-title" style="margin-bottom:0.75rem">API status</div>
      <div class="card-meta" style="gap:0.5rem">
        ${apiStatusBadge(apis.llm, 'LLM_API_KEY')}
        ${apiStatusBadge(apis.tavily, 'TAVILY_API_KEY')}
        ${apiStatusBadge(apis.serper, 'SERPER_API_KEY')}
      </div>
      <div class="insight" style="margin-top:0.75rem">
        <strong>Get keys:</strong>
        <a href="https://console.groq.com/" target="_blank" rel="noopener">Groq (LLM)</a> ·
        <a href="https://tavily.com/" target="_blank" rel="noopener">Tavily (search)</a> ·
        <a href="https://serper.dev/" target="_blank" rel="noopener">Serper (Google)</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:0.75rem">Quick start</div>
      <pre class="export-preview" style="max-height:none;font-size:0.75rem">git clone https://github.com/Sunradiance/stratum.git
cd stratum
cp .env.example .env
# edit .env — add LLM_API_KEY, TAVILY_API_KEY, SERPER_API_KEY
npm run setup
npm run dev
# open http://localhost:8791</pre>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-action="refresh-health">Refresh status</button>
      </div>
    </div>

    <h3 class="section-title">What each API unlocks</h3>
    <div class="grid-3">
      <div class="card"><div class="card-title">LLM</div><div class="insight">AI premortems, blind spots, org analysis, brief enhancement, assumption extraction from strategy docs</div></div>
      <div class="card"><div class="card-title">Tavily</div><div class="insight">Live web signal scanning — find contradicting evidence for your assumptions</div></div>
      <div class="card"><div class="card-title">Serper</div><div class="insight">Supplementary Google search for richer market intel</div></div>
    </div>
  `;
}

function render() {
  const fns = {
    setup: renderSetup,
    command: renderCommand,
    research: renderResearch,
    pillars: renderPillars,
    assumptions: renderAssumptions,
    graph: renderGraph,
    signals: renderSignals,
    decisions: renderDecisions,
    premortem: renderPremortem,
    alignment: renderAlignment,
    export: renderExport,
  };
  (fns[state.currentView] || renderCommand)();
}

function renderCommand() {
  const h = computeOrgHealth(state.assumptions, state.signals, state.decisions);
  const drift = driftRadar(state.assumptions, state.signals).slice(0, 5);
  const cascades = cascadeRisk(state.assumptions).slice(0, 3);
  const pHealth = pillarHealth(state.pillars, state.assumptions);

  const meterClass = h.score >= 80 ? 'good' : h.score >= 50 ? 'warn' : 'bad';

  const aiBlock = state.aiAnalysis ? `
    <div class="card" style="margin-bottom:1.25rem;border-color:var(--accent)">
      <div class="card-title">AI analysis</div>
      <div class="insight">${esc(state.aiAnalysis.summary || '')}</div>
      ${(state.aiAnalysis.topRisks || []).map((r) => `<div class="insight"><strong>${esc(r.title)}</strong> — ${esc(r.detail)}</div>`).join('')}
      ${(state.aiAnalysis.recommendedActions || []).length ? `<div class="card-meta" style="margin-top:0.5rem">Actions: ${state.aiAnalysis.recommendedActions.map((a) => esc(a)).join(' · ')}</div>` : ''}
    </div>` : '';

  views.command.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-primary" data-action="ai-analyze" ${state.aiLoading ? 'disabled' : ''}>✦ AI analyze org</button>
      <button class="btn btn-ghost" data-action="extract-strategy">Extract assumptions from text</button>
    </div>
    ${aiBlock}
    <div class="grid-4">
      <div class="stat-card">
        <div class="label">Assumption health</div>
        <div class="value" style="color: var(--accent)">${h.score}</div>
        <div class="sub">${h.grade}</div>
        <div class="meter"><div class="meter-fill ${meterClass}" style="width:${h.score}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="label">Active assumptions</div>
        <div class="value">${state.assumptions.filter((a) => a.status !== 'invalidated').length}</div>
        <div class="sub">${h.stale.length} stale · ${h.untested.length} untested</div>
      </div>
      <div class="stat-card">
        <div class="label">Open signals</div>
        <div class="value">${h.openSignals.length}</div>
        <div class="sub">${h.openSignals.filter((s) => s.severity === 'high').length} high severity</div>
      </div>
      <div class="stat-card">
        <div class="label">Risky decisions</div>
        <div class="value">${h.riskyDecisions.length}</div>
        <div class="sub">Pending calls on shaky beliefs</div>
      </div>
    </div>

    <h3 class="section-title">Drift radar — assumptions moving away from truth</h3>
    <div class="grid-2">
      ${drift.length ? drift.map((d) => `
        <div class="card">
          <div class="card-head">
            <div class="card-title">${esc(d.assumption.statement.slice(0, 100))}${d.assumption.statement.length > 100 ? '…' : ''}</div>
            <span class="badge badge-${d.drift > 60 ? 'high' : d.drift > 35 ? 'medium' : 'low'}">${d.drift}% drift</span>
          </div>
          <div class="card-meta">
            <span>${d.status}</span>
            <span>${d.signals.length} contradicting signal(s)</span>
          </div>
        </div>
      `).join('') : '<div class="empty">No drift detected yet.</div>'}
    </div>

    ${cascades.length ? `
    <h3 class="section-title">Cascade risk</h3>
    <div class="grid-2">
      ${cascades.map((c) => `
        <div class="card">
          <div class="card-title">Root [${c.rootStatus}]: ${esc(c.root.statement.slice(0, 80))}…</div>
          <div class="insight">${c.dependents.length} dependent assumption(s) — blast radius ${c.blastRadius}</div>
        </div>
      `).join('')}
    </div>` : ''}

    ${pHealth.length ? `
    <h3 class="section-title">Strategy pillar health</h3>
    <div class="grid-3">
      ${pHealth.map((ph) => {
        const mc = ph.health >= 80 ? 'good' : ph.health >= 50 ? 'warn' : 'bad';
        return `
        <div class="card">
          <div class="card-title">${esc(ph.pillar.name)}</div>
          <div class="pillar-bar">
            <div class="meter"><div class="meter-fill ${mc}" style="width:${ph.health}%"></div></div>
            <span class="mono">${ph.health}%</span>
          </div>
          <div class="card-meta"><span>${ph.linked.length} linked</span><span>${ph.stale.length} at risk</span></div>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;
}

function renderResearch() {
  views.research.innerHTML = `
    <div class="research-hero">
      <h2>${esc(RESEARCH_META.title)}</h2>
      <p>${esc(RESEARCH_META.subtitle)} · Compiled ${RESEARCH_META.compiled}</p>
      <p style="margin-top:0.75rem;font-size:0.82rem;font-style:italic">${esc(RESEARCH_META.disclaimer)}</p>
    </div>

    <h3 class="section-title">Six systemic gaps (aggregate enterprise research)</h3>
    ${GAP_FINDINGS.map((g) => `
      <div class="card gap-card">
        <div class="card-head">
          <div class="card-title">${esc(g.gap)}</div>
          <span class="severity">severity ${g.severity}/100</span>
        </div>
        <div class="insight"><strong>Cost / scale:</strong> ${esc(g.cost)}</div>
        <div class="insight">${esc(g.insight)}</div>
        <ul class="evidence-list">
          ${g.evidence.map((e) => `<li><strong>${esc(e.source)}</strong> — ${esc(e.stat)} ${esc(e.note)}</li>`).join('')}
        </ul>
        <div class="insight" style="border-left: 3px solid var(--accent); margin-top:0.75rem">
          <strong>Stratum addresses:</strong> ${esc(g.stratumSolves)}
        </div>
      </div>
    `).join('')}

    <h3 class="section-title">Market whitespace</h3>
    <div class="card">
      <p style="margin-bottom:1rem;color:var(--text-muted)">${esc(MARKET_WHITESPACE.thesis)}</p>
      <div class="whitespace">
        <div class="whitespace-col tracked">
          <h4>What corporations track</h4>
          <ul>${MARKET_WHITESPACE.tracked.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <div class="whitespace-col gap">
          <h4>What they don't track (the gap)</h4>
          <ul>${MARKET_WHITESPACE.notTracked.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <h3 class="section-title">Impact model (conservative)</h3>
    <div class="grid-2">
      ${IMPACT_MODEL.map((m) => `
        <div class="card">
          <div class="card-title">${esc(m.label)}</div>
          <div class="card-meta"><span>${esc(m.range)}</span></div>
          <div class="insight">${esc(m.basis)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderPillars() {
  const ph = pillarHealth(state.pillars, state.assumptions);
  views.pillars.innerHTML = `
    <div style="margin-bottom:1rem">
      <button class="btn btn-primary" data-action="new-pillar">+ Strategy pillar</button>
    </div>
    ${ph.length ? ph.map((p) => {
      const mc = p.health >= 80 ? 'good' : p.health >= 50 ? 'warn' : 'bad';
      return `
      <div class="card" style="margin-bottom:1rem" data-pillar-id="${p.pillar.id}">
        <div class="card-head">
          <div>
            <div class="card-title">${esc(p.pillar.name)}</div>
            <div class="card-meta"><span>${esc(p.pillar.status)}</span><span>${esc(p.pillar.owner || '')}</span></div>
          </div>
          <span class="badge badge-${p.health >= 80 ? 'low' : p.health >= 50 ? 'medium' : 'high'}">${p.health}%</span>
        </div>
        ${p.pillar.description ? `<div class="insight">${esc(p.pillar.description)}</div>` : ''}
        <div class="pillar-bar"><div class="meter"><div class="meter-fill ${mc}" style="width:${p.health}%"></div></div></div>
        <h4 style="margin-top:1rem;font-size:0.85rem;color:var(--text-muted)">Linked assumptions (${p.linked.length})</h4>
        ${p.linked.length ? p.linked.map((a) => assumptionCard(a, { showActions: false, compact: true })).join('') : '<div class="insight">No assumptions linked yet.</div>'}
        <div class="card-actions">
          <button class="btn btn-sm btn-ghost" data-action="edit-pillar" data-id="${p.pillar.id}">Edit</button>
          <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-pillar" data-id="${p.pillar.id}">Delete</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty">No strategy pillars yet.</div>'}
  `;
}

function renderAssumptions() {
  let list = state.assumptions;
  if (state.filterCategory) list = list.filter((a) => a.category === state.filterCategory);

  views.assumptions.innerHTML = `
    <div class="filter-bar">
      <select id="filter-category">
        <option value="">All categories</option>
        ${CATEGORIES.map((c) => `<option value="${c}" ${state.filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" data-action="new-assumption">+ New assumption</button>
    </div>
    ${list.length ? list.map((a) => assumptionCard(a)).join('') : '<div class="empty">No assumptions match filter.</div>'}
  `;

  $('#filter-category')?.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    renderAssumptions();
  });
}

function renderGraph() {
  const active = state.assumptions.filter((a) => a.status !== 'invalidated');
  views.graph.innerHTML = active.length ? `
    <p class="insight" style="margin-bottom:1rem">Solid lines = depends on · Dashed red = contradicts · Node size = criticality</p>
    <div class="graph-wrap">${renderGraphSvg(state.assumptions, { statusFn: assumptionStatus })}</div>
  ` : '<div class="empty">Add assumptions to see the dependency graph.</div>';
}

function renderSignals() {
  views.signals.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-primary" data-action="new-signal">+ Log signal</button>
      <button class="btn btn-ghost" data-action="scan-web-signals" ${state.aiLoading ? 'disabled' : ''}>✦ Scan web for signals</button>
    </div>
    ${state.signals.length ? state.signals.map((s) => {
      const linked = (s.assumptionIds || []).map((id) => state.assumptions.find((a) => a.id === id)).filter(Boolean);
      return `
      <div class="card" style="margin-bottom:0.85rem">
        <div class="card-head">
          <div class="card-title">${esc(s.title)}</div>
          <span class="badge badge-${s.severity === 'high' ? 'high' : s.severity === 'medium' ? 'medium' : 'low'}">${esc(s.severity)}</span>
        </div>
        <div class="card-meta">
          <span>${esc(s.source)}</span>
          <span>${s.direction}</span>
          <span>${s.status}</span>
          <span>${s.date?.slice(0, 10) || ''}</span>
        </div>
        <div class="insight">${esc(s.summary)}</div>
        ${linked.length ? `<div class="insight">Linked: ${linked.map((a) => esc(a.statement.slice(0, 50))).join(' · ')}</div>` : ''}
        <div class="card-actions">
          ${s.status === 'open' ? `<button class="btn btn-sm btn-ghost" data-action="resolve-signal" data-id="${s.id}">Resolve</button>` : ''}
          <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-signal" data-id="${s.id}">Delete</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty">No signals logged. Contradicting evidence is how assumptions die — capture it early.</div>'}
  `;
}

function renderDecisions() {
  views.decisions.innerHTML = `
    <div style="margin-bottom:1rem"><button class="btn btn-primary" data-action="new-decision">+ Log decision</button></div>
    ${state.decisions.length ? state.decisions.map((d) => {
      const linked = (d.assumptionIds || []).map((id) => state.assumptions.find((a) => a.id === id)).filter(Boolean);
      const risky = linked.some((a) => {
        const st = assumptionStatus(a);
        return st === 'stale' || st === 'untested';
      });
      return `
      <div class="card" style="margin-bottom:0.85rem">
        <div class="card-head">
          <div class="card-title">${esc(d.title)}</div>
          ${risky ? '<span class="badge badge-high">shaky ground</span>' : '<span class="badge badge-low">grounded</span>'}
        </div>
        <div class="card-meta">
          <span>${esc(d.owner || '')}</span>
          <span>${d.date?.slice(0, 10) || ''}</span>
          <span>outcome: ${esc(d.outcome)}</span>
        </div>
        ${d.rationale ? `<div class="insight">${esc(d.rationale)}</div>` : ''}
        ${linked.length ? `<div class="insight">Depends on: ${linked.map((a) => `[${assumptionStatus(a)}] ${esc(a.statement.slice(0, 60))}`).join('<br>')}</div>` : ''}
        <div class="card-actions">
          <button class="btn btn-sm btn-ghost" data-action="edit-decision" data-id="${d.id}">Edit</button>
          <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-decision" data-id="${d.id}">Delete</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty">No decisions traced yet.</div>'}
  `;
}

function renderPremortem() {
  views.premortem.innerHTML = `
    <div class="premortem-prompt">${esc(state.premortemPrompt)}</div>
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-ghost" data-action="new-premortem-prompt">New prompt</button>
      <button class="btn btn-primary" data-action="ai-premortem" ${state.aiLoading ? 'disabled' : ''}>✦ AI generate premortem</button>
      <button class="btn btn-ghost" data-action="new-premortem">+ Log manually</button>
    </div>
    ${state.premortems.length ? state.premortems.map((p) => {
      const linked = (p.assumptionIds || []).map((id) => state.assumptions.find((a) => a.id === id)).filter(Boolean);
      return `
      <div class="card" style="margin-bottom:0.85rem">
        <div class="card-title">${esc(p.title)}</div>
        <div class="insight"><strong>Scenario:</strong> ${esc(p.scenario)}</div>
        <div class="insight"><strong>Failure mode:</strong> ${esc(p.failureMode)}</div>
        ${p.mitigation ? `<div class="insight"><strong>Mitigation:</strong> ${esc(p.mitigation)}</div>` : ''}
        ${linked.length ? `<div class="card-meta" style="margin-top:0.5rem">Linked assumptions: ${linked.length}</div>` : ''}
        <div class="card-actions">
          <button class="btn btn-sm btn-ghost" data-action="edit-premortem" data-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-ghost btn-danger" data-action="delete-premortem" data-id="${p.id}">Delete</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty">No premortems yet. HBR shows premortems improve outcomes — Stratum institutionalizes them.</div>'}
  `;
}

function renderAlignment() {
  const gaps = alignmentGaps(state.assumptions, state.teams);
  views.alignment.innerHTML = `
    <p class="insight" style="margin-bottom:1rem">Spread ≥ 2 means teams hold materially different confidence in the same strategic belief.</p>
    ${gaps.length ? `
    <table class="alignment-table">
      <thead><tr><th>Assumption</th><th>Spread</th><th>Team views</th></tr></thead>
      <tbody>
        ${gaps.map((g) => `
          <tr>
            <td>${esc(g.assumption.statement.slice(0, 90))}${g.assumption.statement.length > 90 ? '…' : ''}</td>
            <td class="${g.spread >= 3 ? 'cell-spread-high' : 'cell-spread-med'}">${g.spread}</td>
            <td>${g.views.map((v) => `${esc(v.team?.name || '?')}: ${v.confidence}/5`).join(' · ')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>` : '<div class="empty">No alignment gaps detected. Add team views to assumptions to surface disagreements.</div>'}
    <h3 class="section-title">Blind spot prompt</h3>
    <div class="premortem-prompt">${esc(state.blindSpotPrompt)}</div>
    <button class="btn btn-primary btn-sm" data-action="ai-blind-spot" ${state.aiLoading ? 'disabled' : ''} style="margin-top:0.5rem">✦ AI blind spot</button>
  `;
}

function renderExport() {
  const brief = buildBoardBrief(state);
  views.export.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
      <button class="btn btn-primary" data-action="ai-enhance-brief" ${state.aiLoading ? 'disabled' : ''}>✦ AI enhance brief</button>
      <button class="btn btn-ghost" data-action="copy-brief">Copy to clipboard</button>
      <button class="btn btn-ghost" data-action="download-brief">Download .md</button>
      <button class="btn btn-ghost" data-action="export-json">Export full JSON</button>
    </div>
    <div class="export-preview" id="brief-preview">${esc(brief)}</div>
  `;
  views.export._brief = brief;
}

function openModal(title, bodyHtml, onSave) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  const modal = $('#modal');
  modal.showModal();
  const form = $('#modal-form');
  const handler = async (e) => {
    e.preventDefault();
    const ok = await onSave();
    if (ok !== false) modal.close();
    form.removeEventListener('submit', handler);
  };
  form.addEventListener('submit', handler);
}

function assumptionForm(a = {}) {
  const pillarOpts = state.pillars.map((p) =>
    `<option value="${p.id}" ${(a.pillarIds || []).includes(p.id) ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const depOpts = state.assumptions.filter((x) => x.id !== a.id).map((x) =>
    `<option value="${x.id}" ${(a.dependsOn || []).includes(x.id) ? 'selected' : ''}>${esc(x.statement.slice(0, 60))}</option>`).join('');

  return `
    <div class="field"><label>Statement *</label><textarea name="statement" required>${esc(a.statement || '')}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Category</label><select name="category">${CATEGORIES.map((c) =>
    `<option value="${c}" ${a.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Owner</label><input name="owner" value="${esc(a.owner || '')}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Confidence (1-5)</label><input type="number" name="confidence" min="1" max="5" value="${a.confidence || 3}" /></div>
      <div class="field"><label>Criticality (1-5)</label><input type="number" name="criticality" min="1" max="5" value="${a.criticality || 3}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Half-life (days)</label><input type="number" name="halfLifeDays" value="${a.halfLifeDays || 30}" /></div>
      <div class="field"><label>Evidence</label><input name="evidence" value="${esc(a.evidence || '')}" /></div>
    </div>
    <div class="field"><label>Notes</label><textarea name="notes">${esc(a.notes || '')}</textarea></div>
    <div class="field"><label>Strategy pillars (hold Ctrl)</label><select name="pillarIds" multiple size="3">${pillarOpts}</select></div>
    <div class="field"><label>Depends on (hold Ctrl)</label><select name="dependsOn" multiple size="3">${depOpts}</select></div>
  `;
}

function readMultiSelect(form, name) {
  return [...form.querySelectorAll(`[name="${name}"] option:checked`)].map((o) => o.value);
}

function showAssumptionModal(existing = null) {
  openModal(existing ? 'Edit assumption' : 'New assumption', assumptionForm(existing || {}), async () => {
    const form = $('#modal-form');
    const fd = new FormData(form);
    const item = {
      id: existing?.id || uid(),
      statement: fd.get('statement'),
      category: fd.get('category'),
      owner: fd.get('owner'),
      confidence: Number(fd.get('confidence')),
      criticality: Number(fd.get('criticality')),
      halfLifeDays: Number(fd.get('halfLifeDays')),
      evidence: fd.get('evidence'),
      notes: fd.get('notes'),
      pillarIds: readMultiSelect(form, 'pillarIds'),
      dependsOn: readMultiSelect(form, 'dependsOn'),
      contradicts: existing?.contradicts || [],
      teamViews: existing?.teamViews || [],
      teamId: existing?.teamId || null,
      lastValidated: existing?.lastValidated || null,
      status: existing?.status || 'active',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await put('assumptions', item);
    await reload();
    toast('Assumption saved');
  });
}

document.body.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'validate') {
    const a = state.assumptions.find((x) => x.id === id);
    if (a) { a.lastValidated = new Date().toISOString(); await put('assumptions', a); await reload(); toast('Marked validated'); }
  }
  if (action === 'invalidate') {
    const a = state.assumptions.find((x) => x.id === id);
    if (a) { a.status = 'invalidated'; a.invalidationNote = prompt('Why invalidated?') || ''; await put('assumptions', a); await reload(); toast('Invalidated'); }
  }
  if (action === 'edit-assumption') showAssumptionModal(state.assumptions.find((x) => x.id === id));
  if (action === 'delete-assumption') {
    if (confirm('Delete this assumption?')) { await remove('assumptions', id); await reload(); toast('Deleted'); }
  }
  if (action === 'new-assumption' || action === 'quick-add') showAssumptionModal();

  if (action === 'new-pillar') {
    openModal('New strategy pillar', `
      <div class="field"><label>Name *</label><input name="name" required /></div>
      <div class="field"><label>Description</label><textarea name="description"></textarea></div>
      <div class="field-row">
        <div class="field"><label>Status</label><select name="status"><option value="active">active</option><option value="exploratory">exploratory</option><option value="paused">paused</option></select></div>
        <div class="field"><label>Owner</label><input name="owner" /></div>
      </div>
    `, async () => {
      const fd = new FormData($('#modal-form'));
      await put('pillars', { id: uid(), name: fd.get('name'), description: fd.get('description'), status: fd.get('status'), owner: fd.get('owner'), createdAt: new Date().toISOString() });
      await reload(); toast('Pillar created');
    });
  }

  if (action === 'delete-pillar' && confirm('Delete pillar?')) {
    await remove('pillars', id); await reload(); toast('Deleted');
  }

  if (action === 'new-signal') {
    const aOpts = state.assumptions.map((a) => `<option value="${a.id}">${esc(a.statement.slice(0, 70))}</option>`).join('');
    openModal('Log signal', `
      <div class="field"><label>Title *</label><input name="title" required /></div>
      <div class="field"><label>Summary</label><textarea name="summary"></textarea></div>
      <div class="field-row">
        <div class="field"><label>Source</label><input name="source" /></div>
        <div class="field"><label>Severity</label><select name="severity"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></div>
      </div>
      <div class="field"><label>Linked assumptions (Ctrl+click)</label><select name="assumptionIds" multiple size="4">${aOpts}</select></div>
    `, async () => {
      const form = $('#modal-form');
      const fd = new FormData(form);
      await put('signals', {
        id: uid(), title: fd.get('title'), summary: fd.get('summary'), source: fd.get('source'),
        severity: fd.get('severity'), direction: 'contradicts', assumptionIds: readMultiSelect(form, 'assumptionIds'),
        date: new Date().toISOString(), status: 'open', createdAt: new Date().toISOString(),
      });
      await reload(); toast('Signal logged');
    });
  }

  if (action === 'resolve-signal') {
    const s = state.signals.find((x) => x.id === id);
    if (s) { s.status = 'resolved'; await put('signals', s); await reload(); toast('Resolved'); }
  }
  if (action === 'delete-signal' && confirm('Delete?')) { await remove('signals', id); await reload(); }

  if (action === 'new-decision') {
    const aOpts = state.assumptions.map((a) => `<option value="${a.id}">${esc(a.statement.slice(0, 70))}</option>`).join('');
    openModal('Log decision', `
      <div class="field"><label>Title *</label><input name="title" required /></div>
      <div class="field"><label>Rationale</label><textarea name="rationale"></textarea></div>
      <div class="field-row">
        <div class="field"><label>Owner</label><input name="owner" /></div>
        <div class="field"><label>Outcome</label><select name="outcome"><option value="pending">pending</option><option value="committed">committed</option><option value="reversed">reversed</option></select></div>
      </div>
      <div class="field"><label>Depends on assumptions</label><select name="assumptionIds" multiple size="4">${aOpts}</select></div>
    `, async () => {
      const form = $('#modal-form');
      const fd = new FormData(form);
      await put('decisions', {
        id: uid(), title: fd.get('title'), rationale: fd.get('rationale'), owner: fd.get('owner'),
        outcome: fd.get('outcome'), assumptionIds: readMultiSelect(form, 'assumptionIds'),
        date: new Date().toISOString(), createdAt: new Date().toISOString(),
      });
      await reload(); toast('Decision logged');
    });
  }
  if (action === 'delete-decision' && confirm('Delete?')) { await remove('decisions', id); await reload(); }

  if (action === 'new-premortem-prompt') { state.premortemPrompt = randomPremortem(); renderPremortem(); }
  if (action === 'new-premortem') {
    const aOpts = state.assumptions.map((a) => `<option value="${a.id}">${esc(a.statement.slice(0, 70))}</option>`).join('');
    openModal('Log premortem', `
      <div class="field"><label>Title *</label><input name="title" required /></div>
      <div class="field"><label>Scenario</label><textarea name="scenario"></textarea></div>
      <div class="field"><label>Failure mode</label><textarea name="failureMode"></textarea></div>
      <div class="field"><label>Mitigation</label><textarea name="mitigation"></textarea></div>
      <div class="field"><label>Linked assumptions</label><select name="assumptionIds" multiple size="3">${aOpts}</select></div>
    `, async () => {
      const form = $('#modal-form');
      const fd = new FormData(form);
      await put('premortems', {
        id: uid(), title: fd.get('title'), scenario: fd.get('scenario'), failureMode: fd.get('failureMode'),
        mitigation: fd.get('mitigation'), assumptionIds: readMultiSelect(form, 'assumptionIds'),
        status: 'active', createdAt: new Date().toISOString(),
      });
      await reload(); toast('Premortem saved');
    });
  }
  if (action === 'delete-premortem' && confirm('Delete?')) { await remove('premortems', id); await reload(); }

  if (action === 'refresh-health') {
    await refreshHealth();
    toast('Status refreshed');
  }

  if (action === 'ai-analyze') {
    state.aiLoading = true;
    render();
    try {
      const { result } = await ai.analyze(orgContext());
      state.aiAnalysis = result;
      toast('AI analysis complete');
    } catch (err) {
      toast(err.message || 'AI failed — check Setup');
      switchView('setup');
    } finally {
      state.aiLoading = false;
      render();
    }
  }

  if (action === 'extract-strategy') {
    openModal('Extract assumptions from strategy text', `
      <div class="field"><label>Paste strategy doc, OKRs, or planning notes</label>
      <textarea name="text" rows="10" placeholder="Paste your strategy, roadmap, or board deck notes…"></textarea></div>
    `, async () => {
      const text = new FormData($('#modal-form')).get('text');
      if (!text?.trim()) { toast('Paste some text first'); return false; }
      state.aiLoading = true;
      toast('Extracting…');
      try {
        const { assumptions: extracted } = await ai.extractAssumptions(text);
        for (const a of extracted) {
          await put('assumptions', {
            id: uid(),
            statement: a.statement,
            category: a.category || 'market',
            owner: '',
            confidence: a.confidence || 3,
            criticality: a.criticality || 3,
            evidence: a.evidence || 'AI extracted',
            notes: '',
            pillarIds: [],
            dependsOn: [],
            contradicts: [],
            teamViews: [],
            halfLifeDays: 30,
            lastValidated: null,
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }
        await reload();
        toast(`Logged ${extracted.length} assumptions`);
      } catch (err) {
        toast(err.message || 'Extraction failed');
        return false;
      } finally {
        state.aiLoading = false;
      }
    });
  }

  if (action === 'ai-premortem') {
    state.aiLoading = true;
    render();
    toast('Generating premortem…');
    try {
      const { result } = await ai.premortem(orgContext());
      const linkedIds = (result.suggestedAssumptions || [])
        .map((stmt) => state.assumptions.find((a) => a.statement.includes(stmt) || stmt.includes(a.statement))?.id)
        .filter(Boolean);
      await put('premortems', {
        id: uid(),
        title: result.title || 'AI premortem',
        scenario: result.scenario || '',
        failureMode: result.failureMode || '',
        mitigation: result.mitigation || '',
        leadingIndicators: result.leadingIndicators || [],
        assumptionIds: linkedIds,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      state.premortemPrompt = result.scenario || state.premortemPrompt;
      await reload();
      toast('Premortem generated');
      switchView('premortem');
    } catch (err) {
      toast(err.message || 'AI failed — check Setup');
    } finally {
      state.aiLoading = false;
      render();
    }
  }

  if (action === 'ai-blind-spot') {
    state.aiLoading = true;
    render();
    try {
      const { result } = await ai.blindSpot(orgContext());
      state.blindSpotPrompt = result.question || randomBlindSpot();
      toast('Blind spot generated');
    } catch (err) {
      toast(err.message || 'AI failed — check Setup');
    } finally {
      state.aiLoading = false;
      renderAlignment();
    }
  }

  if (action === 'scan-web-signals') {
    const active = state.assumptions.filter((a) => a.status !== 'invalidated');
    if (!active.length) { toast('Add assumptions first'); return; }
    state.aiLoading = true;
    render();
    toast('Scanning web…');
    try {
      const query = prompt('Optional focus (e.g. "EU CDN market 2026"):', '') || '';
      const { signals: found } = await signalApi.scan(active, query);
      let n = 0;
      for (const s of found) {
        const idx = s.assumptionIndex;
        const assumptionId = typeof idx === 'number' && active[idx] ? active[idx].id : active[0]?.id;
        await put('signals', {
          id: uid(),
          title: s.title || 'Web signal',
          summary: s.summary || '',
          source: s.source || 'web scan',
          severity: s.severity || 'medium',
          direction: s.direction || 'contradicts',
          assumptionIds: assumptionId ? [assumptionId] : [],
          date: new Date().toISOString(),
          status: 'open',
          createdAt: new Date().toISOString(),
        });
        n++;
      }
      await reload();
      toast(n ? `Logged ${n} signal(s)` : 'No signals found');
      switchView('signals');
    } catch (err) {
      toast(err.message || 'Scan failed — check Setup');
    } finally {
      state.aiLoading = false;
      render();
    }
  }

  if (action === 'ai-enhance-brief') {
    const brief = views.export._brief || buildBoardBrief(state);
    state.aiLoading = true;
    render();
    toast('Enhancing brief…');
    try {
      const { brief: enhanced } = await ai.enhanceBrief(brief, orgContext());
      views.export._brief = enhanced;
      const preview = document.getElementById('brief-preview');
      if (preview) preview.textContent = enhanced;
      toast('Brief enhanced');
      renderExport();
    } catch (err) {
      toast(err.message || 'Enhancement failed');
    } finally {
      state.aiLoading = false;
    }
  }

  if (action === 'copy-brief') {
    const text = views.export._brief || buildBoardBrief(state);
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  }
  if (action === 'download-brief') {
    const text = views.export._brief || buildBoardBrief(state);
    const blob = new Blob([text], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stratum-brief-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    toast('Downloaded');
  }
  if (action === 'export-json') {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stratum-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('JSON exported');
  }
});

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

$('#btn-quick-add').addEventListener('click', () => showAssumptionModal());
$('#modal-close').addEventListener('click', () => $('#modal').close());
$('#modal-cancel').addEventListener('click', () => $('#modal').close());

$('#btn-import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await importAll(data);
    await reload();
    toast('Import complete');
  } catch {
    toast('Invalid JSON');
  }
  e.target.value = '';
});

async function refreshHealth() {
  state.apiHealth = await checkHealth();
  if (state.currentView === 'setup') renderSetup();
}

(async function init() {
  await openDb();
  await seedIfEmpty();
  await refreshHealth();
  await reload();
})();