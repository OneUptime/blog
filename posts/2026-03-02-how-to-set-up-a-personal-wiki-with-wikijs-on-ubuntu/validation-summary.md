# Validation Summary: How to Set Up a Personal Wiki with Wiki.js on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Wiki.js v2
- Ubuntu 22.04 / 24.04
- PostgreSQL 13+ / 16
- Node.js 20 (NodeSource)
- Docker / Docker Compose
- Nginx reverse proxy
- Let's Encrypt / certbot
- systemd
- Git storage sync (SSH deploy key, ed25519)
- pg_dump backups, cron

## Sources Consulted
- Wiki.js official config sample: https://github.com/Requarks/wiki/blob/main/config.sample.yml
- Wiki.js Visual Editor docs: https://docs.requarks.io/editors/visualeditor
- Wiki.js DB - Basic search docs: https://docs.requarks.io/search/db
- Wiki.js search overview: https://docs.requarks.io/search
- Wiki.js installation requirements: https://docs.requarks.io/install/requirements
- Wiki.js GitHub releases: https://github.com/requarks/wiki/releases
- NodeSource setup script: https://deb.nodesource.com/setup_20.x
- Official Wiki.js Docker image: ghcr.io/requarks/wiki:2

## Issues Found

1. **Incorrect identification of the Visual Editor library.** The post described the Visual Editor as "WYSIWYG TipTap-based editor." Wiki.js v2's Visual Editor is actually built on **CKEditor 5** (TipTap is referenced as a planned/experimental editor in Wiki.js v3, not v2). Updated the bullet to read "WYSIWYG CKEditor 5-based editor."

2. **Incorrect name for the built-in search engine.** The post listed the built-in search option as "Built-in (Lunr.js)." Wiki.js v2 does not use Lunr.js; the default built-in search engine is **"DB - Basic"**, with **"DB - PostgreSQL"** available as a stronger built-in option when PostgreSQL is used as the database. Replaced the two-item list with three items that accurately describe the choices: Database - Basic (default), Database - PostgreSQL, and Elasticsearch.

3. **Invalid `name` field in `config.yml`.** The example `config.yml` included `name: 'My Wiki'`. This key is not part of Wiki.js's `config.sample.yml`; the site name in Wiki.js v2 is set through the admin UI (Administration > General), not in the bootstrap config file. Removed the `name:` line from the YAML snippet to avoid suggesting an option that does nothing.

## Review Notes

- The download URL `https://github.com/requarks/wiki/releases/latest/download/wiki-js.tar.gz` is the documented release artifact and resolves correctly.
- The Docker image `ghcr.io/requarks/wiki:2` is the officially documented image tag for Wiki.js v2.
- The systemd unit uses `ExecStart=/usr/bin/node server`, which matches Wiki.js's documented `node server` entry point relative to the install directory.
- Wiki.js v2 has been in maintenance mode while v3 is in development. The image tag `:2` pins to v2 and is the right choice for production use today; readers planning a long-term deployment should watch for v3 GA and the eventual migration path (notably, v3 is PostgreSQL-only).
- The Nginx WebSocket headers (`Upgrade`/`Connection: upgrade`, HTTP/1.1) are required for Wiki.js's real-time admin features and are correctly included.
- The `ssl_ciphers` list is functional but minimal; a stronger Mozilla-recommended cipher suite would be a future improvement, though it is not technically incorrect.
- The `useradd -r -m -d /opt/wikijs` followed by `mkdir -p /opt/wikijs` is redundant but harmless — the directory will already exist after `useradd -m`, and `mkdir -p` is a no-op when the target exists.
- Node.js 18 reached end-of-life in April 2025; on a fresh install, Node.js 20 (used in the example) is the right choice. Node.js 18 listed as "supported" remains technically accurate for Wiki.js v2 but is no longer receiving upstream security updates.
