# Validation Summary: How to Set Up Wekan (Open-Source Trello Alternative) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Wekan (open-source Kanban board)
- Docker / Docker Compose
- MongoDB (mongo:6 image, mongosh, mongodump/mongorestore)
- Meteor (Wekan runtime)
- nginx (reverse proxy)
- Let's Encrypt / certbot
- Ubuntu (20.04 / 22.04)
- cron (scheduled backups)

## Sources Consulted
- Wekan official repository docker-compose.yml: https://github.com/wekan/wekan/blob/main/docker-compose.yml
- Wekan official Docker images on ghcr.io: https://github.com/wekan/wekan/pkgs/container/wekan
- Wekan environment variable documentation (wiki / repo)
- Official MongoDB Docker image (mongo:6) — includes database tools (mongodump, mongorestore, mongosh)
- nginx proxy module documentation (proxy_pass, WebSocket upgrade headers)
- certbot documentation for `--nginx` and `certonly --standalone` modes
- Meteor deployment docs (WebSocket / `Upgrade` headers behind a reverse proxy)
- Docker Compose reference (services, volumes, networks)

## Issues Found

1. **Broken nginx + certbot ordering (fixed).** The original article created the full nginx site config — including `ssl_certificate` and `ssl_certificate_key` directives pointing to `/etc/letsencrypt/live/kanban.example.com/...` — before any certificates existed. Running `sudo nginx -t` would have failed immediately with "BIO_new_file() failed" / "cannot load certificate" errors, the `&& systemctl reload nginx` would be skipped, and `certbot --nginx` would then also fail because it requires a valid nginx configuration to operate on. Fixed by reordering the section to first stop nginx, run `certbot certonly --standalone -d kanban.example.com` to obtain the certificates, then create the nginx site config (whose paths now exist), enable the site, run `nginx -t`, and start nginx. The misleading "Wekan is on 8080, so certbot should be fine with 80 open" comment was removed since it didn't reflect the actual problem (the conflict was the missing cert files, not port 80).

## Review Notes

- **MongoDB version**: The article pins `mongo:6`, while the current upstream Wekan `docker-compose.yml` references `mongo:7`. Both work with current Wekan releases; `mongo:6` is still supported and fine for the article's stated purpose. Worth bumping to `mongo:7` in a future revision to match upstream defaults.
- **`MONGO_URL` form**: The article uses `mongodb://wekandb/wekan` (no explicit port), upstream uses `mongodb://wekandb:27017/wekan`. Both are valid; the MongoDB driver defaults to port 27017.
- **`MONGO_OPLOG_URL`**: Upstream now configures MongoDB as a single-node replica set and sets `MONGO_OPLOG_URL` for better real-time updates. The article's simpler standalone-mongod setup still works but loses Meteor's oplog tailing optimization. Not strictly an error.
- **Optional env vars (`REGISTRATION_DISABLED`, `INVITE_ENABLED`, `MAX_ALLOWED_FILE_SIZE`)**: These are referenced in Wekan documentation/wiki and are commonly used, but are not present in the upstream sample `docker-compose.yml`. Behavior of `MAX_ALLOWED_FILE_SIZE` in particular has shifted between Wekan versions; admin-panel settings are generally more reliable for production tuning.
- **`mongo:6` image and database tools**: The official `mongo:6` Docker image ships with `mongodump`, `mongorestore`, and `mongosh`, so the backup, restore, and admin commands all work as written.
- **WebSocket / Meteor proxy headers**: The nginx `Upgrade`/`Connection` headers and `proxy_http_version 1.1` are correctly configured for Meteor's DDP-over-WebSocket transport.
- **Backup script paths**: The `mongodump --out /dump/$DATE` → `docker cp` → `tar` → restore-via-`mongorestore /dump/restore/wekan` path math is correct.
- **`docker-compose.yml` `version: '3'`**: Still accepted by recent Docker Compose v2, though the `version` key is now considered obsolete and ignored. Not an error, just a future cleanup.
