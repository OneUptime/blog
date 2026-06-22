# Validation Summary: How to Install Apache APISIX on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Apache APISIX 3.x (API gateway)
- etcd 3.5.x (configuration store)
- OpenResty / NGINX (underlying platform)
- Docker / Docker Compose
- APISIX Dashboard
- Prometheus, Zipkin, Kafka, HTTP logging (observability)
- JWT / key-auth / consumer-restriction (authentication & authorization)
- Let's Encrypt / ACME, SSL/TLS
- Ubuntu (systemd, apt)

## Sources Consulted
- APISIX deployment modes / config.yaml structure — https://apisix.apache.org/docs/apisix/deployment-modes/
- Official APISIX Docker example config.yaml — https://github.com/apache/apisix-docker/blob/master/example/apisix_conf/config.yaml
- Official APISIX Docker example docker-compose.yml — https://github.com/apache/apisix-docker/blob/master/example/docker-compose.yml
- jwt-auth plugin — https://apisix.apache.org/docs/apisix/plugins/jwt-auth/
- public-api plugin (exposes /apisix/plugin/jwt/sign) — https://apisix.apache.org/docs/apisix/plugins/public-api/
- traffic-split plugin schema — https://apisix.apache.org/docs/apisix/plugins/traffic-split/
- node-status plugin (exposes /apisix/status) — https://apisix.apache.org/docs/apisix/plugins/node-status/
- Status API / health check — https://apisix.apache.org/docs/apisix/status-api/ and https://apisix.apache.org/docs/apisix/tutorials/health-check/

## Issues Found
1. **Docker `apisix-config.yaml` used the deprecated APISIX 2.x layout.** It placed `etcd` at the top level and `enable_admin`/`admin_listen` under `apisix`. In APISIX 3.x (the post deploys `apache/apisix:3.8.0-debian`), etcd must be under `deployment.etcd` and admin settings under `deployment.admin`; the old keys are ignored, so APISIX would fail to connect to etcd and would not start. Restructured the Docker config to the 3.x `deployment.*` layout (moved `etcd` under `deployment.etcd`, moved `admin_listen` under `deployment.admin`, and added `allow_admin: 0.0.0.0/0` since the admin API listens on `0.0.0.0` inside the Docker network — the default `127.0.0.0/24` would block it).

2. **`/apisix/status` health check would fail in the Docker deployment.** This endpoint is exposed by the `node-status` plugin, which was missing from the Docker `apisix-config.yaml` plugins list (it is present in the main bare-metal config). Added `node-status` to the Docker plugins list so the `healthcheck` and the `curl .../apisix/status` test command work.

3. **JWT sign endpoint presented as directly callable.** In APISIX 3.x, `GET /apisix/plugin/jwt/sign` is not exposed by default; it must be published via a route using the `public-api` plugin. Added a route-creation step using `public-api` before the sign request, and added `public-api` to the main config plugins list (an explicit `plugins:` block overrides APISIX defaults, so it must be listed).

4. **Header-based traffic-split was malformed.** The example put a `weighted_upstreams` array at the plugin level (sibling of `rules`), which is not part of the traffic-split schema and would be ignored — and the route had no fallback upstream. Moved the production fallback into a second entry in `rules` with no `match` block (a matchless rule matches all requests), which is the correct way to express a default upstream.

5. **Outdated troubleshooting advice.** The "connection refused on port 9180" row recommended setting `enable_admin: true`, a 2.x option that does not exist in the 3.x config used throughout the post. Updated to recommend configuring `deployment.admin` (admin_listen/admin_key).

## Review Notes
- The main (bare-metal) `config.yaml` example correctly uses the APISIX 3.x `deployment.admin` / `deployment.etcd` layout — only the Docker variant had drifted to the old format.
- etcd binary install (3.5.11), systemd unit, apt/source/Docker install paths, route/upstream/consumer JSON, key-auth, limit-req, limit-count, Prometheus (port 9091, `/apisix/prometheus/metrics`), Zipkin, Kafka, and HTTP logger examples are all consistent with current APISIX 3.x documentation.
- Version caveat (not changed, as it is a registry-availability matter rather than a config error): the Docker Compose stack uses `bitnami/etcd:3.5`. Following Bitnami's 2025 catalog changes, the official APISIX Docker example now pins `bitnamilegacy/etcd:3.5.11`. Readers may need to switch the image registry/tag if the `bitnami/etcd` tag becomes unavailable on Docker Hub.
- The APISIX Dashboard (`apache/apisix-dashboard`) is in maintenance/limited-support status upstream; the dashboard sections remain accurate for the 3.0.x line referenced but readers should expect the project to evolve.
- The default admin API keys (`edd1c9f...`) are APISIX's well-known defaults; the post correctly and repeatedly warns to change them in production.
