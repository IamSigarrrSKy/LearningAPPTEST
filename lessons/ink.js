/* ChemLab smart-ink molecule board. Drawing engine written by Kru Sky (iPad Smart Ink v2); naming uses name-rules.js. */
    (function () {
      'use strict';

      // =========================================================================
      // 1. CONSTANTS & ELEMENT METADATA
      // =========================================================================
      const BOND_LEN = 58; // Standard visual bond length in px (ACS clean style)
      const SNAP_RADIUS = 24; // Snap distance to existing atoms
      const BOND_HIT_RADIUS = 16; // Distance to detect bond click/parallel stroke

      const ATOM_INFO = {
        C:  { valence: 4, mass: 12.011, color: '#1A1A1A' },
        H:  { valence: 1, mass: 1.008,  color: '#5A554E' },
        O:  { valence: 2, mass: 15.999, color: '#DC2626' },
        N:  { valence: 3, mass: 14.007, color: '#2563EB' },
        S:  { valence: 2, mass: 32.06,  color: '#B45309' },
        P:  { valence: 3, mass: 30.974, color: '#D97706' },
        F:  { valence: 1, mass: 18.998, color: '#059669' },
        Cl: { valence: 1, mass: 35.45,  color: '#059669' },
        Br: { valence: 1, mass: 79.904, color: '#9333EA' },
        I:  { valence: 1, mass: 126.90, color: '#7C3AED' }
      };

      const ALKANE_ROOTS = [
        '', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
        'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos'
      ];

      const MULT_PREFIX = ['', '', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'];

      // Known compound dictionary for instant Thai/English metadata & CID
      const KNOWN_DB = {
        'CCO': { iupac: 'ethanol', thai: 'เอทานอล (แอลกอฮอล์)', common: 'Ethanol', cid: 702 },
        'OCC': { iupac: 'ethanol', thai: 'เอทานอล (แอลกอฮอล์)', common: 'Ethanol', cid: 702 },
        'CC(=O)O': { iupac: 'acetic acid (ethanoic acid)', thai: 'กรดแอซีติก (กรดน้ำส้ม)', common: 'Acetic acid', cid: 176 },
        'CC(O)=O': { iupac: 'acetic acid (ethanoic acid)', thai: 'กรดแอซีติก (กรดน้ำส้ม)', common: 'Acetic acid', cid: 176 },
        'CC(=O)C': { iupac: 'propan-2-one', thai: 'แอซีโตน (โพรพาโนน)', common: 'Acetone', cid: 180 },
        'c1ccccc1': { iupac: 'benzene', thai: 'เบนซีน', common: 'Benzene', cid: 241 },
        'C1=CC=CC=C1': { iupac: 'benzene', thai: 'เบนซีน', common: 'Benzene', cid: 241 },
        'C1CCCCC1': { iupac: 'cyclohexane', thai: 'ไซโคลเฮกเซน', common: 'Cyclohexane', cid: 8078 },
        'OC1CCCCC1': { iupac: 'cyclohexanol', thai: 'ไซโคลเฮกซานอล', common: 'Cyclohexanol', cid: 7966 },
        'C1CCC(O)CC1': { iupac: 'cyclohexanol', thai: 'ไซโคลเฮกซานอล', common: 'Cyclohexanol', cid: 7966 },
        'C': { iupac: 'methane', thai: 'มีเทน', common: 'Methane', cid: 297 },
        'O': { iupac: 'water (oxidane)', thai: 'น้ำ', common: 'Water', cid: 962 },
        'CC(O)C=C': { iupac: 'but-3-en-2-ol', thai: 'บิวท์-3-อีน-2-ออล', common: '3-Buten-2-ol', cid: 11725 },
        'CC(C)CO': { iupac: '2-methylpropan-1-ol', thai: '2-เมทิลโพรแพน-1-ออล (ไอโซบิวทานอล)', common: 'Isobutanol', cid: 6560 },
        'CCCCC': { iupac: 'pentane', thai: 'เพนเทน', common: 'n-Pentane', cid: 8003 },
        'CCCC': { iupac: 'butane', thai: 'บิวเทน', common: 'n-Butane', cid: 7843 },
        'CCC': { iupac: 'propane', thai: 'โพรเพน', common: 'Propane', cid: 6334 },
        'CC': { iupac: 'ethane', thai: 'อีเทน', common: 'Ethane', cid: 6324 },
        'CC(C)O': { iupac: 'propan-2-ol', thai: 'โพรแพน-2-ออล (ไอโซโพรพิลแอลกอฮอล์)', common: 'Isopropyl alcohol', cid: 3776 }
      };

      // =========================================================================
      // 2. MOLECULAR GRAPH STATE & HISTORY
      // =========================================================================
      let atoms = []; // { id, x, y, el: 'C', charge: 0 }
      let bonds = []; // { id, a1, a2, order: 1|2|3, stereo: 'none'|'wedge'|'dash', aromatic: false }
      let nextAtomId = 1;
      let nextBondId = 1;

      let historyStack = [];
      let redoStack = [];

      let activeTool = 'smart'; // 'smart', 'bond-1', 'bond-2', 'bond-3', 'bond-wedge', 'bond-dash', 'chain', 'move', 'erase', 'ring-3'..'ring-8', 'ring-ben'
      let activeElement = 'C';
      let activeFG = null;      // 'OH', 'NH2', 'COOH', 'CHO', 'CN', 'NO2'
      let activeChargeDelta = null;

      let currentChallenge = null;

      // Interaction state
      const canvas = document.getElementById('chem-canvas');
      const ctx = canvas.getContext('2d');
      const canvasWrap = document.getElementById('chem-canvas-wrap');

      let isDrawing = false;
      let strokePoints = [];
      let hoverAtomId = null;
      let hoverBondId = null;
      let dragStartAtomId = null;
      let movingAtomId = null;
      let holdTimer = null;
      let hasSnappedDuringHold = false;
      let pickerTargetAtomId = null;

      function saveHistory() {
        historyStack.push(JSON.stringify({ atoms, bonds, nextAtomId, nextBondId }));
        if (historyStack.length > 50) historyStack.shift();
        redoStack = [];
      }

      function undo() {
        if (historyStack.length === 0) return;
        redoStack.push(JSON.stringify({ atoms, bonds, nextAtomId, nextBondId }));
        const prev = JSON.parse(historyStack.pop());
        atoms = prev.atoms;
        bonds = prev.bonds;
        nextAtomId = prev.nextAtomId;
        nextBondId = prev.nextBondId;
        hideAtomPicker();
        renderCanvas();
        updateMoleculeAnalysis();
      }

      function redo() {
        if (redoStack.length === 0) return;
        historyStack.push(JSON.stringify({ atoms, bonds, nextAtomId, nextBondId }));
        const next = JSON.parse(redoStack.pop());
        atoms = next.atoms;
        bonds = next.bonds;
        nextAtomId = next.nextAtomId;
        nextBondId = next.nextBondId;
        hideAtomPicker();
        renderCanvas();
        updateMoleculeAnalysis();
      }

      // =========================================================================
      // 3. GRAPH HELPER FUNCTIONS
      // =========================================================================
      function getAtom(id) {
        return atoms.find(a => a.id === id) || null;
      }

      function getBondBetween(id1, id2) {
        return bonds.find(b => (b.a1 === id1 && b.a2 === id2) || (b.a1 === id2 && b.a2 === id1)) || null;
      }

      function getNeighbors(atomId) {
        const res = [];
        for (const b of bonds) {
          if (b.a1 === atomId) res.push({ atom: getAtom(b.a2), bond: b });
          else if (b.a2 === atomId) res.push({ atom: getAtom(b.a1), bond: b });
        }
        return res.filter(n => n.atom !== null);
      }

      function addAtom(x, y, el = 'C', charge = 0) {
        // Check if an existing atom is within SNAP_RADIUS
        for (const a of atoms) {
          if (Math.hypot(a.x - x, a.y - y) <= SNAP_RADIUS) {
            return a;
          }
        }
        const newAtom = { id: nextAtomId++, x, y, el, charge };
        atoms.push(newAtom);
        return newAtom;
      }

      function addOrUpdateBond(id1, id2, order = 1, stereo = 'none', aromatic = false) {
        if (id1 === id2) return null;
        const existing = getBondBetween(id1, id2);
        if (existing) {
          if (stereo !== 'none') {
            existing.stereo = existing.stereo === stereo ? 'none' : stereo;
            existing.order = 1;
          } else {
            existing.order = order;
            existing.stereo = 'none';
            existing.aromatic = aromatic;
          }
          return existing;
        }
        const nb = { id: nextBondId++, a1: id1, a2: id2, order, stereo, aromatic };
        bonds.push(nb);
        return nb;
      }

      function removeAtom(atomId) {
        atoms = atoms.filter(a => a.id !== atomId);
        bonds = bonds.filter(b => b.a1 !== atomId && b.a2 !== atomId);
      }

      function removeBond(bondId) {
        bonds = bonds.filter(b => b.id !== bondId);
        // Clean up isolated single carbon atoms left with 0 bonds
        const connectedIds = new Set();
        bonds.forEach(b => { connectedIds.add(b.a1); connectedIds.add(b.a2); });
        atoms = atoms.filter(a => connectedIds.has(a.id) || atoms.length === 1);
      }

      function findNearestAtom(x, y, maxDist = SNAP_RADIUS) {
        let best = null;
        let bestD = maxDist;
        for (const a of atoms) {
          const d = Math.hypot(a.x - x, a.y - y);
          if (d <= bestD) {
            bestD = d;
            best = a;
          }
        }
        return best;
      }

      function pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
      }

      function findNearestBond(x, y, maxDist = BOND_HIT_RADIUS) {
        let best = null;
        let bestD = maxDist;
        for (const b of bonds) {
          const a1 = getAtom(b.a1);
          const a2 = getAtom(b.a2);
          if (!a1 || !a2) continue;
          // Avoid stealing clicks right on top of atom endpoints
          if (Math.hypot(x - a1.x, y - a1.y) < 14 || Math.hypot(x - a2.x, y - a2.y) < 14) continue;
          const d = pointToSegmentDist(x, y, a1.x, a1.y, a2.x, a2.y);
          if (d <= bestD) {
            bestD = d;
            best = b;
          }
        }
        return best;
      }

      function getImplicitHydrogens(atom) {
        const info = ATOM_INFO[atom.el] || { valence: 4 };
        let bondOrderSum = 0;
        for (const b of bonds) {
          if (b.a1 === atom.id || b.a2 === atom.id) {
            bondOrderSum += b.aromatic ? 1.5 : b.order;
          }
        }
        bondOrderSum = Math.round(bondOrderSum);
        let targetValence = info.valence;
        if (atom.el === 'C') targetValence = 4 - Math.abs(atom.charge || 0);
        else if (atom.el === 'N') targetValence = 3 + (atom.charge || 0);
        else if (atom.el === 'O') targetValence = 2 + (atom.charge || 0);
        return Math.max(0, targetValence - bondOrderSum);
      }

      // =========================================================================
      // 4. FUNCTIONAL GROUP EXPANSION & RING PLACEMENT
      // =========================================================================
      function chooseBestSproutAngle(atomId) {
        const atom = getAtom(atomId);
        if (!atom) return -Math.PI / 6;
        const nbrs = getNeighbors(atomId);
        if (nbrs.length === 0) return -Math.PI / 6; // -30 deg
        if (nbrs.length === 1) {
          const other = nbrs[0].atom;
          const inAngle = Math.atan2(atom.y - other.y, atom.x - other.x);
          // Zigzag alternating +60 or -60 deg from incoming direction
          const cand1 = inAngle + Math.PI / 3;
          const cand2 = inAngle - Math.PI / 3;
          // Pick the one closer to horizontal-ish zigzag
          return Math.abs(Math.sin(cand1)) < Math.abs(Math.sin(cand2)) ? cand1 : cand2;
        }
        // Find largest angular gap
        const angles = nbrs.map(n => Math.atan2(n.atom.y - atom.y, n.atom.x - atom.x)).sort((a, b) => a - b);
        let maxGap = -1;
        let bestAngle = 0;
        for (let i = 0; i < angles.length; i++) {
          const a1 = angles[i];
          const a2 = (i === angles.length - 1) ? angles[0] + Math.PI * 2 : angles[i + 1];
          const gap = a2 - a1;
          if (gap > maxGap) {
            maxGap = gap;
            bestAngle = a1 + gap / 2;
          }
        }
        return bestAngle;
      }

      function applyFunctionalGroup(atomId, fgCode) {
        const atom = getAtom(atomId);
        if (!atom) return;
        saveHistory();
        const baseAngle = chooseBestSproutAngle(atomId);

        if (fgCode === 'OH') {
          const nbrs = getNeighbors(atomId);
          if (nbrs.length <= 1 && atom.el === 'C' && bonds.length > 0) {
            atom.el = 'O';
          } else {
            const ox = atom.x + BOND_LEN * Math.cos(baseAngle);
            const oy = atom.y + BOND_LEN * Math.sin(baseAngle);
            const oAtom = addAtom(ox, oy, 'O');
            addOrUpdateBond(atom.id, oAtom.id, 1);
          }
          showSnapToast('เติมหมู่แอลกอฮอล์ (-OH)');
        } else if (fgCode === 'NH2') {
          const nx = atom.x + BOND_LEN * Math.cos(baseAngle);
          const ny = atom.y + BOND_LEN * Math.sin(baseAngle);
          const nAtom = addAtom(nx, ny, 'N');
          addOrUpdateBond(atom.id, nAtom.id, 1);
          showSnapToast('เติมหมู่อะมิโน (-NH₂)');
        } else if (fgCode === 'COOH') {
          atom.el = 'C';
          const o1x = atom.x + BOND_LEN * Math.cos(baseAngle - Math.PI / 3);
          const o1y = atom.y + BOND_LEN * Math.sin(baseAngle - Math.PI / 3);
          const o2x = atom.x + BOND_LEN * Math.cos(baseAngle + Math.PI / 3);
          const o2y = atom.y + BOND_LEN * Math.sin(baseAngle + Math.PI / 3);
          const o1 = addAtom(o1x, o1y, 'O');
          const o2 = addAtom(o2x, o2y, 'O');
          addOrUpdateBond(atom.id, o1.id, 2);
          addOrUpdateBond(atom.id, o2.id, 1);
          showSnapToast('เติมหมู่กรดคาร์บอกซิลิก (-COOH)');
        } else if (fgCode === 'CHO') {
          atom.el = 'C';
          const ox = atom.x + BOND_LEN * Math.cos(baseAngle);
          const oy = atom.y + BOND_LEN * Math.sin(baseAngle);
          const oAtom = addAtom(ox, oy, 'O');
          addOrUpdateBond(atom.id, oAtom.id, 2);
          showSnapToast('เติมหมู่แอลดีไฮด์ (-CHO)');
        } else if (fgCode === 'CN') {
          const cx = atom.x + BOND_LEN * Math.cos(baseAngle);
          const cy = atom.y + BOND_LEN * Math.sin(baseAngle);
          const cAtom = addAtom(cx, cy, 'C');
          addOrUpdateBond(atom.id, cAtom.id, 1);
          const nx = cx + BOND_LEN * Math.cos(baseAngle);
          const ny = cy + BOND_LEN * Math.sin(baseAngle);
          const nAtom = addAtom(nx, ny, 'N');
          addOrUpdateBond(cAtom.id, nAtom.id, 3);
          showSnapToast('เติมหมู่ไนไตรล์ (-C≡N)');
        } else if (fgCode === 'NO2') {
          const nx = atom.x + BOND_LEN * Math.cos(baseAngle);
          const ny = atom.y + BOND_LEN * Math.sin(baseAngle);
          const nAtom = addAtom(nx, ny, 'N', 1);
          addOrUpdateBond(atom.id, nAtom.id, 1);
          const o1 = addAtom(nx + BOND_LEN * Math.cos(baseAngle - Math.PI / 3), ny + BOND_LEN * Math.sin(baseAngle - Math.PI / 3), 'O');
          const o2 = addAtom(nx + BOND_LEN * Math.cos(baseAngle + Math.PI / 3), ny + BOND_LEN * Math.sin(baseAngle + Math.PI / 3), 'O', -1);
          addOrUpdateBond(nAtom.id, o1.id, 2);
          addOrUpdateBond(nAtom.id, o2.id, 1);
          showSnapToast('เติมหมู่ไนโตร (-NO₂)');
        }
        renderCanvas();
        updateMoleculeAnalysis();
      }

      function addRingAtCenter(cx, cy, nSides, isBenzene = false, radiusOverride = null) {
        const R = radiusOverride || (BOND_LEN / (2 * Math.sin(Math.PI / nSides)));
        const ringAtoms = [];
        // Orient flat side on left/right for 6-ring (top vertex at -90 deg)
        const startAngle = -Math.PI / 2;
        for (let i = 0; i < nSides; i++) {
          const theta = startAngle + (i * 2 * Math.PI) / nSides;
          const vx = cx + R * Math.cos(theta);
          const vy = cy + R * Math.sin(theta);
          ringAtoms.push(addAtom(vx, vy, 'C'));
        }
        for (let i = 0; i < nSides; i++) {
          const a1 = ringAtoms[i];
          const a2 = ringAtoms[(i + 1) % nSides];
          const order = (isBenzene && nSides === 6) ? ((i % 2 === 0) ? 2 : 1) : 1;
          addOrUpdateBond(a1.id, a2.id, order, 'none', isBenzene && nSides === 6);
        }
        return ringAtoms;
      }

      function fuseRingToBond(bond, nSides, isBenzene = false) {
        const a1 = getAtom(bond.a1);
        const a2 = getAtom(bond.a2);
        if (!a1 || !a2) return;
        const mx = (a1.x + a2.x) / 2;
        const my = (a1.y + a2.y) / 2;
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const len = Math.hypot(dx, dy) || BOND_LEN;
        const apothem = len / (2 * Math.tan(Math.PI / nSides));
        // Normal vector pointing away from existing atoms centroid
        let nx = -dy / len;
        let ny = dx / len;
        if (atoms.length > 2) {
          const avgX = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
          const avgY = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
          if ((mx + nx * apothem - avgX) ** 2 + (my + ny * apothem - avgY) ** 2 <
              (mx - nx * apothem - avgX) ** 2 + (my - ny * apothem - avgY) ** 2) {
            nx = -nx;
            ny = -ny;
          }
        }
        const cx = mx + nx * apothem;
        const cy = my + ny * apothem;
        const R = len / (2 * Math.sin(Math.PI / nSides));
        const startAngle = Math.atan2(a1.y - cy, a1.x - cx);
        const step = (2 * Math.PI) / nSides;
        // Determine direction from a1 to a2 around center
        const cross = (a1.x - cx) * (a2.y - cy) - (a1.y - cy) * (a2.x - cx);
        const dir = cross >= 0 ? 1 : -1;

        const ringAtoms = [a1, a2];
        for (let i = 2; i < nSides; i++) {
          const theta = startAngle + dir * i * step;
          const vx = cx + R * Math.cos(theta);
          const vy = cy + R * Math.sin(theta);
          ringAtoms.push(addAtom(vx, vy, 'C'));
        }
        for (let i = 0; i < nSides; i++) {
          const u = ringAtoms[i];
          const v = ringAtoms[(i + 1) % nSides];
          if ((u.id === a1.id && v.id === a2.id) || (u.id === a2.id && v.id === a1.id)) {
            if (isBenzene && nSides === 6) bond.aromatic = true;
            continue;
          }
          const order = (isBenzene && nSides === 6) ? ((i % 2 === 0) ? 2 : 1) : 1;
          addOrUpdateBond(u.id, v.id, order, 'none', isBenzene && nSides === 6);
        }
      }

      // =========================================================================
      // 5. IPAD SMART INK ENGINE (RDP SIMPLIFICATION, AUTO-STRAIGHTEN & RING SNAP)
      // =========================================================================
      function rdpSimplify(pts, epsilon) {
        if (pts.length <= 2) return pts.slice();
        let maxDist = 0;
        let index = 0;
        const start = pts[0];
        const end = pts[pts.length - 1];
        for (let i = 1; i < pts.length - 1; i++) {
          const d = pointToSegmentDist(pts[i].x, pts[i].y, start.x, start.y, end.x, end.y);
          if (d > maxDist) {
            index = i;
            maxDist = d;
          }
        }
        if (maxDist > epsilon) {
          const left = rdpSimplify(pts.slice(0, index + 1), epsilon);
          const right = rdpSimplify(pts.slice(index), epsilon);
          return left.slice(0, left.length - 1).concat(right);
        }
        return [start, end];
      }

      function snapEndpointAngle(x1, y1, x2, y2, fixedLength = null) {
        const snapEnabled = document.getElementById('chk-angle-snap').checked;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const rawLen = Math.hypot(dx, dy);
        const len = fixedLength || BOND_LEN;
        if (!snapEnabled) {
          const ang = Math.atan2(dy, dx);
          return { x: x1 + len * Math.cos(ang), y: y1 + len * Math.sin(ang), angleDeg: Math.round(ang * 180 / Math.PI) };
        }
        let deg = Math.atan2(dy, dx) * (180 / Math.PI);
        const snappedDeg = Math.round(deg / 30) * 30;
        const rad = snappedDeg * (Math.PI / 180);
        return {
          x: x1 + len * Math.cos(rad),
          y: y1 + len * Math.sin(rad),
          angleDeg: snappedDeg,
          rawLen
        };
      }

      function detect6RingContainingPoint(px, py) {
        // Find all 6-membered rings and check if (px, py) is near the center of one
        const rings = findSmallRings(6);
        for (const ringIds of rings) {
          if (ringIds.length !== 6) continue;
          const rAtoms = ringIds.map(id => getAtom(id)).filter(Boolean);
          if (rAtoms.length !== 6) continue;
          const cx = rAtoms.reduce((s, a) => s + a.x, 0) / 6;
          const cy = rAtoms.reduce((s, a) => s + a.y, 0) / 6;
          if (Math.hypot(px - cx, py - cy) < BOND_LEN * 0.85) {
            return ringIds;
          }
        }
        return null;
      }

      function convertRingToBenzene(ringIds) {
        for (let i = 0; i < 6; i++) {
          const u = ringIds[i];
          const v = ringIds[(i + 1) % 6];
          const b = getBondBetween(u, v);
          if (b) {
            b.order = (i % 2 === 0) ? 2 : 1;
            b.aromatic = true;
          }
        }
      }

      function processSmartInkStroke(pts) {
        if (pts.length < 2) return;
        const pStart = pts[0];
        const pEnd = pts[pts.length - 1];
        const directDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);

        // Calculate total path length & bounding box
        let pathLen = 0;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < pts.length; i++) {
          if (i > 0) pathLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          minX = Math.min(minX, pts[i].x);
          maxX = Math.max(maxX, pts[i].x);
          minY = Math.min(minY, pts[i].y);
          maxY = Math.max(maxY, pts[i].y);
        }
        const diag = Math.hypot(maxX - minX, maxY - minY);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // 1. Tap Gesture (very short stroke) -> Open floating atom picker on existing atom or cycle bond order
        if (pathLen < 14) {
          const hitAtom = findNearestAtom(pStart.x, pStart.y, 24);
          if (hitAtom) {
            if (activeFG) {
              applyFunctionalGroup(hitAtom.id, activeFG);
            } else if (activeChargeDelta) {
              saveHistory();
              hitAtom.charge = Math.max(-3, Math.min(3, (hitAtom.charge || 0) + activeChargeDelta));
              renderCanvas();
              updateMoleculeAnalysis();
            } else if (activeElement !== 'C' && hitAtom.el !== activeElement) {
              saveHistory();
              hitAtom.el = activeElement;
              showSnapToast(`เปลี่ยนอะตอมเป็น ${activeElement}`);
              renderCanvas();
              updateMoleculeAnalysis();
            } else {
              showAtomPicker(hitAtom);
            }
            return;
          }
          const hitBond = findNearestBond(pStart.x, pStart.y, 18);
          if (hitBond) {
            saveHistory();
            hitBond.order = (hitBond.order % 3) + 1;
            hitBond.aromatic = false;
            showSnapToast(`เปลี่ยนเป็นพันธะ${hitBond.order === 2 ? 'คู่ (=)' : hitBond.order === 3 ? 'สาม (≡)' : 'เดี่ยว (—)'}`);
            renderCanvas();
            updateMoleculeAnalysis();
          }
          return;
        }

        // 2. Scribble-to-Erase Gesture (high pathLen relative to small bounding box & many direction reversals)
        const simplifiedRough = rdpSimplify(pts, 10);
        if (simplifiedRough.length >= 6 && pathLen > diag * 2.8 && directDist < diag * 0.75) {
          const hitAtom = findNearestAtom(cx, cy, 35);
          const hitBond = findNearestBond(cx, cy, 28);
          if (hitAtom || hitBond) {
            saveHistory();
            if (hitAtom) removeAtom(hitAtom.id);
            else if (hitBond) removeBond(hitBond.id);
            showSnapToast('ลบชิ้นส่วนด้วยท่าทางขีดฆ่าแล้ว');
            renderCanvas();
            updateMoleculeAnalysis();
            return;
          }
        }

        // 3. Closed Loop Gesture (Ring Recognition: Triangle, Square, Pentagon, Hexagon, or Benzene circle inside ring)
        const isClosedLoop = pathLen > 85 && directDist < Math.max(48, diag * 0.48) && diag > 32;
        if (isClosedLoop) {
          saveHistory();
          // Check if user drew a circle inside an existing 6-membered ring -> make it Benzene!
          const inside6Ring = detect6RingContainingPoint(cx, cy);
          if (inside6Ring) {
            convertRingToBenzene(inside6Ring);
            showSnapToast('เปลี่ยนเป็นวงเบนซีน (Aromatic Ring) ตามแบบ!');
            renderCanvas();
            updateMoleculeAnalysis();
            return;
          }

          // Count corners using RDP simplification
          const poly = rdpSimplify(pts, Math.max(10, diag * 0.11));
          // Merge close endpoints
          let corners = poly.length - 1;
          let nSides = 6;
          if (corners <= 3) nSides = 3;
          else if (corners === 4) nSides = 4;
          else if (corners === 5) nSides = 5;
          else if (corners >= 6) nSides = 6;

          // Check if drawn adjacent to an existing bond to fuse
          const nearBond = findNearestBond(cx, cy, BOND_LEN * 0.95);
          if (nearBond && atoms.length >= 2) {
            fuseRingToBond(nearBond, nSides, false);
            showSnapToast(`เชื่อมวงแหวน ${nSides} เหลี่ยมเข้ากับโครงสร้างเดิม!`);
          } else {
            addRingAtCenter(cx, cy, nSides, false);
            const ringNames = { 3: 'สามเหลี่ยม (Cyclopropane)', 4: 'สี่เหลี่ยม (Cyclobutane)', 5: 'ห้าเหลี่ยม (Cyclopentane)', 6: 'หกเหลี่ยม (Cyclohexane)' };
            showSnapToast(`ดัดเป็นวง${ringNames[nSides] || nSides + ' เหลี่ยม'}ด้านเท่าตามแบบ!`);
          }
          renderCanvas();
          updateMoleculeAnalysis();
          return;
        }

        // 4. Check if stroke is a single straight line vs multi-segment zigzag chain
        const simplified = rdpSimplify(pts, 14);

        if (simplified.length === 2) {
          // Single straight stroke!
          saveHistory();

          // Check if user drew a parallel line right next to an existing bond -> upgrade bond order!
          const midX = (pStart.x + pEnd.x) / 2;
          const midY = (pStart.y + pEnd.y) / 2;
          const startAtom = findNearestAtom(pStart.x, pStart.y, SNAP_RADIUS);
          const endAtom = findNearestAtom(pEnd.x, pEnd.y, SNAP_RADIUS);

          if (startAtom && endAtom && startAtom.id !== endAtom.id) {
            const existingBond = getBondBetween(startAtom.id, endAtom.id);
            if (existingBond) {
              existingBond.order = (existingBond.order % 3) + 1;
              existingBond.aromatic = false;
              showSnapToast(`เปลี่ยนเป็นพันธะ${existingBond.order === 2 ? 'คู่ (=)' : existingBond.order === 3 ? 'สาม (≡)' : 'เดี่ยว (—)'}`);
              renderCanvas();
              updateMoleculeAnalysis();
              return;
            }
            // Connect two existing atoms directly
            addOrUpdateBond(startAtom.id, endAtom.id, 1);
            showSnapToast('เชื่อมพันธะระหว่างอะตอมแล้ว');
            renderCanvas();
            updateMoleculeAnalysis();
            return;
          }

          // Check if parallel stroke near midpoint of an existing bond without touching other atoms
          const parallelBond = findNearestBond(midX, midY, 20);
          if (parallelBond && !startAtom && !endAtom) {
            const ba1 = getAtom(parallelBond.a1);
            const ba2 = getAtom(parallelBond.a2);
            if (ba1 && ba2) {
              const bAng = Math.atan2(ba2.y - ba1.y, ba2.x - ba1.x);
              const sAng = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
              const diff = Math.abs(Math.sin(bAng - sAng));
              if (diff < 0.45 && directDist < BOND_LEN * 1.35) {
                parallelBond.order = (parallelBond.order % 3) + 1;
                parallelBond.aromatic = false;
                showSnapToast(`ขีดเส้นขนาน: เปลี่ยนเป็นพันธะ${parallelBond.order === 2 ? 'คู่ (=)' : parallelBond.order === 3 ? 'สาม (≡)' : 'เดี่ยว (—)'}`);
                renderCanvas();
                updateMoleculeAnalysis();
                return;
              }
            }
          }

          // Standard single bond creation with angle & length snapping
          const a1 = startAtom || addAtom(pStart.x, pStart.y, activeElement);
          let a2 = endAtom;
          if (!a2) {
            const snapped = snapEndpointAngle(a1.x, a1.y, pEnd.x, pEnd.y, BOND_LEN);
            a2 = addAtom(snapped.x, snapped.y, activeElement);
          }
          addOrUpdateBond(a1.id, a2.id, 1);
          showSnapToast('ดัดเส้นตรงและล็อกมุมพันธะตามแบบ ACS');
          renderCanvas();
          updateMoleculeAnalysis();
          return;
        }

        // 5. Multi-segment Zigzag Stroke (simplified.length >= 3) -> Auto-regularize into crisp Carbon Chain!
        saveHistory();
        let prevAtom = findNearestAtom(simplified[0].x, simplified[0].y, SNAP_RADIUS) ||
                       addAtom(simplified[0].x, simplified[0].y, activeElement);

        for (let i = 1; i < simplified.length; i++) {
          const targetPt = simplified[i];
          const rawSegLen = Math.hypot(targetPt.x - simplified[i - 1].x, targetPt.y - simplified[i - 1].y);
          if (rawSegLen < 16) continue;
          const existingNear = findNearestAtom(targetPt.x, targetPt.y, SNAP_RADIUS);
          let nextAtom;
          if (existingNear && existingNear.id !== prevAtom.id) {
            nextAtom = existingNear;
          } else {
            const snapped = snapEndpointAngle(prevAtom.x, prevAtom.y, targetPt.x, targetPt.y, BOND_LEN);
            nextAtom = addAtom(snapped.x, snapped.y, activeElement);
          }
          addOrUpdateBond(prevAtom.id, nextAtom.id, 1);
          prevAtom = nextAtom;
        }
        showSnapToast(`ดัดเส้นซิกแซกเป็นโซ่คาร์บอน ${simplified.length} อะตอมตามแบบ!`);
        renderCanvas();
        updateMoleculeAnalysis();
      }

      // =========================================================================
      // 6. BEAUTIFY / 2D CLEANUP TO ACS STANDARD GEOMETRY
      // =========================================================================
      function beautifyStructure() {
        if (atoms.length === 0) return;
        saveHistory();

        // Find rings so we don't distort regular polygons
        const rings3to8 = [
          ...findSmallRings(3),
          ...findSmallRings(4),
          ...findSmallRings(5),
          ...findSmallRings(6),
          ...findSmallRings(7),
          ...findSmallRings(8)
        ];
        const ringAtomSet = new Set();
        rings3to8.forEach(r => r.forEach(id => ringAtomSet.add(id)));

        // Regularize each isolated ring first
        const visitedAtoms = new Set();
        for (const rIds of rings3to8) {
          if (rIds.some(id => visitedAtoms.has(id))) continue;
          const n = rIds.length;
          const rAtoms = rIds.map(id => getAtom(id)).filter(Boolean);
          if (rAtoms.length !== n) continue;
          const cx = rAtoms.reduce((s, a) => s + a.x, 0) / n;
          const cy = rAtoms.reduce((s, a) => s + a.y, 0) / n;
          const R = BOND_LEN / (2 * Math.sin(Math.PI / n));
          // Keep orientation close to first atom's angle snapped to 30 deg
          let a0 = Math.atan2(rAtoms[0].y - cy, rAtoms[0].x - cx);
          a0 = Math.round(a0 / (Math.PI / 6)) * (Math.PI / 6);
          const cross = (rAtoms[0].x - cx) * (rAtoms[1].y - cy) - (rAtoms[0].y - cy) * (rAtoms[1].x - cx);
          const dir = cross >= 0 ? 1 : -1;
          for (let i = 0; i < n; i++) {
            const theta = a0 + dir * (i * 2 * Math.PI) / n;
            rAtoms[i].x = cx + R * Math.cos(theta);
            rAtoms[i].y = cy + R * Math.sin(theta);
            visitedAtoms.add(rAtoms[i].id);
          }
        }

        // BFS traversal to snap non-ring bond lengths to BOND_LEN and angles to 30-deg increments
        for (const startAtom of atoms) {
          if (!visitedAtoms.has(startAtom.id)) {
            visitedAtoms.add(startAtom.id);
          }
          const queue = [startAtom.id];
          while (queue.length > 0) {
            const currId = queue.shift();
            const curr = getAtom(currId);
            if (!curr) continue;
            const nbrs = getNeighbors(currId);
            for (const { atom: nb } of nbrs) {
              if (visitedAtoms.has(nb.id)) continue;
              visitedAtoms.add(nb.id);
              const snapped = snapEndpointAngle(curr.x, curr.y, nb.x, nb.y, BOND_LEN);
              nb.x = snapped.x;
              nb.y = snapped.y;
              queue.push(nb.id);
            }
          }
        }

        centerStructureOnCanvas(false);
        showSnapToast('จัดระเบียบความยาวพันธะและมุม 120° ตามมาตรฐาน ACS แล้ว');
        renderCanvas();
        updateMoleculeAnalysis();
      }

      function centerStructureOnCanvas(recordHistory = true) {
        if (atoms.length === 0) return;
        if (recordHistory) saveHistory();
        const minX = Math.min(...atoms.map(a => a.x));
        const maxX = Math.max(...atoms.map(a => a.x));
        const minY = Math.min(...atoms.map(a => a.y));
        const maxY = Math.max(...atoms.map(a => a.y));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const targetX = canvas.width / 2;
        const targetY = canvas.height / 2;
        const dx = targetX - cx;
        const dy = targetY - cy;
        atoms.forEach(a => {
          a.x += dx;
          a.y += dy;
        });
        renderCanvas();
      }

      // =========================================================================
      // 7. CANVAS RENDERING (ACS PUBLICATION STYLE + LIVE SMART INK PREVIEW)
      // =========================================================================
      function shouldShowCarbonLabel(atom) {
        if (atom.el !== 'C') return true;
        if (atom.charge && atom.charge !== 0) return true;
        const nbrs = getNeighbors(atom.id);
        if (nbrs.length === 0) return true; // Isolated CH4
        // Cumulene / linear carbon with two double bonds
        if (nbrs.length === 2 && nbrs[0].bond.order === 2 && nbrs[1].bond.order === 2) return true;
        return false;
      }

      function renderCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Highlight aromatic rings with inner dashed/solid circle if benzene-like
        const rings6 = findSmallRings(6);
        for (const rIds of rings6) {
          const rBonds = [];
          for (let i = 0; i < 6; i++) {
            const b = getBondBetween(rIds[i], rIds[(i + 1) % 6]);
            if (b) rBonds.push(b);
          }
          if (rBonds.length === 6 && rBonds.every(b => b.aromatic)) {
            const rAtoms = rIds.map(id => getAtom(id)).filter(Boolean);
            const cx = rAtoms.reduce((s, a) => s + a.x, 0) / 6;
            const cy = rAtoms.reduce((s, a) => s + a.y, 0) / 6;
            ctx.save();
            ctx.strokeStyle = 'rgba(200, 75, 49, 0.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, BOND_LEN * 0.56, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Calculate global centroid for double bond inner-side offset
        const globalCx = atoms.length ? atoms.reduce((s, a) => s + a.x, 0) / atoms.length : canvas.width / 2;
        const globalCy = atoms.length ? atoms.reduce((s, a) => s + a.y, 0) / atoms.length : canvas.height / 2;

        // 2. Render Bonds
        for (const b of bonds) {
          const a1 = getAtom(b.a1);
          const a2 = getAtom(b.a2);
          if (!a1 || !a2) continue;

          const isHover = (b.id === hoverBondId);
          const dx = a2.x - a1.x;
          const dy = a2.y - a1.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          let nx = -uy;
          let ny = ux;

          if (isHover) {
            ctx.save();
            ctx.strokeStyle = 'rgba(200, 75, 49, 0.22)';
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();
            ctx.restore();
          }

          ctx.save();
          ctx.strokeStyle = '#1A1A1A';
          ctx.fillStyle = '#1A1A1A';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';

          if (b.stereo === 'wedge') {
            const halfW = 6.5;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x + nx * halfW, a2.y + ny * halfW);
            ctx.lineTo(a2.x - nx * halfW, a2.y - ny * halfW);
            ctx.closePath();
            ctx.fill();
          } else if (b.stereo === 'dash') {
            const steps = 7;
            const maxW = 6.5;
            ctx.lineWidth = 2.1;
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const px = a1.x + dx * t;
              const py = a1.y + dy * t;
              const w = maxW * t;
              ctx.beginPath();
              ctx.moveTo(px - nx * w, py - ny * w);
              ctx.lineTo(px + nx * w, py + ny * w);
              ctx.stroke();
            }
          } else if (b.order === 1) {
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();
          } else if (b.order === 2) {
            // Orient secondary line toward ring center or molecule centroid
            const mx = (a1.x + a2.x) / 2;
            const my = (a1.y + a2.y) / 2;
            if ((mx + nx * 10 - globalCx) ** 2 + (my + ny * 10 - globalCy) ** 2 >
                (mx - nx * 10 - globalCx) ** 2 + (my - ny * 10 - globalCy) ** 2) {
              nx = -nx;
              ny = -ny;
            }
            const offset = 6.2;
            const inset = 6.5;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(a1.x + nx * offset + ux * inset, a1.y + ny * offset + uy * inset);
            ctx.lineTo(a2.x + nx * offset - ux * inset, a2.y + ny * offset - uy * inset);
            ctx.stroke();
          } else if (b.order === 3) {
            const offset = 5.5;
            const inset = 5.0;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(a1.x + nx * offset + ux * inset, a1.y + ny * offset + uy * inset);
            ctx.lineTo(a2.x + nx * offset - ux * inset, a2.y + ny * offset - uy * inset);
            ctx.moveTo(a1.x - nx * offset + ux * inset, a1.y - ny * offset + uy * inset);
            ctx.lineTo(a2.x - nx * offset - ux * inset, a2.y - ny * offset - uy * inset);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 3. Render Atoms & Implicit Hydrogens
        for (const a of atoms) {
          const isHover = (a.id === hoverAtomId || a.id === pickerTargetAtomId);
          if (isHover) {
            ctx.save();
            ctx.fillStyle = 'rgba(31, 111, 97, 0.16)';
            ctx.beginPath();
            ctx.arc(a.x, a.y, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Subtle vertex dot on skeletal carbons so iPad users can see tap targets clearly
            ctx.save();
            ctx.fillStyle = 'rgba(26, 26, 26, 0.18)';
            ctx.beginPath();
            ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (!shouldShowCarbonLabel(a)) continue;

          const hCount = getImplicitHydrogens(a);
          const info = ATOM_INFO[a.el] || { color: '#1A1A1A' };
          const nbrs = getNeighbors(a.id);
          // Place H on left if sole neighbor is to the right (e.g. HO-CH2-...)
          let hOnLeft = false;
          if (nbrs.length === 1 && nbrs[0].atom.x > a.x + 12 && (a.el === 'O' || a.el === 'S' || a.el === 'N')) {
            hOnLeft = true;
          }

          let labelText = a.el;
          if (hCount > 0) {
            const hStr = hCount === 1 ? 'H' : 'H' + toSubscript(hCount);
            labelText = hOnLeft ? (hStr + a.el) : (a.el + hStr);
          }
          if (a.charge) {
            const cAbs = Math.abs(a.charge);
            const cSign = a.charge > 0 ? '⁺' : '⁻';
            labelText += (cAbs > 1 ? toSuperscript(cAbs) : '') + cSign;
          }

          ctx.save();
          ctx.font = '700 16px "Inter", "Noto Sans Thai", sans-serif';
          const textMetrics = ctx.measureText(labelText);
          const padX = 5;
          const boxW = textMetrics.width + padX * 2;
          const boxH = 22;

          // White mask behind heteroatom label so bonds stop cleanly
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(a.x - boxW / 2, a.y - boxH / 2, boxW, boxH, 6);
          ctx.fill();

          ctx.fillStyle = info.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, a.x, a.y + 1);
          ctx.restore();
        }

        // 4. Render Live Freehand Ink / Ghost Snapped Preview while drawing
        if (isDrawing && strokePoints.length >= 2) {
          if (activeTool === 'smart') {
            // Draw soft freehand ink trail
            ctx.save();
            ctx.strokeStyle = 'rgba(31, 111, 97, 0.45)';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
            for (let i = 1; i < strokePoints.length; i++) {
              ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
            }
            ctx.stroke();

            // Draw crisp ghost preview of snapped line if single stroke
            const p0 = strokePoints[0];
            const pLast = strokePoints[strokePoints.length - 1];
            const simp = rdpSimplify(strokePoints, 14);
            if (simp.length === 2 && Math.hypot(pLast.x - p0.x, pLast.y - p0.y) > 16) {
              const startNear = findNearestAtom(p0.x, p0.y, SNAP_RADIUS);
              const sx = startNear ? startNear.x : p0.x;
              const sy = startNear ? startNear.y : p0.y;
              const snapped = snapEndpointAngle(sx, sy, pLast.x, pLast.y, BOND_LEN);
              ctx.strokeStyle = '#C84B31';
              ctx.lineWidth = 2.6;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(snapped.x, snapped.y);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = '#C84B31';
              ctx.beginPath();
              ctx.arc(snapped.x, snapped.y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          } else if (activeTool.startsWith('bond-')) {
            const p0 = strokePoints[0];
            const pLast = strokePoints[strokePoints.length - 1];
            const startAtom = dragStartAtomId ? getAtom(dragStartAtomId) : null;
            const sx = startAtom ? startAtom.x : p0.x;
            const sy = startAtom ? startAtom.y : p0.y;
            const nearEnd = findNearestAtom(pLast.x, pLast.y, SNAP_RADIUS);
            const snapped = nearEnd ? { x: nearEnd.x, y: nearEnd.y } : snapEndpointAngle(sx, sy, pLast.x, pLast.y, BOND_LEN);
            ctx.save();
            ctx.strokeStyle = '#C84B31';
            ctx.lineWidth = 2.6;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(snapped.x, snapped.y);
            ctx.stroke();
            ctx.restore();
          } else if (activeTool === 'chain') {
            ctx.save();
            ctx.strokeStyle = '#C84B31';
            ctx.lineWidth = 2.6;
            ctx.setLineDash([5, 4]);
            const chainPts = computeZigzagPreviewPoints(strokePoints[0], strokePoints[strokePoints.length - 1]);
            if (chainPts.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(chainPts[0].x, chainPts[0].y);
              for (let i = 1; i < chainPts.length; i++) {
                ctx.lineTo(chainPts[i].x, chainPts[i].y);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      function computeZigzagPreviewPoints(pStart, pEnd) {
        const startAtom = findNearestAtom(pStart.x, pStart.y, SNAP_RADIUS);
        const sx = startAtom ? startAtom.x : pStart.x;
        const sy = startAtom ? startAtom.y : pStart.y;
        const dx = pEnd.x - sx;
        const dy = pEnd.y - sy;
        const totalDist = Math.hypot(dx, dy);
        const baseAngle = Math.atan2(dy, dx);
        const stepSpan = BOND_LEN * Math.cos(Math.PI / 6); // ~50px per step
        const numSegments = Math.max(1, Math.min(12, Math.round(totalDist / stepSpan)));
        const pts = [{ x: sx, y: sy }];
        let cx = sx, cy = sy;
        for (let i = 0; i < numSegments; i++) {
          const offsetAngle = baseAngle + ((i % 2 === 0) ? -Math.PI / 6 : Math.PI / 6);
          cx += BOND_LEN * Math.cos(offsetAngle);
          cy += BOND_LEN * Math.sin(offsetAngle);
          pts.push({ x: cx, y: cy });
        }
        return pts;
      }

      function toSubscript(n) {
        const map = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
        return String(n).split('').map(c => map[c] || c).join('');
      }

      function toSuperscript(n) {
        const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        return String(n).split('').map(c => map[c] || c).join('');
      }

      // =========================================================================
      // 8. POINTER EVENTS FOR IPAD / APPLE PENCIL / TOUCH / MOUSE
      // =========================================================================
      function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      }

      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const pt = getCanvasCoords(e);

        // Close picker if clicking outside
        if (pickerTargetAtomId !== null) {
          hideAtomPicker();
        }

        // Ring template tools
        if (activeTool.startsWith('ring-')) {
          saveHistory();
          const isBenzene = (activeTool === 'ring-ben');
          const nSides = isBenzene ? 6 : parseInt(activeTool.split('-')[1], 10);
          const hitBond = findNearestBond(pt.x, pt.y, BOND_HIT_RADIUS + 6);
          if (hitBond) {
            fuseRingToBond(hitBond, nSides, isBenzene);
            showSnapToast(`เชื่อมวงแหวน ${isBenzene ? 'เบนซีน' : nSides + ' เหลี่ยม'} เข้ากับพันธะแล้ว`);
          } else {
            addRingAtCenter(pt.x, pt.y, nSides, isBenzene);
            showSnapToast(`วางวงแหวน ${isBenzene ? 'เบนซีน' : nSides + ' เหลี่ยม'} แล้ว`);
          }
          renderCanvas();
          updateMoleculeAnalysis();
          return;
        }

        // Erase tool
        if (activeTool === 'erase') {
          const hitAtom = findNearestAtom(pt.x, pt.y, SNAP_RADIUS);
          const hitBond = findNearestBond(pt.x, pt.y, BOND_HIT_RADIUS);
          if (hitAtom || hitBond) {
            saveHistory();
            if (hitAtom) removeAtom(hitAtom.id);
            else if (hitBond) removeBond(hitBond.id);
            renderCanvas();
            updateMoleculeAnalysis();
          }
          isDrawing = true;
          return;
        }

        // Move tool
        if (activeTool === 'move') {
          const hitAtom = findNearestAtom(pt.x, pt.y, SNAP_RADIUS);
          if (hitAtom) {
            saveHistory();
            movingAtomId = hitAtom.id;
            isDrawing = true;
          }
          return;
        }

        // Bond / Smart / Chain tools
        isDrawing = true;
        hasSnappedDuringHold = false;
        strokePoints = [pt];
        const nearAtom = findNearestAtom(pt.x, pt.y, SNAP_RADIUS);
        dragStartAtomId = nearAtom ? nearAtom.id : null;
        renderCanvas();
      });

      canvas.addEventListener('pointermove', (e) => {
        const pt = getCanvasCoords(e);

        if (!isDrawing) {
          const nearA = findNearestAtom(pt.x, pt.y, SNAP_RADIUS);
          const nearB = nearA ? null : findNearestBond(pt.x, pt.y, BOND_HIT_RADIUS);
          const prevA = hoverAtomId;
          const prevB = hoverBondId;
          hoverAtomId = nearA ? nearA.id : null;
          hoverBondId = nearB ? nearB.id : null;
          if (prevA !== hoverAtomId || prevB !== hoverBondId) {
            renderCanvas();
          }
          return;
        }

        if (activeTool === 'erase') {
          const hitAtom = findNearestAtom(pt.x, pt.y, 18);
          const hitBond = findNearestBond(pt.x, pt.y, 14);
          if (hitAtom) {
            removeAtom(hitAtom.id);
            renderCanvas();
            updateMoleculeAnalysis();
          } else if (hitBond) {
            removeBond(hitBond.id);
            renderCanvas();
            updateMoleculeAnalysis();
          }
          return;
        }

        if (activeTool === 'move' && movingAtomId !== null) {
          const a = getAtom(movingAtomId);
          if (a) {
            a.x = pt.x;
            a.y = pt.y;
            renderCanvas();
          }
          return;
        }

        strokePoints.push(pt);

        // QuickShape hold-to-snap timer for iPad Smart Mode (380ms pause while holding stylus)
        if (activeTool === 'smart' && !hasSnappedDuringHold) {
          if (holdTimer) clearTimeout(holdTimer);
          holdTimer = setTimeout(() => {
            if (isDrawing && strokePoints.length >= 4 && !hasSnappedDuringHold) {
              const p0 = strokePoints[0];
              const pLast = strokePoints[strokePoints.length - 1];
              if (Math.hypot(pLast.x - p0.x, pLast.y - p0.y) > 25 || strokePoints.length > 15) {
                hasSnappedDuringHold = true;
                processSmartInkStroke(strokePoints);
                strokePoints = [pLast];
              }
            }
          }, 380);
        }

        renderCanvas();
      });

      function endPointerStroke() {
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
        if (!isDrawing) return;
        isDrawing = false;

        if (activeTool === 'move') {
          movingAtomId = null;
          updateMoleculeAnalysis();
          return;
        }
        if (activeTool === 'erase') {
          return;
        }

        if (activeTool === 'smart') {
          if (!hasSnappedDuringHold) {
            processSmartInkStroke(strokePoints);
          }
          strokePoints = [];
          renderCanvas();
          return;
        }

        if (activeTool === 'chain' && strokePoints.length >= 2) {
          saveHistory();
          const pts = computeZigzagPreviewPoints(strokePoints[0], strokePoints[strokePoints.length - 1]);
          let prev = addAtom(pts[0].x, pts[0].y, activeElement);
          for (let i = 1; i < pts.length; i++) {
            const next = addAtom(pts[i].x, pts[i].y, activeElement);
            addOrUpdateBond(prev.id, next.id, 1);
            prev = next;
          }
          showSnapToast(`สร้างโซ่ซิกแซก ${pts.length} อะตอมแล้ว`);
          strokePoints = [];
          renderCanvas();
          updateMoleculeAnalysis();
          return;
        }

        if (activeTool.startsWith('bond-') && strokePoints.length >= 1) {
          const p0 = strokePoints[0];
          const pLast = strokePoints[strokePoints.length - 1];
          const dist = Math.hypot(pLast.x - p0.x, pLast.y - p0.y);
          const order = activeTool === 'bond-2' ? 2 : activeTool === 'bond-3' ? 3 : 1;
          const stereo = activeTool === 'bond-wedge' ? 'wedge' : activeTool === 'bond-dash' ? 'dash' : 'none';

          saveHistory();
          if (dist < 14) {
            // Clicked on existing bond or atom
            const hitBond = findNearestBond(p0.x, p0.y, BOND_HIT_RADIUS);
            if (hitBond) {
              addOrUpdateBond(hitBond.a1, hitBond.a2, order, stereo, false);
            } else {
              const hitAtom = findNearestAtom(p0.x, p0.y, SNAP_RADIUS);
              if (hitAtom) {
                if (activeFG) {
                  applyFunctionalGroup(hitAtom.id, activeFG);
                } else {
                  const ang = chooseBestSproutAngle(hitAtom.id);
                  const nx = hitAtom.x + BOND_LEN * Math.cos(ang);
                  const ny = hitAtom.y + BOND_LEN * Math.sin(ang);
                  const nAtom = addAtom(nx, ny, activeElement);
                  addOrUpdateBond(hitAtom.id, nAtom.id, order, stereo, false);
                }
              } else {
                const a1 = addAtom(p0.x, p0.y, activeElement);
                const a2 = addAtom(p0.x + BOND_LEN * Math.cos(-Math.PI / 6), p0.y + BOND_LEN * Math.sin(-Math.PI / 6), activeElement);
                addOrUpdateBond(a1.id, a2.id, order, stereo, false);
              }
            }
          } else {
            const a1 = dragStartAtomId ? getAtom(dragStartAtomId) : addAtom(p0.x, p0.y, activeElement);
            const nearEnd = findNearestAtom(pLast.x, pLast.y, SNAP_RADIUS);
            let a2 = nearEnd;
            if (!a2 || a2.id === a1.id) {
              const snapped = snapEndpointAngle(a1.x, a1.y, pLast.x, pLast.y, BOND_LEN);
              a2 = addAtom(snapped.x, snapped.y, activeElement);
            }
            addOrUpdateBond(a1.id, a2.id, order, stereo, false);
          }
          strokePoints = [];
          dragStartAtomId = null;
          renderCanvas();
          updateMoleculeAnalysis();
        }
      }

      canvas.addEventListener('pointerup', endPointerStroke);
      canvas.addEventListener('pointercancel', endPointerStroke);

      // =========================================================================
      // 9. FLOATING ATOM PICKER & TOAST FEEDBACK
      // =========================================================================
      const pickerEl = document.getElementById('floating-atom-picker');
      function showAtomPicker(atom) {
        pickerTargetAtomId = atom.id;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        const leftPx = Math.min(rect.width - 255, Math.max(8, atom.x * scaleX - 90));
        const topPx = Math.min(rect.height - 115, Math.max(8, atom.y * scaleY + 20));
        pickerEl.style.left = leftPx + 'px';
        pickerEl.style.top = topPx + 'px';
        pickerEl.classList.remove('hidden');
        renderCanvas();
      }

      function hideAtomPicker() {
        pickerTargetAtomId = null;
        pickerEl.classList.add('hidden');
        renderCanvas();
      }

      document.getElementById('btn-close-picker').addEventListener('click', hideAtomPicker);

      pickerEl.querySelectorAll('[data-pick-atom]').forEach(btn => {
        btn.addEventListener('click', () => {
          const el = btn.getAttribute('data-pick-atom');
          const target = getAtom(pickerTargetAtomId);
          if (target) {
            saveHistory();
            target.el = el;
            showSnapToast(`เปลี่ยนอะตอมเป็น ${el}`);
            hideAtomPicker();
            updateMoleculeAnalysis();
          }
        });
      });

      pickerEl.querySelectorAll('[data-pick-fg]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fg = btn.getAttribute('data-pick-fg');
          const id = pickerTargetAtomId;
          hideAtomPicker();
          if (id) applyFunctionalGroup(id, fg);
        });
      });

      pickerEl.querySelectorAll('[data-pick-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = pickerTargetAtomId;
          hideAtomPicker();
          if (id) {
            saveHistory();
            removeAtom(id);
            renderCanvas();
            updateMoleculeAnalysis();
          }
        });
      });

      let toastTimer = null;
      function showSnapToast(msg) {
        const toast = document.getElementById('smart-snap-toast');
        const text = document.getElementById('smart-snap-toast-text');
        text.textContent = msg;
        toast.classList.add('show');
        toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toast.classList.remove('show');
          toast.classList.remove('show');
        }, 2400);
      }

      // =========================================================================
      // 10. SMILES GENERATOR, RING DETECTION & FORMULA/MW CALCULATOR
      // =========================================================================
      function findSmallRings(targetSize) {
        const foundRings = [];
        const seenKeys = new Set();

        function dfs(startId, currId, path) {
          if (path.length === targetSize) {
            if (getBondBetween(currId, startId)) {
              const key = path.slice().sort((a, b) => a - b).join('-');
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                foundRings.push(path.slice());
              }
            }
            return;
          }
          for (const { atom: nb } of getNeighbors(currId)) {
            if (nb.id === startId && path.length < targetSize) continue;
            if (path.includes(nb.id)) continue;
            path.push(nb.id);
            dfs(startId, nb.id, path);
            path.pop();
          }
        }

        for (const a of atoms) {
          dfs(a.id, a.id, [a.id]);
        }
        return foundRings;
      }

      function generateSMILES() {
        if (atoms.length === 0) return '';
        const visited = new Set();
        const edgeUsed = new Set();
        const ringClosures = new Map(); // atomId -> [{ num, bond }]
        let nextRingNum = 1;

        // First DFS pass to find spanning tree & back-edges (ring closures)
        const treeChildren = new Map();
        atoms.forEach(a => treeChildren.set(a.id, []));

        function dfsSpan(uId, parentId) {
          visited.add(uId);
          for (const { atom: v, bond } of getNeighbors(uId)) {
            if (v.id === parentId) continue;
            const eKey = Math.min(uId, v.id) + ':' + Math.max(uId, v.id);
            if (edgeUsed.has(eKey)) continue;
            edgeUsed.add(eKey);
            if (visited.has(v.id)) {
              const rNum = nextRingNum++;
              if (!ringClosures.has(uId)) ringClosures.set(uId, []);
              if (!ringClosures.has(v.id)) ringClosures.set(v.id, []);
              ringClosures.get(uId).push({ num: rNum, bond, first: true });
              ringClosures.get(v.id).push({ num: rNum, bond, first: false });
            } else {
              treeChildren.get(uId).push({ childId: v.id, bond });
              dfsSpan(v.id, uId);
            }
          }
        }

        const components = [];
        for (const a of atoms) {
          if (!visited.has(a.id)) {
            dfsSpan(a.id, null);
            components.push(buildSmilesNode(a.id, null));
          }
        }

        function formatAtomSmiles(a) {
          const isArom = getNeighbors(a.id).some(n => n.bond.aromatic);
          if (!a.charge || a.charge === 0) {
            if (['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'].includes(a.el)) {
              return isArom && a.el === 'C' ? 'c' : a.el;
            }
          }
          const h = getImplicitHydrogens(a);
          const hPart = h === 0 ? '' : h === 1 ? 'H' : 'H' + h;
          const cPart = !a.charge ? '' : a.charge > 0 ? ('+' + (a.charge > 1 ? a.charge : '')) : ('-' + (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : ''));
          return `[${a.el}${hPart}${cPart}]`;
        }

        function bondSymbol(bond, childAtom) {
          if (!bond) return '';
          if (bond.aromatic) return '';
          if (bond.order === 2) return '=';
          if (bond.order === 3) return '#';
          return '';
        }

        function buildSmilesNode(uId, inBond) {
          const u = getAtom(uId);
          const prefix = bondSymbol(inBond, u);
          let s = prefix + formatAtomSmiles(u);
          const closures = ringClosures.get(uId) || [];
          for (const rc of closures) {
            const bSym = rc.first ? bondSymbol(rc.bond, u) : '';
            s += bSym + rc.num;
          }
          const kids = treeChildren.get(uId) || [];
          for (let i = 0; i < kids.length; i++) {
            const sub = buildSmilesNode(kids[i].childId, kids[i].bond);
            if (i < kids.length - 1) {
              s += '(' + sub + ')';
            } else {
              s += sub;
            }
          }
          return s;
        }

        return components.join('.');
      }

      function calculateFormulaAndWeight() {
        if (atoms.length === 0) return { formulaText: '—', formulaPlain: '', mw: 0 };
        const counts = {};
        let totalH = 0;
        let totalMw = 0;

        for (const a of atoms) {
          counts[a.el] = (counts[a.el] || 0) + 1;
          const h = getImplicitHydrogens(a);
          totalH += h;
          const info = ATOM_INFO[a.el] || { mass: 12.011 };
          totalMw += info.mass + h * ATOM_INFO.H.mass;
        }
        if (totalH > 0) {
          counts.H = (counts.H || 0) + totalH;
        }

        // Hill system order: C first, then H, then alphabetical
        const keys = Object.keys(counts).sort((a, b) => {
          if (a === 'C') return -1;
          if (b === 'C') return 1;
          if (a === 'H') return -1;
          if (b === 'H') return 1;
          return a.localeCompare(b);
        });

        let formulaText = '';
        let formulaPlain = '';
        for (const k of keys) {
          const c = counts[k];
          formulaText += k + (c > 1 ? toSubscript(c) : '');
          formulaPlain += k + (c > 1 ? c : '');
        }
        return { formulaText, formulaPlain, mw: totalMw.toFixed(2) };
      }

      // =========================================================================
      // 11. RULE-BASED IUPAC NOMENCLATURE ENGINE (OFFLINE + EXPLANATION)
      // =========================================================================
      function generateIUPACNameAndBreakdown() {
        if (atoms.length === 0) {
          return {
            iupac: 'ยังไม่มีโครงสร้างบนกระดาน',
            thai: 'วาดโมเลกุลด้วยปากกา iPad หรือเลือกสารตัวอย่างด้านบน',
            common: '—',
            cid: '—',
            breakdown: ['• เริ่มลากเส้นบนกระดานเพื่อดูการวิเคราะห์ชื่อตามกฎ IUPAC']
          };
        }

        const smiles = generateSMILES();
        if (KNOWN_DB[smiles]) {
          const k = KNOWN_DB[smiles];
          return {
            iupac: k.iupac,
            thai: k.thai,
            common: k.common,
            cid: k.cid,
            breakdown: buildRuleExplanation(k.iupac)
          };
        }

        // Single-atom hydrides
        if (atoms.length === 1) {
          const a = atoms[0];
          const singleNames = {
            C: { iupac: 'methane', thai: 'มีเทน (แอลเคน C1)', common: 'Methane', cid: 297 },
            O: { iupac: 'water (oxidane)', thai: 'น้ำ', common: 'Water', cid: 962 },
            N: { iupac: 'ammonia (azane)', thai: 'แอมโมเนีย', common: 'Ammonia', cid: 222 },
            Cl: { iupac: 'hydrogen chloride', thai: 'ไฮโดรเจนคลอไรด์', common: 'HCl', cid: 313 }
          };
          if (singleNames[a.el]) {
            const m = singleNames[a.el];
            return { ...m, breakdown: [`• <strong>อะตอมกลาง:</strong> ${a.el} อิ่มตัวด้วยไฮโดรเจน`, `• <strong>ชื่อ IUPAC:</strong> ${m.iupac}`] };
          }
        }

        // Separate carbon atoms & check for rings
        const carbonAtoms = atoms.filter(a => a.el === 'C');
        if (carbonAtoms.length === 0) {
          return {
            iupac: smiles,
            thai: 'สารอนินทรีย์',
            common: smiles,
            cid: '—',
            breakdown: ['• โครงสร้างไม่มีอะตอมคาร์บอน (สารอนินทรีย์)']
          };
        }

        // Check Benzene ring
        const rings6 = findSmallRings(6);
        for (const rIds of rings6) {
          const rBonds = [];
          for (let i = 0; i < 6; i++) {
            const b = getBondBetween(rIds[i], rIds[(i + 1) % 6]);
            if (b) rBonds.push(b);
          }
          const isBenzene = rBonds.length === 6 && (rBonds.every(b => b.aromatic) || rBonds.filter(b => b.order === 2).length === 3);
          if (isBenzene) {
            return analyzeBenzeneDerivative(rIds);
          }
        }

        // Check Cycloalkane rings (3 to 8 carbons)
        for (let sz = 8; sz >= 3; sz--) {
          const cRings = findSmallRings(sz).filter(r => r.every(id => getAtom(id).el === 'C'));
          if (cRings.length > 0) {
            return analyzeCycloalkane(cRings[0]);
          }
        }

        // Acyclic Carbon Chain Nomenclature
        return analyzeAcyclicChain(carbonAtoms);
      }

      function analyzeBenzeneDerivative(ringIds) {
        const ringSet = new Set(ringIds);
        const subs = [];
        for (let i = 0; i < 6; i++) {
          const cId = ringIds[i];
          const ext = getNeighbors(cId).filter(n => !ringSet.has(n.atom.id));
          if (ext.length > 0) {
            const subAtom = ext[0].atom;
            if (subAtom.el === 'O' && getNeighbors(subAtom.id).length === 1) subs.push({ pos: i + 1, type: 'OH', name: 'hydroxy' });
            else if (subAtom.el === 'N') subs.push({ pos: i + 1, type: 'NH2', name: 'amino' });
            else if (subAtom.el === 'Cl') subs.push({ pos: i + 1, type: 'Cl', name: 'chloro' });
            else if (subAtom.el === 'Br') subs.push({ pos: i + 1, type: 'Br', name: 'bromo' });
            else if (subAtom.el === 'F') subs.push({ pos: i + 1, type: 'F', name: 'fluoro' });
            else if (subAtom.el === 'I') subs.push({ pos: i + 1, type: 'I', name: 'iodo' });
            else if (subAtom.el === 'C') {
              // Check COOH, CHO, or methyl
              const cNbrs = getNeighbors(subAtom.id);
              const hasDoubleO = cNbrs.some(n => n.atom.el === 'O' && n.bond.order === 2);
              const hasSingleO = cNbrs.some(n => n.atom.el === 'O' && n.bond.order === 1);
              if (hasDoubleO && hasSingleO) subs.push({ pos: i + 1, type: 'COOH', name: 'carboxy' });
              else if (hasDoubleO) subs.push({ pos: i + 1, type: 'CHO', name: 'formyl' });
              else subs.push({ pos: i + 1, type: 'Me', name: 'methyl' });
            }
          }
        }

        if (subs.length === 0) {
          return {
            iupac: 'benzene',
            thai: 'เบนซีน (วงอะโรมาติก C6)',
            common: 'Benzene',
            cid: 241,
            breakdown: [
              '• <strong>โครงสร้างหลัก:</strong> วงอะโรมาติก 6 อะตอม (<span class="mono">benzene</span>)',
              '• <strong>พันธะ:</strong> พันธะคู่สลับพันธะเดี่ยว (เรโซแนนซ์)'
            ]
          };
        }
        if (subs.length === 1) {
          const s = subs[0];
          const map1 = {
            OH: { iupac: 'phenol', thai: 'ฟีนอล (ไฮดรอกซีเบนซีน)', common: 'Phenol', cid: 996 },
            NH2: { iupac: 'aniline', thai: 'อะนิลีน (อะมิโนเบนซีน)', common: 'Aniline', cid: 6115 },
            COOH: { iupac: 'benzoic acid', thai: 'กรดเบนโซอิก', common: 'Benzoic acid', cid: 243 },
            CHO: { iupac: 'benzaldehyde', thai: 'เบนซาลดีไฮด์', common: 'Benzaldehyde', cid: 240 },
            Me: { iupac: 'toluene (methylbenzene)', thai: 'โทลูอีน (เมทิลเบนซีน)', common: 'Toluene', cid: 1140 }
          };
          if (map1[s.type]) {
            const m = map1[s.type];
            return {
              ...m,
              breakdown: [
                '• <strong>วงหลัก:</strong> เบนซีน (<span class="mono">benzene</span>)',
                `• <strong>หมู่แทนที่หลัก:</strong> -${s.type} → ชื่อ IUPAC ที่ยอมรับคือ <strong>${m.iupac}</strong>`
              ]
            };
          }
          return {
            iupac: `${s.name}benzene`,
            thai: `${s.name}benzene (อนุพันธ์เบนซีน)`,
            common: `${s.name}benzene`,
            cid: '—',
            breakdown: [
              '• <strong>วงหลัก:</strong> เบนซีน (<span class="mono">benzene</span>)',
              `• <strong>หมู่แทนที่:</strong> ${s.name}-`
            ]
          };
        }
        const subDesc = subs.map(s => `${s.pos}-${s.name}`).join('-');
        return {
          iupac: `${subDesc}benzene`,
          thai: 'อนุพันธ์เบนซีนที่มีหมู่แทนที่หลายตำแหน่ง',
          common: `${subDesc}benzene`,
          cid: '—',
          breakdown: [
            '• <strong>วงหลัก:</strong> เบนซีน (<span class="mono">benzene</span>)',
            `• <strong>หมู่แทนที่:</strong> ${subDesc}`
          ]
        };
      }

      function analyzeCycloalkane(ringIds) {
        const n = ringIds.length;
        const root = ALKANE_ROOTS[n] || `C${n}`;
        const ringSet = new Set(ringIds);
        let hasDouble = false;
        for (let i = 0; i < n; i++) {
          const b = getBondBetween(ringIds[i], ringIds[(i + 1) % n]);
          if (b && b.order === 2) hasDouble = true;
        }

        // Check substituents attached to ring
        let hasOH = false;
        let hasKetone = false;
        const subs = [];
        for (let i = 0; i < n; i++) {
          const cId = ringIds[i];
          const ext = getNeighbors(cId).filter(nb => !ringSet.has(nb.atom.id));
          for (const e of ext) {
            if (e.atom.el === 'O' && e.bond.order === 1) hasOH = true;
            else if (e.atom.el === 'O' && e.bond.order === 2) hasKetone = true;
            else if (e.atom.el === 'C') subs.push('methyl');
            else if (e.atom.el === 'Cl') subs.push('chloro');
            else if (e.atom.el === 'Br') subs.push('bromo');
          }
        }

        const baseName = `cyclo${root}${hasDouble ? 'ene' : 'ane'}`;
        let iupac = baseName;
        let thai = `ไซโคล${root}${hasDouble ? 'อีน' : 'เอน'} (วงแหวน ${n} เหลี่ยม)`;

        if (hasKetone) {
          iupac = `cyclo${root}anone`;
          thai = `ไซโคล${root}าโนน (คีโตนวงแหวน)`;
        } else if (hasOH) {
          iupac = `cyclo${root}anol`;
          thai = `ไซโคล${root}านอล (แอลกอฮอล์วงแหวน)`;
        }
        if (subs.length > 0) {
          iupac = subs.join('-') + '-' + iupac;
        }

        return {
          iupac,
          thai,
          common: iupac.charAt(0).toUpperCase() + iupac.slice(1),
          cid: (iupac === 'cyclohexanol') ? 7966 : (iupac === 'cyclohexane') ? 8078 : '—',
          breakdown: [
            `• <strong>โครงสร้างหลัก:</strong> วงแหวนคาร์บอน ${n} อะตอม (<span class="mono">cyclo${root}-</span>)`,
            `• <strong>หมู่ฟังก์ชัน/พันธะ:</strong> ${hasKetone ? 'คีโตน (-one)' : hasOH ? 'แอลกอฮอล์ (-ol)' : hasDouble ? 'พันธะคู่ (-ene)' : 'พันธะเดี่ยวทั้งหมด (-ane)'}`,
            subs.length ? `• <strong>หมู่แทนที่:</strong> ${subs.join(', ')}` : '• <strong>การดัดเส้น iPad:</strong> รูปหลายเหลี่ยมด้านเท่ามุมสม่ำเสมอ'
          ]
        };
      }

      function classifyCarbonFG(cId) {
        // Priority: 6: COOH, 5: CHO, 4: Ketone (C=O), 3: OH, 2: NH2
        const nbrs = getNeighbors(cId);
        const doubleO = nbrs.find(n => n.atom.el === 'O' && n.bond.order === 2);
        const singleOH = nbrs.find(n => n.atom.el === 'O' && n.bond.order === 1 && getNeighbors(n.atom.id).length === 1);
        const singleNH2 = nbrs.find(n => n.atom.el === 'N' && n.bond.order === 1);
        const cNeighbors = nbrs.filter(n => n.atom.el === 'C');

        if (doubleO && singleOH) return { prio: 6, type: 'acid', suffix: 'oic acid', thaiType: 'กรดคาร์บอกซิลิก (-COOH)' };
        if (doubleO && cNeighbors.length <= 1) return { prio: 5, type: 'aldehyde', suffix: 'al', thaiType: 'แอลดีไฮด์ (-CHO)' };
        if (doubleO && cNeighbors.length >= 2) return { prio: 4, type: 'ketone', suffix: 'one', thaiType: 'คีโตน (-C=O)' };
        if (singleOH) return { prio: 3, type: 'alcohol', suffix: 'ol', thaiType: 'แอลกอฮอล์ (-OH)' };
        if (singleNH2) return { prio: 2, type: 'amine', suffix: 'amine', thaiType: 'เอมีน (-NH₂)' };
        return { prio: 0, type: 'none', suffix: '', thaiType: 'ไฮโดรคาร์บอน' };
      }

      function analyzeAcyclicChain(carbonAtoms) {
        // Find highest priority functional group across all carbons
        let maxPrio = 0;
        let principalFG = { prio: 0, type: 'none', suffix: '', thaiType: 'ไฮโดรคาร์บอน' };
        const fgMap = new Map();
        for (const c of carbonAtoms) {
          const fg = classifyCarbonFG(c.id);
          fgMap.set(c.id, fg);
          if (fg.prio > maxPrio) {
            maxPrio = fg.prio;
            principalFG = fg;
          }
        }

        // Find all simple carbon-only paths between terminal carbons
        const cAdj = new Map();
        carbonAtoms.forEach(c => {
          const cNbrs = getNeighbors(c.id).filter(n => n.atom.el === 'C').map(n => n.atom.id);
          cAdj.set(c.id, cNbrs);
        });

        let allChains = [];
        function dfsPaths(curr, visited, path) {
          let extended = false;
          for (const nxt of (cAdj.get(curr) || [])) {
            if (!visited.has(nxt)) {
              extended = true;
              visited.add(nxt);
              path.push(nxt);
              dfsPaths(nxt, visited, path);
              path.pop();
              visited.delete(nxt);
            }
          }
          if (!extended) {
            allChains.push(path.slice());
          }
        }

        for (const c of carbonAtoms) {
          if ((cAdj.get(c.id) || []).length <= 1) {
            dfsPaths(c.id, new Set([c.id]), [c.id]);
          }
        }
        if (allChains.length === 0 && carbonAtoms.length > 0) {
          dfsPaths(carbonAtoms[0].id, new Set([carbonAtoms[0].id]), [carbonAtoms[0].id]);
        }

        // Score candidate chains per IUPAC rules:
        // 1. Contains maximum number of principal functional group carbons
        // 2. Contains maximum number of multiple bonds (C=C / C#C)
        // 3. Longest chain length
        function scoreChain(chain) {
          let fgCount = 0;
          if (maxPrio > 0) {
            for (const id of chain) {
              if (fgMap.get(id).prio === maxPrio) fgCount++;
            }
          }
          let multBonds = 0;
          for (let i = 0; i < chain.length - 1; i++) {
            const b = getBondBetween(chain[i], chain[i + 1]);
            if (b && b.order > 1) multBonds++;
          }
          return fgCount * 10000 + multBonds * 1000 + chain.length;
        }

        allChains.sort((a, b) => scoreChain(b) - scoreChain(a));
        let bestChain = allChains[0] || [carbonAtoms[0].id];

        // Choose numbering direction (left-to-right vs right-to-left) for lowest locants
        const revChain = bestChain.slice().reverse();
        bestChain = pickBetterDirection(bestChain, revChain, fgMap, maxPrio);

        const n = bestChain.length;
        const root = ALKANE_ROOTS[n] || `alk(${n})`;
        const chainSet = new Set(bestChain);

        // Identify double/triple bonds along main chain
        const doubleLocs = [];
        const tripleLocs = [];
        for (let i = 0; i < n - 1; i++) {
          const b = getBondBetween(bestChain[i], bestChain[i + 1]);
          if (b && b.order === 2) doubleLocs.push(i + 1);
          else if (b && b.order === 3) tripleLocs.push(i + 1);
        }

        // Identify principal functional group locants
        const fgLocs = [];
        for (let i = 0; i < n; i++) {
          if (maxPrio > 0 && fgMap.get(bestChain[i]).prio === maxPrio) {
            fgLocs.push(i + 1);
          }
        }

        // Identify substituents (alkyl branches, halides, or lower-priority OH/NH2)
        const subGroups = {}; // name -> [locants]
        function addSub(name, loc) {
          if (!subGroups[name]) subGroups[name] = [];
          subGroups[name].push(loc);
        }

        for (let i = 0; i < n; i++) {
          const cId = bestChain[i];
          const loc = i + 1;
          for (const { atom: nb } of getNeighbors(cId)) {
            if (chainSet.has(nb.id)) continue;
            if (nb.el === 'F') addSub('fluoro', loc);
            else if (nb.el === 'Cl') addSub('chloro', loc);
            else if (nb.el === 'Br') addSub('bromo', loc);
            else if (nb.el === 'I') addSub('iodo', loc);
            else if (nb.el === 'O' && maxPrio > 3 && getNeighbors(nb.id).length === 1) addSub('hydroxy', loc);
            else if (nb.el === 'N' && maxPrio > 2) addSub('amino', loc);
            else if (nb.el === 'C') {
              const branchName = classifyAlkylBranch(nb.id, cId);
              addSub(branchName, loc);
            }
          }
        }

        // Assemble Substituent Prefix alphabetically
        const subNamesSorted = Object.keys(subGroups).sort((a, b) => a.replace(/^\(/, '').localeCompare(b.replace(/^\(/, '')));
        const prefixParts = [];
        for (const sName of subNamesSorted) {
          const locs = subGroups[sName].sort((a, b) => a - b);
          const mult = MULT_PREFIX[locs.length] || '';
          prefixParts.push(`${locs.join(',')}-${mult}${sName}`);
        }
        const prefixStr = prefixParts.join('-');

        // Assemble Saturation Infix (-an-, -en-, -yn-)
        let unsatStr = 'an';
        if (doubleLocs.length > 0 && tripleLocs.length === 0) {
          const dMult = MULT_PREFIX[doubleLocs.length] || '';
          const locPart = (n >= 4 || maxPrio > 0) ? `-${doubleLocs.join(',')}-` : '';
          unsatStr = (doubleLocs.length > 1 ? 'a' : '') + `${locPart}${dMult}en`;
        } else if (tripleLocs.length > 0 && doubleLocs.length === 0) {
          const tMult = MULT_PREFIX[tripleLocs.length] || '';
          const locPart = (n >= 4 || maxPrio > 0) ? `-${tripleLocs.join(',')}-` : '';
          unsatStr = (tripleLocs.length > 1 ? 'a' : '') + `${locPart}${tMult}yn`;
        }

        // Assemble Principal Suffix
        let suffixStr = 'e';
        if (maxPrio > 0) {
          const fMult = MULT_PREFIX[fgLocs.length] || '';
          const omitLoc = (principalFG.type === 'acid' || principalFG.type === 'aldehyde' || n <= 2);
          const locPart = omitLoc ? '' : `-${fgLocs.join(',')}-`;
          const extraE = fMult ? 'e' : '';
          suffixStr = `${extraE}${locPart}${fMult}${principalFG.suffix}`;
        }

        let fullIupac = `${prefixStr ? prefixStr + '-' : ''}${root}${unsatStr}${suffixStr}`;
        fullIupac = fullIupac.replace(/--+/g, '-').replace(/^-/, '');

        const breakdown = [
          `• <strong>หมู่ฟังก์ชันหลัก:</strong> ${principalFG.thaiType}${maxPrio > 0 ? ` คำลงท้าย <span class="mono font-semibold">-${principalFG.suffix}</span>` : ''}`,
          `• <strong>โซ่คาร์บอนหลัก:</strong> ยาว ${n} อะตอม (<span class="mono font-semibold">${root}-</span>)`,
          doubleLocs.length ? `• <strong>พันธะคู่:</strong> ตำแหน่งที่ C-${doubleLocs.join(', ')}` :
          tripleLocs.length ? `• <strong>พันธะสาม:</strong> ตำแหน่งที่ C-${tripleLocs.join(', ')}` :
          `• <strong>พันธะคาร์บอนโซ่หลัก:</strong> พันธะเดี่ยวอิ่มตัว (<span class="mono">-an-</span>)`,
          prefixStr ? `• <strong>หมู่แทนที่ (กิ่ง):</strong> <span class="mono font-semibold">${prefixStr}</span>` : '• <strong>หมู่แทนที่:</strong> ไม่มีกิ่ง (โซ่ตรง)'
        ];

        return {
          iupac: fullIupac,
          thai: `${principalFG.thaiType} (โซ่หลัก C${n})`,
          common: fullIupac,
          cid: '—',
          breakdown
        };
      }

      function classifyAlkylBranch(startCId, parentCId) {
        // Count carbons in branch & check if attached carbon is secondary (e.g. 1-methylethyl)
        const visited = new Set([parentCId]);
        const branchCarbons = [];
        function dfs(u) {
          visited.add(u);
          branchCarbons.push(u);
          for (const { atom: v } of getNeighbors(u)) {
            if (v.el === 'C' && !visited.has(v.id)) dfs(v.id);
          }
        }
        dfs(startCId);
        const count = branchCarbons.length;
        if (count === 1) return 'methyl';
        if (count === 2) return 'ethyl';
        if (count === 3) {
          const directC = getNeighbors(startCId).filter(n => n.atom.el === 'C' && n.atom.id !== parentCId);
          if (directC.length === 2) return '(1-methylethyl)';
          return 'propyl';
        }
        if (count === 4) return 'butyl';
        return `${ALKANE_ROOTS[count] || 'alk'}yl`;
      }

      function pickBetterDirection(chainA, chainB, fgMap, maxPrio) {
        function getLocVector(ch) {
          const fgL = [];
          const mbL = [];
          const subL = [];
          const set = new Set(ch);
          for (let i = 0; i < ch.length; i++) {
            if (maxPrio > 0 && fgMap.get(ch[i]).prio === maxPrio) fgL.push(i + 1);
            if (i < ch.length - 1) {
              const b = getBondBetween(ch[i], ch[i + 1]);
              if (b && b.order > 1) mbL.push(i + 1);
            }
            for (const { atom: nb } of getNeighbors(ch[i])) {
              if (!set.has(nb.id) && (nb.el === 'C' || ['F', 'Cl', 'Br', 'I'].includes(nb.el))) {
                subL.push(i + 1);
              }
            }
          }
          return [...fgL, ...mbL, ...subL];
        }
        const vA = getLocVector(chainA);
        const vB = getLocVector(chainB);
        for (let i = 0; i < Math.min(vA.length, vB.length); i++) {
          if (vA[i] < vB[i]) return chainA;
          if (vB[i] < vA[i]) return chainB;
        }
        return chainA;
      }

      function buildRuleExplanation(iupac) {
        return [
          `• <strong>ชื่อ IUPAC มาตรฐาน:</strong> <span class="mono font-semibold">${iupac}</span>`,
          `• <strong>จำนวนอะตอมในกราฟ:</strong> ${atoms.length} อะตอม, ${bonds.length} พันธะ`,
          `• <strong>การตรวจสอบ:</strong> โครงสร้างตรงกับระเบียนฐานข้อมูลมาตรฐาน`
        ];
      }

      // =========================================================================
      // 12. NAME-TO-STRUCTURE PARSER (OFFLINE IUPAC PARSER + PUBCHEM FALLBACK)
      // =========================================================================
      function loadPresetOrParseName(rawName) {
        const clean = rawName.trim();
        if (!clean) return false;
        if (loadFromRules(clean)) return true;
        const lower = clean.toLowerCase();

        // Check built-in presets & common names first
        const presetBuilders = {
          'ethanol': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'OH' }]),
          'เอทานอล': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'OH' }]),
          'acetic': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'COOH' }]),
          'acetic acid': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'COOH' }]),
          'ethanoic acid': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'COOH' }]),
          'กรดแอซีติก': () => buildChainWithSubs(2, [], [{ pos: 2, fg: 'COOH' }]),
          'acetone': () => buildChainWithSubs(3, [], [{ pos: 2, fg: 'ketone' }]),
          'propan-2-one': () => buildChainWithSubs(3, [], [{ pos: 2, fg: 'ketone' }]),
          'แอซีโตน': () => buildChainWithSubs(3, [], [{ pos: 2, fg: 'ketone' }]),
          'benzene': () => buildRingPreset(6, true, []),
          'เบนซีน': () => buildRingPreset(6, true, []),
          'cyclohexane': () => buildRingPreset(6, false, []),
          'ไซโคลเฮกเซน': () => buildRingPreset(6, false, []),
          'cyclohexanol': () => buildRingPreset(6, false, [{ pos: 0, fg: 'OH' }]),
          'ไซโคลเฮกซานอล': () => buildRingPreset(6, false, [{ pos: 0, fg: 'OH' }]),
          'but3en2ol': () => buildChainWithSubs(4, [{ pos: 3, order: 2 }], [{ pos: 2, fg: 'OH' }]),
          'but-3-en-2-ol': () => buildChainWithSubs(4, [{ pos: 3, order: 2 }], [{ pos: 2, fg: 'OH' }]),
          'isobutyl': () => buildChainWithSubs(3, [], [{ pos: 1, fg: 'OH' }, { pos: 2, branch: 'methyl' }]),
          '2-methylpropan-1-ol': () => buildChainWithSubs(3, [], [{ pos: 1, fg: 'OH' }, { pos: 2, branch: 'methyl' }]),
          '4-(1-methylethyl)heptane': () => buildChainWithSubs(7, [], [{ pos: 4, branch: 'isopropyl' }]),
          'aspirin': () => buildAspirin(),
          '2-acetoxybenzoic acid': () => buildAspirin(),
          'แอสไพริน': () => buildAspirin(),
          'methane': () => buildSingleAtom('C'),
          'มีเทน': () => buildSingleAtom('C'),
          'water': () => buildSingleAtom('O'),
          'น้ำ': () => buildSingleAtom('O'),
          'phenol': () => buildRingPreset(6, true, [{ pos: 0, fg: 'OH' }]),
          'toluene': () => buildRingPreset(6, true, [{ pos: 0, branch: 'methyl' }]),
          'benzoic acid': () => buildRingPreset(6, true, [{ pos: 0, fg: 'COOH' }])
        };

        if (presetBuilders[lower]) {
          saveHistory();
          atoms = [];
          bonds = [];
          presetBuilders[lower]();
          centerStructureOnCanvas(false);
          renderCanvas();
          updateMoleculeAnalysis();
          return true;
        }

        // Generic Systematic English IUPAC Parser
        const parsed = tryParseSystematicIUPAC(lower);
        if (parsed) {
          saveHistory();
          atoms = [];
          bonds = [];
          parsed();
          centerStructureOnCanvas(false);
          renderCanvas();
          updateMoleculeAnalysis();
          return true;
        }
        return false;
      }

      function buildSingleAtom(el) {
        addAtom(canvas.width / 2, canvas.height / 2, el);
      }

      function buildRingPreset(nSides, isBenzene, attachments) {
        const ringAtoms = addRingAtCenter(canvas.width / 2, canvas.height / 2, nSides, isBenzene);
        for (const att of attachments) {
          const rAtom = ringAtoms[att.pos || 0];
          if (att.fg) applyFunctionalGroupNoHistory(rAtom.id, att.fg);
          else if (att.branch === 'methyl') {
            const ang = chooseBestSproutAngle(rAtom.id);
            const c = addAtom(rAtom.x + BOND_LEN * Math.cos(ang), rAtom.y + BOND_LEN * Math.sin(ang), 'C');
            addOrUpdateBond(rAtom.id, c.id, 1);
          }
        }
      }

      function buildAspirin() {
        const ringAtoms = addRingAtCenter(canvas.width / 2 - 40, canvas.height / 2 + 15, 6, true);
        // C1: COOH
        const c0 = ringAtoms[0];
        const ang0 = chooseBestSproutAngle(c0.id);
        const cAcid = addAtom(c0.x + BOND_LEN * Math.cos(ang0), c0.y + BOND_LEN * Math.sin(ang0), 'C');
        addOrUpdateBond(c0.id, cAcid.id, 1);
        const o1 = addAtom(cAcid.x + BOND_LEN * Math.cos(ang0 - Math.PI / 3), cAcid.y + BOND_LEN * Math.sin(ang0 - Math.PI / 3), 'O');
        const o2 = addAtom(cAcid.x + BOND_LEN * Math.cos(ang0 + Math.PI / 3), cAcid.y + BOND_LEN * Math.sin(ang0 + Math.PI / 3), 'O');
        addOrUpdateBond(cAcid.id, o1.id, 2);
        addOrUpdateBond(cAcid.id, o2.id, 1);

        // C2: -O-C(=O)-CH3
        const c1 = ringAtoms[1];
        const ang1 = chooseBestSproutAngle(c1.id);
        const oEster = addAtom(c1.x + BOND_LEN * Math.cos(ang1), c1.y + BOND_LEN * Math.sin(ang1), 'O');
        addOrUpdateBond(c1.id, oEster.id, 1);
        const cCarb = addAtom(oEster.x + BOND_LEN * Math.cos(ang1 + Math.PI / 3), oEster.y + BOND_LEN * Math.sin(ang1 + Math.PI / 3), 'C');
        addOrUpdateBond(oEster.id, cCarb.id, 1);
        const oCarb = addAtom(cCarb.x + BOND_LEN * Math.cos(ang1 + 2 * Math.PI / 3), cCarb.y + BOND_LEN * Math.sin(ang1 + 2 * Math.PI / 3), 'O');
        const cMe = addAtom(cCarb.x + BOND_LEN * Math.cos(ang1), cCarb.y + BOND_LEN * Math.sin(ang1), 'C');
        addOrUpdateBond(cCarb.id, oCarb.id, 2);
        addOrUpdateBond(cCarb.id, cMe.id, 1);
      }

      function applyFunctionalGroupNoHistory(atomId, fg) {
        const atom = getAtom(atomId);
        if (!atom) return;
        const ang = chooseBestSproutAngle(atomId);
        if (fg === 'OH' || fg === 'ketone') {
          const ox = atom.x + BOND_LEN * Math.cos(ang);
          const oy = atom.y + BOND_LEN * Math.sin(ang);
          const o = addAtom(ox, oy, 'O');
          addOrUpdateBond(atom.id, o.id, fg === 'ketone' ? 2 : 1);
        } else if (fg === 'COOH') {
          const o1 = addAtom(atom.x + BOND_LEN * Math.cos(ang - Math.PI / 3), atom.y + BOND_LEN * Math.sin(ang - Math.PI / 3), 'O');
          const o2 = addAtom(atom.x + BOND_LEN * Math.cos(ang + Math.PI / 3), atom.y + BOND_LEN * Math.sin(ang + Math.PI / 3), 'O');
          addOrUpdateBond(atom.id, o1.id, 2);
          addOrUpdateBond(atom.id, o2.id, 1);
        } else if (fg === 'NH2') {
          const n = addAtom(atom.x + BOND_LEN * Math.cos(ang), atom.y + BOND_LEN * Math.sin(ang), 'N');
          addOrUpdateBond(atom.id, n.id, 1);
        }
      }

      function buildChainWithSubs(chainLen, multBonds, subs) {
        const chainAtoms = [];
        const stepX = BOND_LEN * Math.cos(Math.PI / 6);
        const stepY = BOND_LEN * Math.sin(Math.PI / 6);
        const startX = canvas.width / 2 - ((chainLen - 1) * stepX) / 2;
        const startY = canvas.height / 2;

        for (let i = 0; i < chainLen; i++) {
          const x = startX + i * stepX;
          const y = startY + ((i % 2 === 0) ? stepY / 2 : -stepY / 2);
          const c = addAtom(x, y, 'C');
          chainAtoms.push(c);
          if (i > 0) {
            addOrUpdateBond(chainAtoms[i - 1].id, c.id, 1);
          }
        }

        for (const mb of multBonds) {
          const idx = mb.pos - 1;
          if (idx >= 0 && idx < chainLen - 1) {
            addOrUpdateBond(chainAtoms[idx].id, chainAtoms[idx + 1].id, mb.order);
          }
        }

        for (const s of subs) {
          const idx = Math.max(0, Math.min(chainLen - 1, (s.pos || 1) - 1));
          const c = chainAtoms[idx];
          const dirY = (idx % 2 === 0) ? 1 : -1;
          const ang = (idx === 0) ? (Math.PI - Math.PI / 6) : (idx === chainLen - 1) ? (-Math.PI / 6) : (dirY * Math.PI / 2);

          if (s.fg) {
            if (s.fg === 'COOH') {
              const o1 = addAtom(c.x + BOND_LEN * Math.cos(ang - Math.PI / 4), c.y + BOND_LEN * Math.sin(ang - Math.PI / 4), 'O');
              const o2 = addAtom(c.x + BOND_LEN * Math.cos(ang + Math.PI / 4), c.y + BOND_LEN * Math.sin(ang + Math.PI / 4), 'O');
              addOrUpdateBond(c.id, o1.id, 2);
              addOrUpdateBond(c.id, o2.id, 1);
            } else {
              const el = s.fg === 'NH2' ? 'N' : s.fg === 'Cl' ? 'Cl' : s.fg === 'Br' ? 'Br' : s.fg === 'F' ? 'F' : 'O';
              const order = s.fg === 'ketone' || s.fg === 'CHO' ? 2 : 1;
              const subA = addAtom(c.x + BOND_LEN * Math.cos(ang), c.y + BOND_LEN * Math.sin(ang), el);
              addOrUpdateBond(c.id, subA.id, order);
            }
          } else if (s.branch === 'methyl') {
            const m = addAtom(c.x + BOND_LEN * Math.cos(ang), c.y + BOND_LEN * Math.sin(ang), 'C');
            addOrUpdateBond(c.id, m.id, 1);
          } else if (s.branch === 'ethyl') {
            const c1 = addAtom(c.x + BOND_LEN * Math.cos(ang), c.y + BOND_LEN * Math.sin(ang), 'C');
            const c2 = addAtom(c1.x + BOND_LEN * Math.cos(ang + Math.PI / 6), c1.y + BOND_LEN * Math.sin(ang + Math.PI / 6), 'C');
            addOrUpdateBond(c.id, c1.id, 1);
            addOrUpdateBond(c1.id, c2.id, 1);
          } else if (s.branch === 'isopropyl') {
            const c1 = addAtom(c.x + BOND_LEN * Math.cos(ang), c.y + BOND_LEN * Math.sin(ang), 'C');
            const c2 = addAtom(c1.x + BOND_LEN * Math.cos(ang - Math.PI / 4), c1.y + BOND_LEN * Math.sin(ang - Math.PI / 4), 'C');
            const c3 = addAtom(c1.x + BOND_LEN * Math.cos(ang + Math.PI / 4), c1.y + BOND_LEN * Math.sin(ang + Math.PI / 4), 'C');
            addOrUpdateBond(c.id, c1.id, 1);
            addOrUpdateBond(c1.id, c2.id, 1);
            addOrUpdateBond(c1.id, c3.id, 1);
          }
        }
      }

      function tryParseSystematicIUPAC(name) {
        // Match root chain length
        let rootLen = 0;
        let isCyclo = name.includes('cyclo');
        for (let i = 10; i >= 1; i--) {
          const r = ALKANE_ROOTS[i];
          if (r && name.includes(r)) {
            rootLen = i;
            break;
          }
        }
        if (rootLen === 0) return null;

        if (isCyclo) {
          return () => {
            const subs = [];
            if (name.endsWith('ol')) subs.push({ pos: 0, fg: 'OH' });
            else if (name.endsWith('one')) subs.push({ pos: 0, fg: 'ketone' });
            if (name.includes('methyl')) subs.push({ pos: 1, branch: 'methyl' });
            buildRingPreset(Math.max(3, Math.min(8, rootLen)), false, subs);
          };
        }

        const multBonds = [];
        const subs = [];

        // Check double/triple bond
        const enMatch = name.match(/-(\d+)-en/) || name.match(/^(\d+)-.*en/);
        if (enMatch) multBonds.push({ pos: parseInt(enMatch[1], 10), order: 2 });
        else if (name.includes('en') && !name.includes('benzene')) multBonds.push({ pos: 1, order: 2 });

        const ynMatch = name.match(/-(\d+)-yn/) || name.match(/^(\d+)-.*yn/);
        if (ynMatch) multBonds.push({ pos: parseInt(ynMatch[1], 10), order: 3 });

        // Check suffix (-ol, -one, -al, -oic acid, -amine)
        if (name.endsWith('oic acid')) {
          subs.push({ pos: 1, fg: 'COOH' });
        } else if (name.endsWith('al')) {
          subs.push({ pos: 1, fg: 'CHO' });
        } else if (name.endsWith('one')) {
          const m = name.match(/-(\d+)-one/) || name.match(/^(\d+)-/);
          subs.push({ pos: m ? parseInt(m[1], 10) : 2, fg: 'ketone' });
        } else if (name.endsWith('ol')) {
          const m = name.match(/-(\d+)-ol/) || name.match(/^(\d+)-/);
          subs.push({ pos: m ? parseInt(m[1], 10) : 1, fg: 'OH' });
        } else if (name.endsWith('amine')) {
          const m = name.match(/-(\d+)-amine/) || name.match(/^(\d+)-/);
          subs.push({ pos: m ? parseInt(m[1], 10) : 1, fg: 'NH2' });
        }

        // Check prefix substituents (e.g. 2-methyl, 4-(1-methylethyl), 2-chloro)
        const isoMatch = name.match(/(\d+)-\(1-methylethyl\)/) || name.match(/(\d+)-isopropyl/);
        if (isoMatch) subs.push({ pos: parseInt(isoMatch[1], 10), branch: 'isopropyl' });

        const meClean = name.replace(/\(1-methylethyl\)/g, '');
        const meMatch = meClean.match(/(\d+(?:,\d+)*)-(?:di|tri)?methyl/);
        if (meMatch) {
          meMatch[1].split(',').forEach(p => subs.push({ pos: parseInt(p, 10), branch: 'methyl' }));
        }

        const etMatch = meClean.match(/(\d+)-ethyl/);
        if (etMatch) subs.push({ pos: parseInt(etMatch[1], 10), branch: 'ethyl' });

        const clMatch = name.match(/(\d+)-chloro/);
        if (clMatch) subs.push({ pos: parseInt(clMatch[1], 10), fg: 'Cl' });

        const brMatch = name.match(/(\d+)-bromo/);
        if (brMatch) subs.push({ pos: parseInt(brMatch[1], 10), fg: 'Br' });

        return () => buildChainWithSubs(rootLen, multBonds, subs);
      }

      // =========================================================================
      // 13. LIVE ANALYSIS & PUBCHEM API INTEGRATION
      // =========================================================================
      function updateMoleculeAnalysisLegacy() {
        const smiles = generateSMILES();
        document.getElementById('smiles-output').value = smiles;

        const { formulaText, mw } = calculateFormulaAndWeight();
        const analysis = generateIUPACNameAndBreakdown();

        document.getElementById('out-iupac').textContent = analysis.iupac;
        document.getElementById('out-thai-name').textContent = analysis.thai;
        document.getElementById('out-formula').textContent = formulaText;
        document.getElementById('out-mw').textContent = atoms.length ? `${mw} g/mol` : '—';
        document.getElementById('out-common').textContent = analysis.common;
        document.getElementById('out-cid').textContent = analysis.cid;
        document.getElementById('out-rule-breakdown').innerHTML = analysis.breakdown.map(line => `<div>${line}</div>`).join('');
        document.getElementById('info-source-tag').textContent = 'กฎ IUPAC ในเครื่อง';

        const linkEl = document.getElementById('out-pubchem-link');
        if (analysis.cid && analysis.cid !== '—') {
          linkEl.href = `https://pubchem.ncbi.nlm.nih.gov/compound/${analysis.cid}`;
        } else if (smiles) {
          linkEl.href = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`;
        }

        // Check interactive practice challenge completion
        checkChallengeProgress(analysis.iupac, smiles);
      }

      async function queryPubChemByCurrentStructure() {
        const smiles = generateSMILES();
        if (!smiles) return;
        const tag = document.getElementById('info-source-tag');
        tag.textContent = 'กำลังค้น PubChem...';

        try {
          const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/property/IUPACName,MolecularFormula,MolecularWeight,Title/JSON`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Not found');
          const data = await res.json();
          const prop = data.PropertyTable.Properties[0];
          document.getElementById('out-iupac').textContent = prop.IUPACName || prop.Title || generateIUPACNameAndBreakdown().iupac;
          document.getElementById('out-common').textContent = prop.Title || prop.IUPACName || '—';
          document.getElementById('out-cid').textContent = prop.CID || '—';
          document.getElementById('out-mw').textContent = `${prop.MolecularWeight} g/mol`;
          document.getElementById('out-pubchem-link').href = `https://pubchem.ncbi.nlm.nih.gov/compound/${prop.CID}`;
          tag.textContent = 'ยืนยันจาก PubChem API ✓';
          showSnapToast('ดึงชื่อ IUPAC และ CID จาก PubChem สำเร็จ!');
        } catch (err) {
          // Offline or custom structure fallback
          updateMoleculeAnalysis();
          tag.textContent = 'คำนวณตามกฎ IUPAC ในเครื่อง';
          showSnapToast('ตั้งชื่อด้วยระบบกฎ IUPAC ในเครื่องเรียบร้อย');
        }
      }

      async function convertInputNameToStructure() {
        const inputEl = document.getElementById('name-input');
        const badge = document.getElementById('name-status-badge');
        const q = inputEl.value.trim();
        if (!q) {
          badge.textContent = 'กรุณาพิมพ์ชื่อสารเคมีก่อนกดแปลง';
          return;
        }

        // 1. Try local IUPAC parser & presets first
        if (loadPresetOrParseName(q)) {
          badge.textContent = `✓ แปลง "${q}" เป็นโครงสร้างบนกระดานแล้ว`;
          showSnapToast(`แปลงชื่อ "${q}" เป็นโครงสร้างแล้ว`);
          return;
        }

        // 2. Fallback to PubChem API lookup
        badge.textContent = 'กำลังค้นหาโครงสร้างจาก PubChem...';
        try {
          const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(q)}/property/CanonicalSMILES,IUPACName,Title/JSON`);
          if (!res.ok) throw new Error('Not found');
          const data = await res.json();
          const prop = data.PropertyTable.Properties[0];
          if (prop.IUPACName && loadPresetOrParseName(prop.IUPACName)) {
            badge.textContent = `✓ แปลง "${prop.Title || q}" สำเร็จ`;
            document.getElementById('out-cid').textContent = prop.CID;
            return;
          }
          badge.textContent = `พบสาร ${prop.Title || q} (SMILES: ${prop.CanonicalSMILES})`;
        } catch (err) {
          badge.textContent = (lastRuleError ? lastRuleError + ' · ' : '') + 'ลองชื่อ IUPAC ภาษาอังกฤษ เช่น ethyl ethanoate, (E)-but-2-ene, cyclohexanol';
        }
      }

      // =========================================================================
      // 14. MOL FILE EXPORT & SMILES COPY
      // =========================================================================
      // =========================================================================
      // ChemLab bridge: name with the shared rules in name-rules.js (same engine as draw.html)
      // =========================================================================
      function toRuleGraph() {
        if (atoms.some(a => a.charge)) throw new Error('มีประจุบนอะตอม กฎในเครื่องยังไม่รองรับประจุ');
        if (bonds.some(b => b.stereo && b.stereo !== 'none')) throw new Error('พันธะลิ่ม/เส้นประ (R/S) ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
        const idx = new Map(atoms.map((a, i) => [a.id, i]));
        const g = { atoms: atoms.map(a => a.el), bonds: bonds.map(b => ({ a: idx.get(b.a1), b: idx.get(b.a2), o: b.aromatic ? 4 : b.order })) };
        return window.ChemNameRules.withGeometry(g, atoms.map(a => [a.x, -a.y]));
      }

      function setList(id, lines) {
        const box = document.getElementById(id);
        box.replaceChildren(...lines.map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
      }

      function updateMoleculeAnalysis() {
        const smiles = generateSMILES();
        document.getElementById('smiles-output').value = smiles;
        const { formulaText, mw } = calculateFormulaAndWeight();
        document.getElementById('out-formula').textContent = atoms.length ? formulaText : '—';
        document.getElementById('out-mw').textContent = atoms.length ? `${mw} g/mol` : '—';
        const known = KNOWN_DB[smiles];
        document.getElementById('out-common').textContent = known ? `${known.common} · ${known.thai}` : '—';
        document.getElementById('out-cid').textContent = known ? known.cid : '—';
        const tag = document.getElementById('info-source-tag');
        const note = document.getElementById('out-thai-name');
        let name = '—';
        if (!atoms.length) {
          note.textContent = 'วาดโครงสร้างบนกระดาน หรือพิมพ์ชื่อสารด้านบน';
          setList('out-rule-breakdown', []);
          tag.textContent = 'กฎในเครื่อง';
        } else {
          try {
            const r = window.ChemNameRules.nameGraph(toRuleGraph());
            name = r.name;
            note.textContent = 'ตั้งชื่อตามกฎและแปลงชื่อกลับมาตรวจแล้ว';
            note.dataset.state = 'ok';
            setList('out-rule-breakdown', r.steps);
            tag.textContent = 'กฎในเครื่อง ตรวจย้อนกลับแล้ว';
          } catch (err) {
            note.textContent = err.message + ' · กด "ค้นใน PubChem" เพื่อดูชื่อจากฐานข้อมูล';
            note.dataset.state = 'warn';
            setList('out-rule-breakdown', []);
            tag.textContent = 'นอกขอบเขตกฎในเครื่อง';
          }
        }
        document.getElementById('out-iupac').textContent = name;
        const strip = document.getElementById('board-name'), stripText = document.getElementById('board-name-text');
        if (strip) {
          const failed = atoms.length && name === '—';
          strip.dataset.state = failed ? 'warn' : '';
          stripText.textContent = !atoms.length ? '—' : failed ? 'ตั้งชื่อด้วยกฎในเครื่องไม่ได้ ดูเหตุผลด้านขวา' : name;
        }
        const linkEl = document.getElementById('out-pubchem-link');
        linkEl.href = known ? `https://pubchem.ncbi.nlm.nih.gov/compound/${known.cid}` : smiles ? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}` : 'https://pubchem.ncbi.nlm.nih.gov/';
        checkChallengeProgress(name, smiles);
      }

      // name → structure with the shared rules; the JME layout is scaled onto this canvas
      function loadFromRules(rawName) {
        let r;
        try { r = window.ChemNameRules.fromName(rawName); } catch (err) { lastRuleError = err.message; return false; }
        const t = r.jme.split(' '), na = +t[0], nb = +t[1], scale = BOND_LEN / 1.4;
        saveHistory();
        atoms = []; bonds = [];
        const ids = [];
        let k = 2;
        for (let i = 0; i < na; i++) { const a = { id: nextAtomId++, x: canvas.width / 2 + (+t[k + 1]) * scale, y: canvas.height / 2 - (+t[k + 2]) * scale, el: t[k], charge: 0 }; atoms.push(a); ids.push(a.id); k += 3; }
        for (let i = 0; i < nb; i++) { addOrUpdateBond(ids[+t[k] - 1], ids[+t[k + 1] - 1], +t[k + 2], 'none', false); k += 3; }
        centerStructureOnCanvas(false);
        renderCanvas();
        updateMoleculeAnalysis();
        return true;
      }
      let lastRuleError = '';

      function exportMOLFile() {
        if (atoms.length === 0) return;
        const lines = [];
        lines.push('ChemLab_by_Sky_iPad');
        lines.push('  ChemLabSmartInk   2D');
        lines.push('');
        const nA = String(atoms.length).padStart(3, ' ');
        const nB = String(bonds.length).padStart(3, ' ');
        lines.push(`${nA}${nB}  0  0  0  0  0  0  0  0999 V2000`);

        const idxMap = new Map();
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        atoms.forEach((a, i) => {
          idxMap.set(a.id, i + 1);
          const x = ((a.x - cx) / 40).toFixed(4).padStart(10, ' ');
          const y = (-(a.y - cy) / 40).toFixed(4).padStart(10, ' ');
          const z = (0).toFixed(4).padStart(10, ' ');
          const el = a.el.padEnd(3, ' ');
          lines.push(`${x}${y}${z} ${el} 0  0  0  0  0  0  0  0  0  0  0  0`);
        });

        bonds.forEach(b => {
          const i1 = String(idxMap.get(b.a1) || 1).padStart(3, ' ');
          const i2 = String(idxMap.get(b.a2) || 1).padStart(3, ' ');
          const ord = String(b.order || 1).padStart(3, ' ');
          lines.push(`${i1}${i2}${ord}  0  0  0  0`);
        });

        lines.push('M  END');
        const blob = new Blob([lines.join('\n')], { type: 'chemical/x-mdl-molfile' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'structure.mol';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSnapToast('ดาวน์โหลดไฟล์ structure.mol แล้ว');
      }

      function copySMILESToClipboard() {
        const smilesInput = document.getElementById('smiles-output');
        const val = smilesInput.value;
        if (!val) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).catch(() => {
            smilesInput.select();
            document.execCommand('copy');
          });
        } else {
          smilesInput.select();
          document.execCommand('copy');
        }
        const fb = document.getElementById('copy-feedback');
        fb.classList.add('show');
        setTimeout(() => fb.classList.remove('show'), 1800);
        showSnapToast('คัดลอก SMILES ลงคลิปบอร์ดแล้ว');
      }

      // =========================================================================
      // 15. UI CONTROLS, TOOLBAR BINDINGS & CHALLENGES
      // =========================================================================
      const modeNames = {
        'smart': 'ปากกา iPad อัจฉริยะ (วาดเส้น/ซิกแซก/วงแหวน แล้วดัดตรงอัตโนมัติ)',
        'bond-1': '— โหมดลากพันธะเดี่ยว (ล็อกมุม 30°/120°)',
        'bond-2': '= โหมดวางพันธะคู่',
        'bond-3': '≡ โหมดวางพันธะสาม',
        'bond-wedge': '▲ โหมดพันธะทึบ (Wedge Sterochemistry)',
        'bond-dash': '⋯ โหมดพันธะประ (Dash Stereochemistry)',
        'chain': '〰️ โหมดลากโซ่ซิกแซกหลายอะตอมต่อเนื่อง',
        'move': 'โหมดเลื่อนจัดตำแหน่งอะตอม',
        'erase': 'โหมดยางลบ (แตะหรือลากผ่านเพื่อลบ)',
        'ring-3': '△ แตะกระดานเพื่อวางวงสามเหลี่ยม (Cyclopropane)',
        'ring-4': '□ แตะกระดานเพื่อวางวงสี่เหลี่ยม (Cyclobutane)',
        'ring-5': '⬠ แตะกระดานเพื่อวางวงห้าเหลี่ยม (Cyclopentane)',
        'ring-6': '⬡ แตะกระดานเพื่อวางวงหกเหลี่ยม (Cyclohexane)',
        'ring-ben': '⌬ แตะกระดานเพื่อวางวงเบนซีน (Benzene)',
        'ring-7': 'แตะกระดานเพื่อวางวง 7 เหลี่ยม (Cycloheptane)',
        'ring-8': 'แตะกระดานเพื่อวางวง 8 เหลี่ยม (Cyclooctane)'
      };

      document.querySelectorAll('[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTool = btn.getAttribute('data-tool');
          document.querySelectorAll('[data-tool]').forEach(b => {
            b.classList.remove('active', 'smart-active');
          });
          if (activeTool === 'smart') btn.classList.add('smart-active');
          else btn.classList.add('active');
          document.getElementById('canvas-mode-pill').textContent = 'โหมดปัจจุบัน: ' + (modeNames[activeTool] || activeTool);
        });
      });

      document.querySelectorAll('[data-atom]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeElement = btn.getAttribute('data-atom');
          activeFG = null;
          activeChargeDelta = null;
          document.querySelectorAll('.atom-pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      document.querySelectorAll('[data-fg]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeFG = btn.getAttribute('data-fg');
          activeChargeDelta = null;
          document.querySelectorAll('.atom-pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          showSnapToast(`แตะที่อะตอมบนกระดานเพื่อเติมหมู่ -${activeFG}`);
        });
      });

      document.querySelectorAll('[data-charge]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeChargeDelta = parseInt(btn.getAttribute('data-charge'), 10);
          activeFG = null;
          document.querySelectorAll('.atom-pill').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          showSnapToast('แตะที่อะตอมบนกระดานเพื่อปรับประจุ');
        });
      });

      document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-preset');
          document.getElementById('name-input').value = btn.textContent.trim();
          loadPresetOrParseName(key);
          showSnapToast(`โหลดโครงสร้าง "${btn.textContent.trim()}" แล้ว`);
        });
      });

      document.getElementById('btn-name-to-struct').addEventListener('click', convertInputNameToStructure);
      document.getElementById('name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') convertInputNameToStructure();
      });

      document.getElementById('btn-search-pubchem-name').addEventListener('click', () => {
        const q = document.getElementById('name-input').value.trim() || 'ethanol';
        window.open(`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(q)}`, '_blank', 'noopener');
      });

      document.getElementById('btn-structure-to-name').addEventListener('click', queryPubChemByCurrentStructure);
      document.getElementById('btn-search-pubchem-struct').addEventListener('click', () => {
        const s = generateSMILES() || 'CCO';
        window.open(`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(s)}`, '_blank', 'noopener');
      });

      document.getElementById('btn-download-mol').addEventListener('click', exportMOLFile);
      document.getElementById('btn-save-image').addEventListener('click', () => {
        if (!atoms.length) { showSnapToast('วาดโครงสร้างก่อนบันทึกรูป'); return; }
        hideAtomPicker(); hoverAtomId = null; hoverBondId = null; renderCanvas();
        const name = document.getElementById('out-iupac').textContent.trim();
        window.ChemBoard.saveImage({ canvas, name, file: name !== '—' ? name : 'structure' })
          .then(() => showSnapToast('บันทึกรูปพร้อมชื่อแล้ว'));
      });
      document.getElementById('btn-copy-smiles').addEventListener('click', copySMILESToClipboard);

      document.getElementById('btn-clear-board').addEventListener('click', () => {
        saveHistory();
        atoms = [];
        bonds = [];
        hideAtomPicker();
        renderCanvas();
        updateMoleculeAnalysis();
        showSnapToast('ล้างกระดานเรียบร้อย พร้อมวาดใหม่');
      });

      document.getElementById('btn-undo').addEventListener('click', undo);
      document.getElementById('btn-redo').addEventListener('click', redo);
      document.getElementById('btn-center-view').addEventListener('click', () => centerStructureOnCanvas(true));
      document.getElementById('btn-beautify').addEventListener('click', beautifyStructure);

      // Guide banner toggle
      const guideBanner = document.getElementById('ipad-guide-banner');
      document.getElementById('btn-toggle-guide').addEventListener('click', () => {
        guideBanner.hidden = !guideBanner.hidden;
      });
      document.getElementById('btn-close-guide').addEventListener('click', () => {
        guideBanner.hidden = true;
      });

      // Practice Challenges
      document.querySelectorAll('[data-challenge]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentChallenge = btn.getAttribute('data-challenge');
          saveHistory();
          atoms = [];
          bonds = [];
          // Switch to Smart Pen mode automatically
          document.querySelector('[data-tool="smart"]').click();
          const banner = document.getElementById('challenge-banner');
          banner.classList.remove('hidden');
          if (currentChallenge === 'pentane') {
            banner.textContent = 'โจทย์ที่ 1: ใช้ปากกาหรือนิ้วลากเส้นซิกแซก 4 ขยัก (ขึ้น-ลง-ขึ้น-ลง) ต่อเนื่องกันในครั้งเดียวเพื่อสร้าง Pentane (C5H12)';
          } else if (currentChallenge === 'cyclohexane') {
            banner.textContent = 'โจทย์ที่ 2: วาดรูปหกเหลี่ยมปิดคร่าวๆ บนกระดาน ระบบจะดัดเป็นวง Cyclohexane ด้านเท่าให้ทันที';
          } else if (currentChallenge === 'benzene') {
            banner.textContent = 'โจทย์ที่ 3: วาดวงหกเหลี่ยมก่อน แล้ววาดวงกลมด้านในวงหกเหลี่ยมเพื่อเปลี่ยนเป็น Benzene';
          }
          renderCanvas();
          updateMoleculeAnalysis();
        });
      });

      function checkChallengeProgress(iupac, smiles) {
        if (!currentChallenge) return;
        const banner = document.getElementById('challenge-banner');
        if (currentChallenge === 'pentane' && iupac === 'pentane') {
          banner.textContent = 'สำเร็จ! ระบบดัดเส้นซิกแซกของคุณเป็นโซ่ Pentane (C₅H₁₂) มุม 120° ตรงตามแบบแล้ว!';
          currentChallenge = null;
        } else if (currentChallenge === 'cyclohexane' && iupac === 'cyclohexane') {
          banner.textContent = 'สำเร็จ! ระบบดัดวงปิดของคุณเป็นวงหกเหลี่ยม Cyclohexane (C₆H₁₂) ด้านเท่าเรียบร้อย!';
          currentChallenge = null;
        } else if (currentChallenge === 'benzene' && iupac === 'benzene') {
          banner.textContent = 'ยอดเยี่ยม! คุณสร้างวงอะโรมาติก Benzene (C₆H₆) ด้วยการวาดวงกลมด้านในสำเร็จ!';
          currentChallenge = null;
        }
      }

      // Initialize with Ethanol on board so user immediately sees how it looks
      loadPresetOrParseName('ethanol');
      historyStack = [];
    })();