# Validation Summary: How to Deploy Plausible Analytics via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Plausible Community Edition
- Portainer
- Docker Compose
- PostgreSQL
- ClickHouse
- Nginx

## Sources Consulted
- Plausible Community Edition quickstart: https://github.com/plausible/community-edition/tree/v3.2.0
- Plausible Community Edition official compose file: https://raw.githubusercontent.com/plausible/community-edition/v3.2.0/compose.yml
- Plausible Community Edition configuration wiki: https://github.com/plausible/community-edition/wiki/Configuration
- Plausible Community Edition reverse proxy wiki: https://github.com/plausible/community-edition/wiki/reverse-proxy
- Plausible docs, hashed page paths: https://plausible.io/docs/hash-based-routing
- Plausible docs, SPA support: https://plausible.io/docs/spa-support
- Plausible docs, script update guide: https://plausible.io/docs/script-update-guide
- Plausible analytics repo, generated installation snippet: https://github.com/plausible/analytics/blob/v3.2.0/lib/plausible_web/live/installation/instructions.ex
- Plausible analytics repo, Docker entrypoint: https://github.com/plausible/analytics/blob/v3.2.0/rel/docker-entrypoint.sh
- Portainer docs, add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
- The compose stack pinned outdated Plausible CE and ClickHouse image tags and diverged from the current official CE compose defaults. I updated the stack to Plausible CE `v3.2.0`, ClickHouse `24.12-alpine`, and the current default database URLs/settings.
- The `SECRET_KEY_BASE` command was outdated. I changed `openssl rand -base64 64` to `openssl rand -base64 48`, which matches Plausible CE's current documented generation method.
- The post omitted current runtime requirements and key service settings from the official stack. I added the ClickHouse CPU prerequisite, the RAM recommendation, ClickHouse health checking, `CLICKHOUSE_SKIP_USER_SETUP`, and Plausible's persistent data volume/TMPDIR configuration.
- The admin-user command used `/entrypoint.sh rpc`, but the current Plausible container entrypoint only supports `run` and `db`. I replaced that step with the supported first-user creation flow through the web UI.
- The tracking snippet used Plausible's legacy `data-domain` / `script.js` / `script.hash.js` approach. I updated it to the current site-specific snippet format with `plausible.init(...)`, and used `hashBasedRouting: true` only for hash-routed SPAs.
- The reverse proxy section implied Nginx was required and omitted the websocket location from Plausible CE's reverse-proxy guidance. I updated it to make reverse proxying optional, aligned the sample with the upstream Nginx example, and clarified TLS termination expectations.
- The registration section suggested adding `invite_only` after setup. I corrected this to reflect that `invite_only` is already the default and that `DISABLE_REGISTRATION: "true"` is the stronger post-setup restriction.

## Review Notes
- The tutorial now matches Plausible Community Edition `v3.2.0` guidance as of 2026-04-25.
- The inline Portainer stack is intentionally simpler than Plausible's upstream repo-based deployment and therefore omits the optional ClickHouse tuning XML files from the official `compose.yml`. Those files are useful on smaller hosts but are not required for a basic deployment.
- The post assumes a Docker Standalone environment in Portainer, not Docker Swarm, because the compose example relies on direct port mappings and `depends_on` health conditions.
