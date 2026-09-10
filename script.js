'use strict';

/* ══ Config — this repo, no need to touch unless it moves ══ */
const GITHUB_OWNER = 'Science-by-Sketch';
const GITHUB_REPO = 'assets';
const GITHUB_BRANCH = 'main';

const IMG_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif']);

let allAssets = [];

function extOf(path) {
    const i = path.lastIndexOf('.');
    return i === -1 ? '' : path.slice(i + 1).toLowerCase();
}

function cdnUrl(path) {
    return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;
}

function rawUrl(path) {
    return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function loadAssets() {
    const countBadge = document.getElementById('countBadge');
    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`
        );
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        const data = await res.json();
        const tree = Array.isArray(data.tree) ? data.tree : [];

        allAssets = tree
            .filter(item => item.type === 'blob' && IMG_EXTS.has(extOf(item.path)))
            .map(item => {
                const parts = item.path.split('/');
                const name = parts[parts.length - 1];
                return { path: item.path, name };
            })
            .sort((a, b) => a.path.localeCompare(b.path));

        if (!allAssets.length) {
            document.getElementById('grid').innerHTML =
                `<p class="state-msg">No images in this repo yet.</p>`;
            countBadge.textContent = '0 assets';
            return;
        }

        renderGrid();
    } catch (err) {
        console.error(err);
        countBadge.textContent = 'error';
        document.getElementById('grid').innerHTML =
            `<p class="state-msg error">Couldn't load assets from GitHub (${escapeHtml(err.message)}).<br>
       Check that GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH in script.js are correct, or try again in a bit
       (the public API is rate-limited).</p>`;
    }
}

function renderGrid() {
    const q = document.getElementById('searchInp').value.trim().toLowerCase();
    const grid = document.getElementById('grid');

    const filtered = allAssets.filter(a => !q || a.path.toLowerCase().includes(q));

    const countBadge = document.getElementById('countBadge');
    countBadge.textContent = `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`;

    if (!filtered.length) {
        grid.innerHTML = `<p class="state-msg">No assets match "${escapeHtml(q)}".</p>`;
        return;
    }

    grid.innerHTML = filtered.map((a, i) => `
    <div class="card" data-idx="${i}">
      <div class="card-thumb"><img src="${escapeHtml(cdnUrl(a.path))}" alt="${escapeHtml(a.name)}" loading="lazy"></div>
      <div class="card-name">${escapeHtml(a.name)}</div>
    </div>
  `).join('');

    grid.querySelectorAll('.card').forEach((card, i) => {
        card.onclick = () => openModal(filtered[i]);
    });
}

document.getElementById('searchInp').addEventListener('input', renderGrid);

/* ── Modal ── */
const modalBg = document.getElementById('modalBg');
const modal = document.getElementById('modal');
const modalCopied = document.getElementById('modalCopied');
let currentAsset = null;

function openModal(asset) {
    currentAsset = asset;
    document.getElementById('modalPreview').innerHTML =
        `<img src="${escapeHtml(cdnUrl(asset.path))}" alt="${escapeHtml(asset.name)}">`;
    document.getElementById('modalName').textContent = asset.name;
    document.getElementById('modalPath').textContent = asset.path;
    const dl = document.getElementById('modalDownload');
    dl.href = rawUrl(asset.path);
    dl.setAttribute('download', asset.name);
    modalCopied.classList.remove('visible');
    modalBg.classList.add('open');
    modal.classList.add('open');
}

function closeModal() {
    modalBg.classList.remove('open');
    modal.classList.remove('open');
}

document.getElementById('modalClose').onclick = closeModal;
modalBg.onclick = closeModal;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('copyUrlBtn').addEventListener('click', async () => {
    if (!currentAsset) return;
    try {
        await navigator.clipboard.writeText(cdnUrl(currentAsset.path));
        modalCopied.textContent = 'Copied to clipboard';
        modalCopied.classList.add('visible');
        setTimeout(() => modalCopied.classList.remove('visible'), 1800);
    } catch (err) {
        modalCopied.textContent = "Couldn't copy — long-press or select the URL manually.";
        modalCopied.classList.add('visible');
    }
});

loadAssets();