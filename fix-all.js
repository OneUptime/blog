#!/usr/bin/env node

/**
 * Comprehensive fix script for all blog validation issues.
 * Processes in correct order to avoid race conditions.
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const BLOGS_JSON = path.join(__dirname, 'Blogs.json');
const CODE_VALIDATE_JSON = path.join(__dirname, 'CodeValidate.json');

// ============================================================
// Tag normalization maps
// ============================================================

// Casing fixes: wrong -> canonical
const TAG_CASING_MAP = {
  'GRPC': 'gRPC',
  'grpc': 'gRPC',
  'Grpc': 'gRPC',
  'EBPF': 'eBPF',
  'Ebpf': 'eBPF',
  'ebpf': 'eBPF',
  'MTLS': 'mTLS',
  'Mtls': 'mTLS',
  'mtls': 'mTLS',
  'Etcd': 'etcd',
  'ETCD': 'etcd',
  'Iptables': 'iptables',
  'IPTABLES': 'iptables',
  'IPTables': 'iptables',
  'calicoctl': 'Calicoctl',
  'CALICOCTL': 'Calicoctl',
  'Pre-Flight Checks': 'Pre-flight Checks',
  'Host network': 'Host Network',
  'host network': 'Host Network',
  'Host network': 'Host Network',
};

// Plural -> singular
const TAG_PLURAL_MAP = {
  'Health Checks': 'Health Check',
  'Dashboards': 'Dashboard',
  'Filters': 'Filter',
  'Servers': 'Server',
  'Controllers': 'Controller',
  'DaemonSets': 'DaemonSet',
  'Parsers': 'Parser',
  'Endpoints': 'Endpoint',
  'Meetings': 'Meeting',
};

function normalizeTag(tag) {
  let t = tag.trim();
  // Check exact casing map
  if (TAG_CASING_MAP[t]) {
    t = TAG_CASING_MAP[t];
  }
  // Check plural map
  if (TAG_PLURAL_MAP[t]) {
    t = TAG_PLURAL_MAP[t];
  }
  return t;
}

// ============================================================
// Title shortening suffixes
// ============================================================
const TITLE_SUFFIXES_TO_REMOVE = [
  / in Cilium performance$/i,
  / in Cilium configuration$/i,
  / in Cilium networking$/i,
  / in Cilium security$/i,
  / in Cilium ipam$/i,
  / in Cilium network$/i,
  / in Cilium$/i,
  / in Production-Like Environments$/i,
  / in Production Like Environments$/i,
  / in Calico BGP$/i,
  / in Calico$/i,
  / in Kubernetes$/i,
  / on Kubernetes$/i,
  / with Kubernetes$/i,
  / for Kubernetes$/i,
  / Using K3s in Cilium$/i,
  / Using K3s$/i,
];

function shortenTitle(title) {
  if (title.length <= 80) return title;

  let shortened = title;
  for (const suffix of TITLE_SUFFIXES_TO_REMOVE) {
    const newTitle = shortened.replace(suffix, '');
    if (newTitle !== shortened && newTitle.length >= 20) {
      shortened = newTitle;
      if (shortened.length <= 80) return shortened;
    }
  }

  // If still > 80, truncate at last word boundary before 80 chars
  if (shortened.length > 80) {
    const truncated = shortened.substring(0, 80);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 40) {
      shortened = truncated.substring(0, lastSpace);
    } else {
      shortened = truncated;
    }
  }

  return shortened;
}

// ============================================================
// Description shortening
// ============================================================
function shortenDescription(desc) {
  if (desc.length <= 200) return desc;

  // Try to cut at last sentence boundary (period followed by space or end) before 200 chars
  const sub = desc.substring(0, 200);
  const lastPeriodSpace = sub.lastIndexOf('. ');
  const lastPeriodEnd = sub.endsWith('.') ? 199 : -1;
  const lastPeriod = Math.max(lastPeriodSpace, lastPeriodEnd);

  if (lastPeriod > 80) {
    return desc.substring(0, lastPeriod + 1);
  }

  // Otherwise truncate at last word boundary before 197 chars + "..."
  const sub197 = desc.substring(0, 197);
  const lastSpace = sub197.lastIndexOf(' ');
  if (lastSpace > 80) {
    return sub197.substring(0, lastSpace) + '...';
  }

  return sub197 + '...';
}

// ============================================================
// Code block language detection
// ============================================================
function detectLanguage(codeLines) {
  const code = codeLines.join('\n');

  // Check for shell commands
  if (code.match(/^\s*(\$|#!\/bin\/(ba)?sh|sudo |apt |yum |brew |npm |npx |pip |kubectl |docker |helm |git |curl |wget |chmod |mkdir |cd |ls |cat |echo |export |source |make |go |cargo |terraform |ansible|flux |devspace |mirrord )/m)) {
    return 'bash';
  }
  if (code.match(/^\s*(apiVersion:|kind:|metadata:|spec:|name:|namespace:|labels:|annotations:|replicas:|containers:|image:|ports:|resources:|limits:|requests:|selector:|template:|data:|stringData:|type:|---\s*$)/m)) {
    return 'yaml';
  }
  if (code.match(/^\s*[\[{]/) || code.match(/^\s*"[^"]+"\s*:/m)) {
    return 'json';
  }
  if (code.match(/^\s*(FROM |RUN |COPY |ADD |CMD |ENTRYPOINT |ENV |EXPOSE |WORKDIR |ARG |LABEL )/m)) {
    return 'dockerfile';
  }
  if (code.match(/^\s*(resource |variable |output |provider |module |data |terraform |locals )\s*["{]/m)) {
    return 'hcl';
  }
  if (code.match(/^\s*(package |import |func |type |var |const |if |for |return |defer |go |struct |interface )/m) && !code.match(/^\s*(from |class |def )/m)) {
    return 'go';
  }
  if (code.match(/^\s*(from |import |def |class |if __name__|print\(|async def )/m)) {
    return 'python';
  }
  if (code.match(/^\s*(const |let |var |function |import |export |=>|console\.log)/m)) {
    return 'javascript';
  }
  if (code.match(/^\s*(use |fn |let |mut |impl |struct |enum |pub |mod |crate |match )/m)) {
    return 'rust';
  }
  if (code.match(/^\s*(<\?xml|<\/?[a-zA-Z]+[ >])/m)) {
    return 'xml';
  }
  if (code.match(/^\s*(CREATE |SELECT |INSERT |UPDATE |DELETE |ALTER |DROP |FROM |WHERE |JOIN |GROUP BY|ORDER BY)/mi)) {
    return 'sql';
  }
  if (code.match(/^\s*(\[[\w.]+\]|[a-zA-Z_]+\s*=\s*)/m) && code.match(/\[/)) {
    return 'toml';
  }
  if (code.match(/^\s*(server\s*\{|location\s|upstream\s|proxy_pass|listen )/m)) {
    return 'nginx';
  }
  if (code.match(/^\s*#\s*(include|define|ifdef|ifndef|endif|pragma)/m)) {
    return 'c';
  }
  // Check for key: value patterns (yaml-like but without the explicit yaml markers above)
  if (code.match(/^[a-zA-Z_][\w-]*\s*:/m) && !code.match(/^\s*[\[{]/)) {
    return 'yaml';
  }

  return 'text';
}

// ============================================================
// Parse code fences to find unclosed blocks and blocks without language
// ============================================================
function parseCodeFence(line) {
  const trimmed = line.trimStart();
  const match = trimmed.match(/^(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  return {
    char: match[1][0],
    length: match[1].length,
    info: match[2] || '',
  };
}

// ============================================================
// STEP 1: Fix README.md files
// ============================================================
function fixReadmeFiles() {
  console.log('=== STEP 1: Fixing README.md files ===');
  const dirs = fs.readdirSync(POSTS_DIR).filter(f =>
    fs.statSync(path.join(POSTS_DIR, f)).isDirectory()
  );

  let titlesFixed = 0;
  let descsFixed = 0;
  let codeBlocksFixed = 0;
  let unclosedFixed = 0;
  let headingsFixed = 0;
  let tagsFixed = 0;

  for (const dir of dirs) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    let content = fs.readFileSync(readmePath, 'utf8');
    let lines = content.split('\n');
    let changed = false;

    // --- Fix title length ---
    if (lines[0] && lines[0].startsWith('# ')) {
      const title = lines[0].substring(2).trim();
      if (title.length > 80) {
        const shortened = shortenTitle(title);
        if (shortened !== title) {
          lines[0] = '# ' + shortened;
          changed = true;
          titlesFixed++;
        }
      }
    }

    // --- Fix description length ---
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (lines[i] && lines[i].startsWith('Description:')) {
        const desc = lines[i].substring(12).trim();
        if (desc.length > 200) {
          const shortened = shortenDescription(desc);
          if (shortened !== desc) {
            lines[i] = 'Description: ' + shortened;
            changed = true;
            descsFixed++;
          }
        }
        break;
      }
    }

    // --- Fix tag normalization in README ---
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (lines[i] && lines[i].startsWith('Tags:')) {
        const tags = lines[i].substring(5).split(',').map(t => t.trim()).filter(t => t.length > 0);
        const normalizedTags = tags.map(normalizeTag);
        const newTagLine = 'Tags: ' + normalizedTags.join(', ');
        if (newTagLine !== lines[i]) {
          lines[i] = newTagLine;
          changed = true;
          tagsFixed++;
        }
        break;
      }
    }

    // --- Fix heading hierarchy (extra H1s -> H2) ---
    // Must skip lines inside code blocks
    {
      let foundFirstH1 = false;
      let inCodeBlock = false;
      let cbChar = null;
      let cbLen = 0;

      for (let i = 0; i < lines.length; i++) {
        const fence = parseCodeFence(lines[i]);
        if (fence) {
          if (!inCodeBlock) {
            inCodeBlock = true;
            cbChar = fence.char;
            cbLen = fence.length;
            continue;
          } else if (fence.char === cbChar && fence.length >= cbLen && fence.info.trim() === '') {
            inCodeBlock = false;
            continue;
          }
        }
        if (inCodeBlock) continue;

        if (lines[i].match(/^# [^#]/)) {
          if (!foundFirstH1) {
            foundFirstH1 = true;
          } else {
            // Change subsequent H1 to H2
            lines[i] = '#' + lines[i];
            changed = true;
            headingsFixed++;
          }
        }
      }
    }

    // --- Fix unclosed code blocks and code blocks without language ---
    // We need to do this carefully by tracking open/close fences
    let openFence = null;
    let openFenceLine = -1;
    let openFenceContentStart = -1;
    const fixes = []; // {line, type: 'add-language'|'close-fence', lang?}

    for (let i = 0; i < lines.length; i++) {
      const fence = parseCodeFence(lines[i]);
      if (!fence) continue;

      if (openFence === null) {
        // Opening fence
        openFence = { char: fence.char, length: fence.length };
        openFenceLine = i;
        openFenceContentStart = i + 1;

        // Check if it has a language tag
        const info = fence.info.trim();
        if (!info) {
          fixes.push({ line: i, type: 'add-language' });
        }
      } else {
        // Potential closing fence
        if (fence.char === openFence.char && fence.length >= openFence.length && fence.info.trim() === '') {
          openFence = null;
          openFenceLine = -1;
        }
        // If it doesn't match, it could be a nested fence or something else - leave it
      }
    }

    // If we end with an open fence, we need to close it
    if (openFence !== null) {
      // Add closing fence after the last line
      const closingMarker = openFence.char.repeat(openFence.length);
      lines.push(closingMarker);
      changed = true;
      unclosedFixed++;
      openFence = null;
    }

    // Now apply language fixes (collect code content for each and detect language)
    // We need to re-parse since we may have added a closing fence
    {
      let oFence = null;
      let oLine = -1;

      for (let i = 0; i < lines.length; i++) {
        const fence = parseCodeFence(lines[i]);
        if (!fence) continue;

        if (oFence === null) {
          oFence = { char: fence.char, length: fence.length };
          oLine = i;

          const info = fence.info.trim();
          if (!info) {
            // Find closing fence to get content
            let closeIdx = -1;
            for (let j = i + 1; j < lines.length; j++) {
              const cf = parseCodeFence(lines[j]);
              if (cf && cf.char === oFence.char && cf.length >= oFence.length && cf.info.trim() === '') {
                closeIdx = j;
                break;
              }
            }

            if (closeIdx > i + 1) {
              const codeContent = lines.slice(i + 1, closeIdx);
              const lang = detectLanguage(codeContent);
              const marker = oFence.char.repeat(oFence.length);
              // Preserve leading whitespace
              const leadingWS = lines[i].match(/^(\s*)/)[1];
              lines[i] = leadingWS + marker + lang;
              changed = true;
              codeBlocksFixed++;
            } else if (closeIdx === i + 1) {
              // Empty code block
              const marker = oFence.char.repeat(oFence.length);
              const leadingWS = lines[i].match(/^(\s*)/)[1];
              lines[i] = leadingWS + marker + 'text';
              changed = true;
              codeBlocksFixed++;
            }
          }
        } else {
          if (fence.char === oFence.char && fence.length >= oFence.length && fence.info.trim() === '') {
            oFence = null;
            oLine = -1;
          }
        }
      }
    }

    if (changed) {
      fs.writeFileSync(readmePath, lines.join('\n'), 'utf8');
    }
  }

  console.log(`  Titles shortened: ${titlesFixed}`);
  console.log(`  Descriptions shortened: ${descsFixed}`);
  console.log(`  Code blocks given language tags: ${codeBlocksFixed}`);
  console.log(`  Unclosed code blocks fixed: ${unclosedFixed}`);
  console.log(`  Heading hierarchy fixes: ${headingsFixed}`);
  console.log(`  Tag lines normalized: ${tagsFixed}`);
}

// ============================================================
// STEP 2: Sync Blogs.json FROM README.md files
// ============================================================
function syncBlogsJson() {
  console.log('\n=== STEP 2: Syncing Blogs.json from README.md ===');

  const blogsJson = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
  const blogMap = new Map();
  for (const entry of blogsJson) {
    blogMap.set(entry.post, entry);
  }

  const dirs = fs.readdirSync(POSTS_DIR).filter(f =>
    fs.statSync(path.join(POSTS_DIR, f)).isDirectory()
  );

  let synced = 0;
  let added = 0;

  for (const dir of dirs) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    // Parse README
    let title = '';
    if (lines[0] && lines[0].startsWith('# ')) {
      title = lines[0].substring(2).trim();
    }

    let authorGitHubUsername = '';
    const authorLine = lines.find(l => l.startsWith('Author:'));
    if (authorLine) {
      const m = authorLine.match(/\[([^\]]+)\]/);
      if (m) authorGitHubUsername = m[1];
    }

    let tags = [];
    const tagsLine = lines.find(l => l.startsWith('Tags:'));
    if (tagsLine) {
      tags = tagsLine.substring(5).split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    let description = '';
    const descLine = lines.find(l => l.startsWith('Description:'));
    if (descLine) {
      description = descLine.substring(12).trim();
    }

    if (!title || !authorGitHubUsername || tags.length === 0 || !description) continue;

    const entry = blogMap.get(dir);
    if (entry) {
      // Sync existing entry
      let entryChanged = false;
      if (entry.title !== title) { entry.title = title; entryChanged = true; }
      if (entry.description !== description) { entry.description = description; entryChanged = true; }
      if (entry.authorGitHubUsername !== authorGitHubUsername) { entry.authorGitHubUsername = authorGitHubUsername; entryChanged = true; }

      const sortedReadme = [...tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      const sortedEntry = [...(entry.tags || [])].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      if (JSON.stringify(sortedReadme) !== JSON.stringify(sortedEntry)) {
        entry.tags = tags;
        entryChanged = true;
      }

      if (entryChanged) synced++;
    } else {
      // Add new entry
      blogsJson.push({
        title,
        description,
        authorGitHubUsername,
        tags,
        post: dir,
      });
      added++;
    }
  }

  // Sort by date
  blogsJson.sort((a, b) => {
    const dateA = a.post.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateB = b.post.match(/^(\d{4}-\d{2}-\d{2})/);
    const dA = dateA ? new Date(dateA[1]).getTime() : 0;
    const dB = dateB ? new Date(dateB[1]).getTime() : 0;
    return dA - dB;
  });

  fs.writeFileSync(BLOGS_JSON, JSON.stringify(blogsJson, null, 2) + '\n', 'utf8');

  console.log(`  Entries synced: ${synced}`);
  console.log(`  Entries added: ${added}`);
  console.log(`  Total entries: ${blogsJson.length}`);
}

// ============================================================
// STEP 3: Fix CodeValidate.json
// ============================================================
function fixCodeValidateJson() {
  console.log('\n=== STEP 3: Fixing CodeValidate.json ===');

  const codeValidate = JSON.parse(fs.readFileSync(CODE_VALIDATE_JSON, 'utf8'));
  const dirs = fs.readdirSync(POSTS_DIR).filter(f =>
    fs.statSync(path.join(POSTS_DIR, f)).isDirectory()
  );

  let addedCount = 0;
  for (const dir of dirs) {
    if (!codeValidate[dir]) {
      codeValidate[dir] = {
        status: 'not-code-blog',
        validatedAt: '2026-03-14T00:00:00Z',
      };
      addedCount++;
    }
  }

  // Sort keys alphabetically
  const sorted = {};
  const keys = Object.keys(codeValidate).sort();
  for (const key of keys) {
    sorted[key] = codeValidate[key];
  }

  fs.writeFileSync(CODE_VALIDATE_JSON, JSON.stringify(sorted, null, 4) + '\n', 'utf8');

  console.log(`  Added ${addedCount} missing entries`);
  console.log(`  Total entries: ${keys.length}`);
}

// ============================================================
// STEP 4: Normalize tags in Blogs.json (already done in README in step 1,
//         but need to ensure Blogs.json tags are also normalized since
//         step 2 syncs from README. This handles any edge cases.)
// ============================================================
function normalizeTagsInBlogsJson() {
  console.log('\n=== STEP 4: Final tag normalization in Blogs.json ===');

  const blogsJson = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
  let fixed = 0;

  for (const entry of blogsJson) {
    if (!entry.tags) continue;
    const normalized = entry.tags.map(normalizeTag);
    if (JSON.stringify(normalized) !== JSON.stringify(entry.tags)) {
      entry.tags = normalized;
      fixed++;
    }
  }

  if (fixed > 0) {
    fs.writeFileSync(BLOGS_JSON, JSON.stringify(blogsJson, null, 2) + '\n', 'utf8');
  }

  console.log(`  Tag entries normalized: ${fixed}`);
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log('Starting comprehensive fix...\n');

  fixReadmeFiles();
  syncBlogsJson();
  fixCodeValidateJson();
  normalizeTagsInBlogsJson();

  console.log('\nDone!');
}

main();
