export function layoutGraph(assumptions, width, height) {
  const nodes = assumptions
    .filter((a) => a.status !== 'invalidated')
    .map((a, i, arr) => {
      const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(width, height) * 0.32;
      return {
        id: a.id,
        assumption: a,
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
      };
    });

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges = [];

  for (const a of assumptions) {
    for (const depId of a.dependsOn || []) {
      if (nodeById[depId] && nodeById[a.id]) {
        edges.push({ from: depId, to: a.id, type: 'depends' });
      }
    }
    for (const cId of a.contradicts || []) {
      if (nodeById[cId] && nodeById[a.id]) {
        edges.push({ from: a.id, to: cId, type: 'contradicts' });
      }
    }
  }

  return { nodes, edges, nodeById };
}

export function renderGraphSvg(assumptions, { width = 720, height = 480, statusFn } = {}) {
  const { nodes, edges } = layoutGraph(assumptions, width, height);

  const statusColor = {
    active: '#4ec9a0',
    stale: '#e8b84a',
    untested: '#5ec4e8',
    invalidated: '#e85d5d',
  };

  let svg = `<svg viewBox="0 0 ${width} ${height}" class="dep-graph" xmlns="http://www.w3.org/2000/svg">`;
  svg += '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4a5568"/></marker></defs>';

  for (const e of edges) {
    const from = nodes.find((n) => n.id === e.from);
    const to = nodes.find((n) => n.id === e.to);
    if (!from || !to) continue;
    const stroke = e.type === 'contradicts' ? '#e85d5d' : '#4a5568';
    const dash = e.type === 'contradicts' ? '6,4' : 'none';
    svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="${dash}" marker-end="url(#arrow)" opacity="0.7"/>`;
  }

  for (const n of nodes) {
    const st = statusFn ? statusFn(n.assumption) : 'active';
    const fill = statusColor[st] || '#5ec4e8';
    const r = 8 + (n.assumption.criticality || 3) * 2;
    const label = (n.assumption.statement || '').slice(0, 42) + ((n.assumption.statement || '').length > 42 ? '…' : '');
    svg += `<g class="graph-node" data-id="${n.id}">`;
    svg += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" opacity="0.85" stroke="#0c1018" stroke-width="2"/>`;
    svg += `<text x="${n.x}" y="${n.y + r + 14}" text-anchor="middle" fill="#8b95a8" font-size="10" font-family="JetBrains Mono, monospace">${escapeXml(label)}</text>`;
    svg += '</g>';
  }

  svg += '</svg>';
  return svg;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}