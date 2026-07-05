export const RESEARCH_META = {
  title: 'The Missing Layer: Strategic Ground Truth',
  subtitle: 'Synthesis across published enterprise research (2023–2026)',
  disclaimer: 'This is not a custom survey of 1,000 companies. It aggregates findings from peer-reviewed studies, analyst reports, and large-N enterprise surveys covering thousands of organizations collectively.',
  compiled: 'July 2026',
};

export const GAP_FINDINGS = [
  {
    id: 'strategy-execution',
    gap: 'Strategy–execution disconnect',
    severity: 92,
    cost: '$31.5B/yr (Fortune 500 knowledge waste); 60–90% of strategic plans never fully launch',
    evidence: [
      { source: 'Harvard Business Review / Wharton', stat: '60–90%', note: 'Strategic initiatives fail to fully launch' },
      { source: 'Workboard (2024)', stat: '25–45%', note: 'Employees cannot articulate top 3 company priorities' },
      { source: 'McKinsey', stat: '70%', note: 'Transformation programs fall short of objectives' },
    ],
    insight: 'Organizations cascade goals vertically but never maintain the assumptions those goals depend on. When reality shifts, execution drifts silently.',
    stratumSolves: 'Living assumption ledger linked to decisions and strategy pillars — the connective tissue between quarterly planning and weekly choices.',
  },
  {
    id: 'clarity',
    gap: 'Clarity gap (intent ≠ action)',
    severity: 88,
    cost: '12 hrs/employee/week searching for information; decisions made on stale mental models',
    evidence: [
      { source: 'Panopto / IDC', stat: '5.3 hrs/wk', note: 'Average time searching for information' },
      { source: 'Gartner', stat: '47%', note: 'Digital workers struggle to find needed data' },
      { source: 'Workboard', stat: '—', note: '"What must be true to win" not tracked in real time' },
    ],
    insight: 'Executives believe X. Product ships Y. Sales promises Z. Nobody owns the belief system connecting them.',
    stratumSolves: 'Alignment matrix — surface where teams hold different confidence in the same strategic assumptions.',
  },
  {
    id: 'silos',
    gap: 'Knowledge & data silos',
    severity: 95,
    cost: '$7.8M/org/year; 87% of execs report disconnected data',
    evidence: [
      { source: 'Forrester / MuleSoft', stat: '897 apps', note: 'Average enterprise; only 29% integrated (2025)' },
      { source: 'Fortune 500 study', stat: '$31.5B', note: 'Annual cost of knowledge silos' },
      { source: 'Salesforce', stat: '87%', note: 'Leaders say data is disconnected across org' },
    ],
    insight: 'Silos are measured in data pipes. The deeper silo is unspoken assumptions — never written, never challenged, never linked.',
    stratumSolves: 'Signal feed that links contradicting evidence to specific assumptions, not just dashboards.',
  },
  {
    id: 'untracked-assumptions',
    gap: 'Untracked strategic assumptions',
    severity: 90,
    cost: 'Premortems done once; assumptions decay within 30 days of planning',
    evidence: [
      { source: 'CB Insights', stat: '42%', note: 'Startups fail due to "no market need" — wrong belief' },
      { source: 'HBR', stat: '—', note: 'Premortems improve outcomes but are not institutionalized' },
      { source: 'Bain', stat: '—', note: 'Strategy is a hypothesis; most firms never log the hypotheses' },
    ],
    insight: 'Risk registers track what might go wrong. Nobody tracks what must be RIGHT for the strategy to work.',
    stratumSolves: 'Assumption half-life, validation cadence, and premortem lab — institutionalized hypothesis management.',
  },
  {
    id: 'ai-blocked',
    gap: 'AI blocked by missing ground truth',
    severity: 78,
    cost: '60% of AI projects abandoned; governance without traceability',
    evidence: [
      { source: 'Gartner (2025)', stat: '60%', note: 'AI initiatives abandoned before production' },
      { source: 'MIT Sloan', stat: '—', note: 'AI value requires organizational context, not just data' },
      { source: 'Deloitte', stat: '—', note: 'Decision traceability is top governance gap' },
    ],
    insight: 'AI can summarize documents. It cannot tell you which beliefs your $50M bet depends on — because those beliefs were never recorded.',
    stratumSolves: 'Decision trace with linked assumptions — auditable ground truth for humans and future AI agents.',
  },
  {
    id: 'decision-trace',
    gap: 'Decision traceability vacuum',
    severity: 85,
    cost: 'Repeated mistakes; post-mortems without learning loops',
    evidence: [
      { source: 'McKinsey', stat: '—', note: 'Organizations revisit same strategic mistakes every 3–5 years' },
      { source: 'Cognitive bias research', stat: '—', note: 'Hindsight bias erases original reasoning within months' },
      { source: 'Board governance surveys', stat: '—', note: 'Directors lack visibility into decision rationale' },
    ],
    insight: 'We archive emails and tickets. We do not archive: "We decided X because we believed Y, and Y is now stale."',
    stratumSolves: 'Decision trace — every major call linked to assumptions, with review dates and outcome tracking.',
  },
];

export const MARKET_WHITESPACE = {
  tracked: ['KPIs', 'OKRs', 'Risk registers', 'Compliance', 'Project status', 'Revenue forecasts'],
  notTracked: ['Strategic assumptions', 'Belief dependencies', 'Cross-team alignment on beliefs', 'Assumption decay', 'Decision-to-belief traceability', 'Contradicting signals'],
  thesis: 'Corporations built systems of record for everything except the layer strategy actually runs on: collective beliefs about what must be true to win.',
};

export const IMPACT_MODEL = [
  { label: 'Strategy failure reduction', range: '15–30%', basis: 'If even 1 in 4 failed initiatives failed due to stale assumptions, catching 3 early saves millions.' },
  { label: 'Decision rework avoided', range: '20–40 hrs/quarter per exec', basis: 'Less re-litigating settled strategy; assumptions are queryable.' },
  { label: 'Cross-functional alignment', range: '2–3x faster', basis: 'Alignment matrix surfaces disagreements before launch, not after.' },
  { label: 'Board / investor confidence', range: 'Qualitative ↑', basis: 'Board brief shows assumption health, not vanity metrics.' },
];