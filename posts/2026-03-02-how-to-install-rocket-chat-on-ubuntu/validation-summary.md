# Validation Summary: How to Install Rocket.Chat on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Ubuntu 22.04 / 24.04
- Docker Engine and Docker Compose plugin
- Rocket.Chat (official container image)
- MongoDB 6.0 (replica set mode)
- Nginx (reverse proxy)
- Certbot / Let's Encrypt (HTTPS)
- mongodump / cron (backup)

## Sources Consulted
- Rocket.Chat official Docker image repo: https://github.com/RocketChat/Docker.Official.Image
- Official compose file: https://github.com/RocketChat/Docker.Official.Image/blob/main/compose.yml
- Rocket.Chat server source for admin bootstrap env vars: https://github.com/RocketChat/Rocket.Chat (apps/meteor/server/startup/initialData.ts — `insertAdminUserFromEnv`)
- Docker install guide for Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Nginx WebSocket proxying docs (`Upgrade`/`Connection` headers, `proxy_http_version 1.1`)
- Certbot Nginx plugin docs: https://eff-certbot.readthedocs.io/

## Issues Found
No technical issues found.

A pre-existing edit (already staged on disk before this review) replaced the specific claim "free tier, 5000 push notifications/month" next to the Rocket.Chat cloud gateway with a more durable note that using the gateway requires registering the workspace with Rocket.Chat Cloud. That change is correct — Rocket.Chat's gateway tiers and quotas change over time, so the looser wording is the right call. No further edits were needed.

Verified specifically:
- `registry.rocket.chat/rocketchat/rocket.chat` is the official Rocket.Chat container image registry path (matches Rocket.Chat's own compose.yml).
- The admin bootstrap variables `ADMIN_USERNAME`, `ADMIN_PASS`, `ADMIN_EMAIL` are read by `insertAdminUserFromEnv()` in the Rocket.Chat server code and only seed an admin user on first run when no admin role exists — matches the post's description.
- `MONGO_URL` with `?replicaSet=rs0` against the `rocketchat` database and `MONGO_OPLOG_URL` pointing at the `local` database are both valid. `MONGO_OPLOG_URL` is no longer strictly required on MongoDB 5.0+ (Rocket.Chat uses change streams), but setting it is harmless and still supported.
- `mongo:6.0` includes `mongosh`, so the `rs.initiate(...)` bootstrap container works as written.
- The Nginx proxy block correctly enables WebSocket upgrades (`proxy_http_version 1.1`, `Upgrade`, `Connection "upgrade"`) which Rocket.Chat requires.
- The `/api/v1/info` endpoint exists on Rocket.Chat and returns a JSON status payload suitable for an uptime check.

## Review Notes
- The Compose file uses `version: '3.8'`. Compose v2 ignores (and warns about) the top-level `version` key, but it is still accepted and does not cause the file to fail. Removing it would be a stylistic cleanup, not a correctness fix.
- `mongo:6.0` is fine and supported by current Rocket.Chat, but Rocket.Chat's own reference compose has moved to `mongodb/mongodb-community-server:8.2-ubi8`. Readers who want to track upstream more closely may want a newer MongoDB tag; MongoDB 6.0 reached end of life in July 2025, so future revisions of this post should bump to MongoDB 7.0 or 8.x.
- The `mongo-init-replica` one-shot container will exit after running `rs.initiate(...)`. It has no `restart` policy set, which defaults to `no` — correct for a one-shot init job. No change needed.
- `image: ...:latest` plus `docker compose pull rocketchat` in the upgrade section means an upgrade pulls whatever `latest` resolves to at that moment. That's the workflow the post documents and is fine, but pinning to a specific Rocket.Chat tag would give more reproducible upgrades.
- `ADMIN_PASS=ChangeThisPassword123!` is explicitly called out as a placeholder, but readers should be reminded that this value is baked into the compose file at rest; recommending a `.env` file or Docker secret would be a future improvement (not a correctness issue).
