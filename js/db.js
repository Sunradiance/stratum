const DB_NAME = 'stratum';
const DB_VERSION = 1;

let db = null;

export function openDb() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      const stores = [
        'assumptions', 'decisions', 'signals', 'pillars', 'premortems', 'teams', 'meta',
      ];
      for (const name of stores) {
        if (!d.objectStoreNames.contains(name)) {
          d.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
  });
}

function tx(store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

export function uid() {
  return crypto.randomUUID();
}

export async function getAll(store) {
  await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, item) {
  await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(store, id) {
  await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(store, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getMeta(key) {
  await openDb();
  return new Promise((resolve, reject) => {
    const req = tx('meta').get(key);
    req.onsuccess = () => resolve(req.result?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key, value) {
  return put('meta', { key, value });
}

export const STALE_DAYS = 30;

export function daysSince(iso) {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function assumptionStatus(a) {
  if (a.status === 'invalidated') return 'invalidated';
  if (!a.lastValidated) return 'untested';
  const threshold = a.halfLifeDays || STALE_DAYS;
  if (daysSince(a.lastValidated) > threshold) return 'stale';
  return 'active';
}

export async function exportAll() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    assumptions: await getAll('assumptions'),
    decisions: await getAll('decisions'),
    signals: await getAll('signals'),
    pillars: await getAll('pillars'),
    premortems: await getAll('premortems'),
    teams: await getAll('teams'),
  };
  return data;
}

export async function importAll(data) {
  const stores = ['assumptions', 'decisions', 'signals', 'pillars', 'premortems', 'teams'];
  for (const store of stores) {
    const items = data[store] || [];
    for (const item of items) await put(store, item);
  }
}

export async function seedIfEmpty() {
  const existing = await getAll('assumptions');
  if (existing.length > 0) return;

  const teams = [
    { id: uid(), name: 'Executive', color: '#5ec4e8' },
    { id: uid(), name: 'Product', color: '#8b7cf6' },
    { id: uid(), name: 'Revenue', color: '#4ec9a0' },
    { id: uid(), name: 'Engineering', color: '#f0a030' },
    { id: uid(), name: 'Legal / GRC', color: '#e85d5d' },
  ];
  for (const t of teams) await put('teams', t);

  const [exec, product, revenue, eng, legal] = teams;

  const pillars = [
    {
      id: uid(),
      name: 'Win mid-market on simplicity',
      description: 'Capture growth by being the easiest platform to deploy, not the most feature-rich.',
      status: 'active',
      owner: 'Executive',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Expand EU sovereign footprint',
      description: 'Differentiate on data residency and European operations before competitors close the gap.',
      status: 'active',
      owner: 'Executive',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Monetize edge intelligence',
      description: 'Turn edge compute + real-time data into a second revenue line beyond bandwidth.',
      status: 'exploratory',
      owner: 'Product',
      createdAt: new Date().toISOString(),
    },
  ];
  for (const p of pillars) await put('pillars', p);
  const [p1, p2, p3] = pillars;

  const a1 = {
    id: uid(),
    statement: 'Mid-market buyers choose us primarily for time-to-value, not total feature parity with incumbents.',
    category: 'customer',
    owner: 'Revenue',
    teamId: revenue.id,
    confidence: 4,
    criticality: 5,
    evidence: 'Win/loss interviews Q1–Q2, 34 deals',
    lastValidated: new Date(Date.now() - 12 * 86400000).toISOString(),
    status: 'active',
    halfLifeDays: 45,
    pillarIds: [p1.id],
    dependsOn: [],
    contradicts: [],
    teamViews: [
      { teamId: product.id, confidence: 3, note: 'We still over-build enterprise features' },
      { teamId: revenue.id, confidence: 5, note: 'Consistent in every won deal' },
    ],
    createdAt: new Date().toISOString(),
    notes: 'If false, roadmap prioritization is misallocated.',
  };

  const a2 = {
    id: uid(),
    statement: 'EU customers will pay a 15–25% premium for verifiable EU-only data paths and support.',
    category: 'market',
    owner: 'Revenue',
    teamId: revenue.id,
    confidence: 3,
    criticality: 5,
    evidence: '12 enterprise RFPs mentioning sovereignty (2025)',
    lastValidated: null,
    status: 'active',
    halfLifeDays: 60,
    pillarIds: [p2.id],
    dependsOn: [],
    contradicts: [],
    teamViews: [
      { teamId: exec.id, confidence: 4, note: 'Board strategy depends on this' },
      { teamId: legal.id, confidence: 2, note: 'Premium not proven in contracts yet' },
    ],
    createdAt: new Date().toISOString(),
    notes: 'Untested — highest strategic exposure.',
  };

  const a3 = {
    id: uid(),
    statement: 'Our compliance checklist fully covers operational security risk.',
    category: 'regulatory',
    owner: 'Legal / GRC',
    teamId: legal.id,
    confidence: 5,
    criticality: 4,
    evidence: 'SOC2 Type II, annual audit',
    lastValidated: new Date(Date.now() - 52 * 86400000).toISOString(),
    status: 'active',
    halfLifeDays: 30,
    pillarIds: [],
    dependsOn: [],
    contradicts: [],
    teamViews: [
      { teamId: eng.id, confidence: 2, note: 'Audit scope ≠ runtime attack surface' },
      { teamId: legal.id, confidence: 5, note: 'Certification current' },
    ],
    createdAt: new Date().toISOString(),
    notes: 'Classic high-confidence stale assumption pattern.',
  };

  const a4 = {
    id: uid(),
    statement: 'Edge compute attach rate will exceed 20% of bandwidth revenue within 18 months.',
    category: 'technology',
    owner: 'Product',
    teamId: product.id,
    confidence: 3,
    criticality: 4,
    evidence: 'Internal model, 3 lighthouse customers',
    lastValidated: new Date(Date.now() - 8 * 86400000).toISOString(),
    status: 'active',
    halfLifeDays: 30,
    pillarIds: [p3.id],
    dependsOn: [a1.id],
    contradicts: [],
    teamViews: [],
    createdAt: new Date().toISOString(),
    notes: 'Depends on mid-market simplicity bet holding.',
  };

  a1.dependsOn = [];
  await put('assumptions', a1);
  await put('assumptions', a2);
  await put('assumptions', a3);
  await put('assumptions', a4);

  const signals = [
    {
      id: uid(),
      title: 'Competitor launches EU-only tier at flat pricing',
      source: 'Market intel',
      severity: 'high',
      direction: 'contradicts',
      assumptionIds: [a2.id],
      summary: 'Undermines premium pricing assumption for sovereignty.',
      date: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'open',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Win/loss: 2 deals lost on missing enterprise SSO',
      source: 'Sales ops',
      severity: 'medium',
      direction: 'contradicts',
      assumptionIds: [a1.id],
      summary: 'Feature gap cited over simplicity in both losses.',
      date: new Date(Date.now() - 6 * 86400000).toISOString(),
      status: 'open',
      createdAt: new Date().toISOString(),
    },
  ];
  for (const s of signals) await put('signals', s);

  const decisions = [
    {
      id: uid(),
      title: 'Freeze enterprise feature work for two quarters',
      owner: 'Executive',
      date: new Date(Date.now() - 21 * 86400000).toISOString(),
      outcome: 'pending',
      assumptionIds: [a1.id],
      rationale: 'Double down on mid-market simplicity if time-to-value is the real win driver.',
      reviewDate: new Date(Date.now() + 60 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Invest in EU PoP expansion (3 regions)',
      owner: 'Executive',
      date: new Date(Date.now() - 45 * 86400000).toISOString(),
      outcome: 'committed',
      assumptionIds: [a2.id, a3.id],
      rationale: 'Sovereignty bet requires infra + compliance posture.',
      reviewDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
  for (const d of decisions) await put('decisions', d);

  const premortems = [
    {
      id: uid(),
      title: 'EU sovereignty bet fails to return premium revenue',
      scenario: 'We invest heavily in EU infra but customers treat it as table stakes.',
      failureMode: 'Margin compression without differentiation',
      leadingIndicators: ['RFP language shifts from premium to mandatory', 'Competitor price-matching'],
      assumptionIds: [a2.id],
      mitigation: 'Package sovereignty with compliance automation, not raw residency.',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];
  for (const p of premortems) await put('premortems', p);

  await setMeta('orgName', 'Demo Organization');
  await setMeta('seeded', true);
}