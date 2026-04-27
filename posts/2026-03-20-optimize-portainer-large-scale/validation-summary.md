# Validation Summary: How to Optimize Portainer for Large-Scale Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE (server and agent)
- Docker (daemon configuration, daemon.json)
- Docker Compose
- Docker Registry (registry:2 as a pull-through cache)
- Portainer HTTP API (stack creation)
- GNU parallel
- Prometheus and Grafana
- cAdvisor

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Edge Agent docs: https://docs.portainer.io/advanced/edge-agent
- Portainer agent GitHub: https://github.com/portainer/agent
- Portainer deprecated/removed features: https://docs.portainer.io/v/ce-2.11/advanced/deprecated
- Portainer issue #1510 (`--no-analytics`): https://github.com/portainer/portainer/issues/1510
- Portainer API docs (stack endpoints, 2.27+ removal of `POST /stacks`): https://docs.portainer.io/api/docs
- Portainer Stack Deployment overview: https://deepwiki.com/portainer/portainer/3.3-stack-management
- Docker daemon Prometheus metrics: https://docs.docker.com/engine/daemon/prometheus/
- Docker daemon configuration reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Registry as a pull-through cache: https://distribution.github.io/distribution/recipes/mirror/
- Prometheus scrape configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found

1. **Wrong default snapshot interval and invalid value format.** The post claimed `--snapshot-interval` had a default of `60s` and used `--snapshot-interval=300`. The actual default per Portainer's CLI docs is `5m`, and the flag accepts a duration string parsed by Go's `time.ParseDuration` (e.g. `30s`, `5m`, `1h`); a bare integer like `300` will not parse. Additionally, setting it to `5m` would not have actually increased the value above the default. Changed the comment to `(default: 5m)` and the value to `--snapshot-interval=10m` so the example genuinely raises the interval.

2. **Deprecated `--no-analytics` flag.** This flag was deprecated in Portainer v2.0 and is no longer listed in the current CLI documentation. Removed it (and the accompanying comment) to avoid recommending a deprecated/removed flag.

3. **Duplicate `restart` key in the Portainer compose service.** The Step 1 service defined `restart: unless-stopped` twice (once at the top of the service and again after the `deploy` block), which is invalid YAML (duplicate mapping keys). Removed the duplicate occurrence after the `deploy` block.

4. **Misleading Portainer agent comment.** The `LOG_LEVEL=WARN` line was annotated as "Reduce polling frequency for large environments". `LOG_LEVEL` only controls log verbosity; the Edge agent's poll frequency is controlled by Portainer server settings, not by this env var. Reworded the comment to "Reduce log verbosity for large environments".

5. **Portainer does not expose Prometheus metrics natively.** The Step 6 Prometheus config scraped `portainer:9000` with `metrics_path: /api/status`, but `/api/status` returns a JSON status payload, not Prometheus text format, so the scrape would fail to parse. Removed the Portainer-specific scrape job and added a note explaining that the Portainer container should be observed via the Docker daemon metrics endpoint and cAdvisor (both of which the post already configures).

## Review Notes

- The Docker `daemon.json` example contains `//` comments. Standard JSON (and Docker's daemon.json parser) does not support comments; readers should strip them before deploying. Left as-is because this is a widespread documentation convention and the surrounding prose makes the intent clear.
- `metrics-addr` no longer requires `experimental: true` in modern Docker Engine versions, but enabling experimental does not break anything and the post is consistent on this point.
- `REGISTRY_PROXY_TTL` is honoured by registry:2 as it follows the standard `REGISTRY_<SECTION>_<KEY>` env var convention for the `proxy.ttl` config field.
- The `POST /api/stacks/create/standalone/file` endpoint is the correct form for Portainer 2.19+ (the legacy `POST /stacks` endpoint was removed in 2.27.0).
- Port 9000 is bound inside the container via `--bind=:9000` but not published in `ports:` — this is intentional if only HTTPS access is desired and was left unchanged.
