# Validation Summary: How to Install Wiki.js on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Wiki.js (2.x stable, installed from the official release tarball)
- Ubuntu (20.04 / 22.04 / 24.04 LTS)
- Node.js (NodeSource 20.x LTS)
- PostgreSQL (database, full-text search)
- Nginx (reverse proxy, TLS termination)
- Certbot / Let's Encrypt (SSL/TLS certificates)
- systemd (service management and hardening)
- UFW, Fail2Ban (security hardening)
- Elasticsearch / Algolia (optional search engines)
- Git / AWS S3 / Azure Blob / Google Cloud Storage (storage modules)
- rclone, pg_dump (backups)

## Sources Consulted
- Wiki.js Requirements (current): https://docs.requarks.io/install/requirements
- Wiki.js Requirements (next-gen 3.x, for contrast): https://beta.js.wiki/docs/requirements
- Wiki.js Configuration reference: https://docs.requarks.io/install/config
- Official config.sample.yml: https://github.com/requarks/wiki/blob/main/config.sample.yml
- GitHub Discussion #6642 (Node 16 EOL) and #5668 (Node 18 support): confirmed v2.5.300 (Aug 2023) added Node 18 + 20 support
- Express "behind proxies" / trust proxy docs: https://expressjs.com/en/guide/behind-proxies/
- NodeSource setup_20.x repository (Node 20 ships npm 10.x)

## Issues Found
1. **SSH key generation ran before its target directory existed (functional error).** In the Git storage section, the block ran `ssh-keygen ... -f /var/www/wikijs/.ssh/id_ed25519` *before* `mkdir -p /var/www/wikijs/.ssh`. `ssh-keygen` does not create intermediate directories for an arbitrary `-f` path, so the command would fail with "No such file or directory". **Fix:** reordered the block so the `.ssh` directory is created, owned, and chmodded *before* the key is generated. No other content changed.

## Review Notes
- **Node.js version guidance is correct for current Wiki.js 2.x.** Older sources (2022–early 2023) capped support at Node 16, but v2.5.300 (released 2023-08-11) added official support for Node 18 and 20. The post's recommendation of Node 18.x/20.x LTS and installing 20.x is accurate. (The Node 20.0+ *requirement* surfaced in some searches refers to the separate next-gen Wiki.js 3.x, which this post does not install — it uses the 2.x release tarball.)
- **`node --version` → v20.x.x and `npm --version` → 10.x.x** are correct; Node 20 bundles npm 10.x.
- **`trustProxy: true`** is a valid Wiki.js option (also settable via the `TRUST_PROXY` env var). It is not present in the minimal `config.sample.yml`, but it is a supported key and appropriate behind a reverse proxy, so it was left as-is.
- **PostgreSQL `GRANT ALL ON SCHEMA public TO wikijs;`** is the correct remediation for the PostgreSQL 15+ default-privileges change; `GRANT ALL PRIVILEGES ON DATABASE` alone is insufficient on PG 15+. The earlier `GRANT ALL PRIVILEGES ON DATABASE` is redundant given `OWNER wikijs`, but harmless.
- **nginx `listen 443 ssl http2;`** uses the legacy combined syntax. It still works on the Ubuntu LTS nginx versions targeted here; nginx 1.25.1+ prefers the separate `http2 on;` directive and emits a deprecation warning but remains functional. Not changed.
- The official download URL `https://github.com/Requarks/wiki/releases/latest/download/wiki-js.tar.gz`, the `node server` systemd `ExecStart`, the systemd hardening directives, Certbot usage, Fail2Ban filter, and backup scripts are all accurate.
