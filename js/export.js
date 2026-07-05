import { assumptionStatus, daysSince } from './db.js';
import { computeOrgHealth, alignmentGaps, cascadeRisk, driftRadar, pillarHealth } from './analysis.js';
import { RESEARCH_META, GAP_FINDINGS } from './research.js';

export function buildBoardBrief(state) {
  const { assumptions, decisions, signals, pillars, teams, orgName } = state;
  const health = computeOrgHealth(assumptions, signals, decisions);
  const gaps = alignmentGaps(assumptions, teams);
  const cascades = cascadeRisk(assumptions);
  const drift = driftRadar(assumptions, signals).slice(0, 5);
  const pHealth = pillarHealth(pillars, assumptions);
  const now = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Stratum Board Brief — ${orgName || 'Organization'}`);
  lines.push(`Generated: ${now} · Assumption health: **${health.score}/100 (${health.grade})**`);
  lines.push('');
  lines.push('> Corporations report KPIs, risks, and compliance. This brief reports **strategic ground truth** — the assumptions your bets depend on, and which ones are decaying.');
  lines.push('');

  lines.push('## Executive summary');
  lines.push(`| Signal | Count | Risk |`);
  lines.push(`|--------|-------|------|`);
  for (const f of health.factors) {
    lines.push(`| ${f.label} | ${f.count} | ${f.severity} |`);
  }
  lines.push('');

  if (health.highCritStale.length) {
    lines.push('## Critical assumptions at risk');
    lines.push('_High criticality + stale or untested = maximum exposure._');
    lines.push('');
    for (const a of health.highCritStale) {
      const st = assumptionStatus(a);
      lines.push(`- **[${st}]** ${a.statement}`);
      lines.push(`  - Owner: ${a.owner || '—'} · Criticality: ${a.criticality}/5 · Confidence: ${a.confidence}/5`);
      lines.push(`  - Last validated: ${a.lastValidated?.slice(0, 10) || 'never'} (${Math.floor(daysSince(a.lastValidated))}d ago)`);
    }
    lines.push('');
  }

  if (cascades.length) {
    lines.push('## Cascade risk (broken root → dependent bets)');
    for (const c of cascades.slice(0, 4)) {
      lines.push(`- Root [${c.rootStatus}]: **${c.root.statement.slice(0, 80)}…**`);
      lines.push(`  - Blast radius: ${c.dependents.length} dependent assumption(s)`);
      for (const d of c.dependents) {
        lines.push(`  - → ${d.statement.slice(0, 70)}…`);
      }
    }
    lines.push('');
  }

  if (gaps.length) {
    lines.push('## Cross-functional alignment gaps');
    lines.push('_Teams hold materially different confidence in the same beliefs._');
    lines.push('');
    for (const g of gaps.slice(0, 5)) {
      lines.push(`- **${g.assumption.statement.slice(0, 90)}** (spread: ${g.spread})`);
      for (const v of g.views) {
        lines.push(`  - ${v.team?.name || 'Team'}: confidence ${v.confidence}/5${v.note ? ` — ${v.note}` : ''}`);
      }
    }
    lines.push('');
  }

  if (drift.length) {
    lines.push('## Drift radar (top 5)');
    for (const d of drift) {
      lines.push(`- [${d.drift}% drift] ${d.assumption.statement.slice(0, 85)}`);
      if (d.signals.length) lines.push(`  - ${d.signals.length} open contradicting signal(s)`);
    }
    lines.push('');
  }

  if (pHealth.length) {
    lines.push('## Strategy pillar health');
    for (const ph of pHealth) {
      lines.push(`- **${ph.pillar.name}**: ${ph.health}% healthy (${ph.stale.length}/${ph.linked.length} assumptions at risk)`);
    }
    lines.push('');
  }

  if (health.riskyDecisions.length) {
    lines.push('## Decisions on shaky ground');
    for (const d of health.riskyDecisions) {
      lines.push(`- **${d.title}** (${d.outcome})`);
      const linked = (d.assumptionIds || []).map((id) => assumptions.find((a) => a.id === id)).filter(Boolean);
      for (const a of linked) {
        lines.push(`  - [${assumptionStatus(a)}] ${a.statement.slice(0, 70)}…`);
      }
    }
    lines.push('');
  }

  lines.push('## Research context');
  lines.push(`_${RESEARCH_META.disclaimer}_`);
  lines.push('');
  lines.push('Top systemic gaps Stratum addresses:');
  for (const g of GAP_FINDINGS.slice(0, 4)) {
    lines.push(`- **${g.gap}** — ${g.cost}`);
  }
  lines.push('');

  lines.push('## Recommended actions (next 14 days)');
  lines.push('1. **Invalidate or re-validate** every critical assumption that is stale or untested.');
  lines.push('2. **Resolve alignment gaps** where spread ≥ 2 — schedule 30-min belief reconciliation sessions.');
  lines.push('3. **Link open signals** to assumptions and assign owners to investigate.');
  lines.push('4. **Delay or hedge** pending decisions that depend on assumptions with open contradicting signals.');
  lines.push('5. **Run one premortem** per active strategy pillar; log resulting assumptions.');
  lines.push('');
  lines.push('---');
  lines.push('_Stratum — the system of record for what must be true to win._');

  return lines.join('\n');
}