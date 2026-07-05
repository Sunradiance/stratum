import { assumptionStatus, daysSince } from './db.js';

export function computeOrgHealth(assumptions, signals, decisions) {
  if (!assumptions.length) return { score: 0, grade: '—', factors: [] };

  const active = assumptions.filter((a) => a.status !== 'invalidated');
  const stale = active.filter((a) => assumptionStatus(a) === 'stale');
  const untested = active.filter((a) => assumptionStatus(a) === 'untested');
  const highCrit = active.filter((a) => (a.criticality || 3) >= 4);
  const highCritStale = highCrit.filter((a) => assumptionStatus(a) === 'stale' || assumptionStatus(a) === 'untested');
  const openSignals = signals.filter((s) => s.status === 'open');
  const highSignals = openSignals.filter((s) => s.severity === 'high');
  const pendingDecisions = decisions.filter((d) => d.outcome === 'pending');
  const riskyDecisions = pendingDecisions.filter((d) => {
    const linked = (d.assumptionIds || [])
      .map((id) => assumptions.find((a) => a.id === id))
      .filter(Boolean);
    return linked.some((a) => {
      const st = assumptionStatus(a);
      return st === 'stale' || st === 'untested' || st === 'invalidated';
    });
  });

  let score = 100;
  score -= stale.length * 4;
  score -= untested.length * 6;
  score -= highCritStale.length * 8;
  score -= highSignals.length * 10;
  score -= riskyDecisions.length * 12;
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 80 ? 'Healthy' : score >= 60 ? 'At risk' : score >= 40 ? 'Fragile' : 'Critical';

  return {
    score,
    grade,
    factors: [
      { label: 'Stale assumptions', count: stale.length, severity: stale.length > 3 ? 'high' : 'medium' },
      { label: 'Untested assumptions', count: untested.length, severity: untested.length > 2 ? 'high' : 'medium' },
      { label: 'Critical assumptions at risk', count: highCritStale.length, severity: highCritStale.length ? 'high' : 'low' },
      { label: 'Open contradicting signals', count: openSignals.length, severity: highSignals.length ? 'high' : 'medium' },
      { label: 'Decisions on shaky ground', count: riskyDecisions.length, severity: riskyDecisions.length ? 'high' : 'low' },
    ],
    stale,
    untested,
    highCritStale,
    openSignals,
    riskyDecisions,
  };
}

export function alignmentGaps(assumptions, teams) {
  const gaps = [];
  for (const a of assumptions) {
    if (!a.teamViews?.length) continue;
    const confidences = a.teamViews.map((v) => v.confidence);
    const spread = Math.max(...confidences) - Math.min(...confidences);
    if (spread >= 2) {
      gaps.push({
        assumption: a,
        spread,
        views: a.teamViews.map((v) => ({
          ...v,
          team: teams.find((t) => t.id === v.teamId),
        })),
      });
    }
  }
  return gaps.sort((a, b) => b.spread - a.spread);
}

export function cascadeRisk(assumptions) {
  const risks = [];
  const byId = Object.fromEntries(assumptions.map((a) => [a.id, a]));

  for (const a of assumptions) {
    if (a.status === 'invalidated') continue;
    const st = assumptionStatus(a);
    if (st !== 'stale' && st !== 'untested' && st !== 'invalidated') continue;

    const dependents = assumptions.filter((x) => (x.dependsOn || []).includes(a.id));
    if (dependents.length) {
      risks.push({
        root: a,
        rootStatus: st,
        dependents,
        blastRadius: dependents.length + dependents.reduce((n, d) => n + (d.criticality || 3), 0),
      });
    }
  }
  return risks.sort((a, b) => b.blastRadius - a.blastRadius);
}

export function driftRadar(assumptions, signals) {
  return assumptions
    .filter((a) => a.status !== 'invalidated')
    .map((a) => {
      const st = assumptionStatus(a);
      const contradicting = signals.filter(
        (s) => s.status === 'open' && s.direction === 'contradicts' && (s.assumptionIds || []).includes(a.id),
      );
      let drift = 0;
      if (st === 'stale') drift += 30;
      if (st === 'untested') drift += 40;
      drift += contradicting.length * 15;
      drift += (5 - (a.confidence || 3)) * -2;
      drift += ((a.criticality || 3) - 3) * 5;
      if (a.lastValidated) drift += Math.min(30, daysSince(a.lastValidated) / 3);
      return { assumption: a, drift: Math.max(0, Math.min(100, drift)), signals: contradicting, status: st };
    })
    .sort((a, b) => b.drift - a.drift);
}

export function pillarHealth(pillars, assumptions) {
  return pillars.map((p) => {
    const linked = assumptions.filter((a) => (a.pillarIds || []).includes(p.id) && a.status !== 'invalidated');
    const stale = linked.filter((a) => {
      const st = assumptionStatus(a);
      return st === 'stale' || st === 'untested';
    });
    const health = linked.length ? Math.round(100 - (stale.length / linked.length) * 100) : 100;
    return { pillar: p, linked, stale, health };
  });
}