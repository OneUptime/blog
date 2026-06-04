# Validation Summary: How to Run Matrix (Synapse) in Docker for Chat

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Matrix
- Synapse
- Docker
- Docker Compose
- PostgreSQL
- Nginx reverse proxy
- Element Web
- Matrix federation and .well-known discovery

## Sources Consulted
- Synapse installation documentation: https://element-hq.github.io/synapse/latest/setup/installation.html
- Synapse reverse proxy documentation: https://element-hq.github.io/synapse/latest/reverse_proxy.html
- Synapse federation delegation documentation: https://element-hq.github.io/synapse/latest/delegate.html
- Synapse PostgreSQL documentation: https://element-hq.github.io/synapse/latest/postgres.html
- Synapse configuration manual: https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html
- Element Web configuration documentation: https://github.com/element-hq/element-web/blob/develop/docs/config.md
- Docker Compose file reference for the obsolete top-level version field: https://docs.docker.com/reference/compose-file/version-and-name/
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The Compose file used a named `synapse-data` volume, while the configuration generation command wrote `homeserver.yaml` to `./synapse-data`. Changed Synapse to bind-mount `./synapse-data:/data` so the generated configuration is actually used.
- The guide required port 8448 and exposed `8448:8448` on the Synapse container, but the Synapse listener only listened on port 8008 and federation delegation used `matrix.yourdomain.com:443`. Removed the incorrect 8448 exposure and updated prerequisites to ports 80 and 443.
- The base-domain Matrix `.well-known` files were not served over HTTPS on `yourdomain.com`, which is required for server delegation when `server_name` is `yourdomain.com`. Added the base-domain DNS note and an HTTPS Nginx server block for `yourdomain.com`.
- The Synapse PostgreSQL config used `database: synapse` in `args`; Synapse's PostgreSQL docs use libpq/psycopg2 connection parameters such as `dbname`. Changed it to `dbname: synapse`.
- The Synapse config omitted `public_baseurl`, which the official docs recommend setting to the client-facing homeserver URL when using client well-known discovery. Added `public_baseurl: "https://matrix.yourdomain.com"`.
- The Nginx proxy config used `proxy_set_header Host $host`; Synapse's reverse-proxy example preserves the port with `$host:$server_port`. Updated the Matrix proxy location accordingly and added `proxy_http_version 1.1`.
- The Nginx snippet used `listen 443 ssl http2`, which is outdated for current Nginx. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The Element config used camelCase `showLabsSettings`, while current Element docs prefer snake_case and warn camelCase compatibility may be removed. Changed it to `show_labs_settings`.
- The Element homeserver config included an extra `server_name` field under `m.homeserver`; Element docs show copying the Matrix client well-known object with `base_url`. Removed the extra field.
- The cleanup command claimed `docker compose down -v` removed everything, but Synapse data is now a bind mount. Added an explicit `rm -rf synapse-data` step for config, keys, and media cleanup.

## Review Notes
- The Docker Compose and JSON snippets were syntax-checked locally. Nginx was not installed in the workspace, so the Nginx config was reviewed against official directive documentation rather than tested with `nginx -t`.
- The post uses `latest` container tags. This is common in simple tutorials, but production deployments should pin versions and test upgrades before rollout.
