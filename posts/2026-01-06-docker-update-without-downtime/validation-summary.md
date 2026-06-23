# Validation Summary: How to Update Running Containers Without Downtime

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker / Docker Compose
- Docker Swarm (Compose Deploy Specification)
- Traefik v3 (reverse proxy, blue-green and weighted/canary routing)
- Nginx (upstream load balancing)
- Node.js / Express (graceful shutdown, health endpoint)
- Python / Flask / Gunicorn (graceful shutdown)
- Bash deployment scripting (with `jq`)

## Sources Consulted
- Docker Compose `ps` CLI reference — https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose issue #10958 (`ps --format json` no longer returns an array in 2.21.0) — https://github.com/docker/compose/issues/10958
- Docker Compose issue #11784 (`ps --format json` is newline-delimited, closed not planned) — https://github.com/docker/compose/issues/11784
- Traefik Providers overview / cross-provider reference (`@docker` suffix) — https://doc.traefik.io/traefik/providers/overview/
- Traefik weighted load balancing / canary deployments — https://iximiuz.com/en/posts/traefik-canary-deployments-with-weighted-load-balancing/
- Compose Deploy Specification (`deploy`, `update_config`, Swarm enforcement) — https://docs.docker.com/reference/compose-file/deploy/
- Gunicorn settings (`graceful_timeout`, `timeout`, server hooks) — https://docs.gunicorn.org/en/stable/settings.html

## Issues Found
1. **Strategy 3 (Weighted Traffic Shifting) — missing cross-provider `@docker` suffix.**
   The `traefik/dynamic.yml` (file provider) referenced the weighted backends as
   `name: api-v1` and `name: api-v2`, but those services are defined via Docker
   labels (Docker provider). Traefik requires cross-provider references to be
   namespaced with the `@provider` suffix; without it, Traefik resolves the names
   within the file provider and fails to find the services. **Fixed** to
   `name: api-v1@docker` and `name: api-v2@docker`, with an explanatory comment.

2. **Complete Example `deploy.sh` — incorrect instance counting.**
   The healthy/total counts used `jq -r 'select(...)' | wc -l`. Because
   `docker compose ps --format json` emits one JSON object per line and bare
   `select()` passes the whole (pretty-printed, multi-line) object through, `wc -l`
   counted JSON lines rather than containers, contradicting the comment
   "Count healthy instances vs total instances." **Fixed** by piping the matched
   objects through `| .Name` so each container contributes exactly one line.

## Review Notes
- The post's `jq 'select(...)'` usage (without `.[]`) is **correct** for current
  Docker Compose: since v2.21.0 `ps --format json` outputs newline-delimited JSON
  (NDJSON), which jq processes per line. The Docker docs example still shows an
  array, but that reflects older behavior; the change was intentional and the
  request to revert was closed as not planned.
- The note that the `deploy` section (`replicas`, `update_config`, `order: start-first`,
  `failure_action: rollback`) is only fully enforced under Docker Swarm
  (`docker stack deploy`) and largely ignored by standalone `docker compose up`
  is accurate and an important caveat — correctly stated by the author.
- Several `healthcheck` examples use `curl`, which is not present in minimal base
  images (e.g. `node:*-alpine`) unless installed; the application image `myapp` is
  hypothetical, so this is not an error, but readers should ensure `curl` (or
  `wget`, as used in the final example) exists inside the container.
- The blue-green deployment script is intentionally illustrative — the actual
  traffic switch (`docker compose exec traefik sh -c "..."`) is left as a stubbed
  comment ("In practice, update labels or file configuration"). This is clearly
  signposted and not a correctness issue, but the switch is not literally
  implemented.
- Gunicorn config, the Node.js SIGTERM handler, the Nginx `upstream`/`backup`/
  `proxy_next_upstream` configuration, `stop_grace_period`, and the use of the
  exec form of `CMD` for signal forwarding are all technically accurate.
