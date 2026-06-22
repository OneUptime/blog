# Validation Summary: How to Install Kong API Gateway on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation and configuration walkthrough)

## Technologies Covered
- Kong Gateway (API gateway, version 3.7.x referenced)
- Ubuntu (apt package management)
- PostgreSQL (Kong datastore)
- NGINX / OpenResty (Kong's underlying proxy)
- Redis (distributed rate limiting backend)
- Kong plugins: rate-limiting, request/response-transformer, file-log, http-log, tcp-log, cors, jwt, key-auth, prometheus
- deck (Kong declarative config CLI)
- Prometheus & Grafana (monitoring)
- jwt-cli (JWT generation tool)
- systemd (service management)

## Sources Consulted
- Kong Gateway install docs — https://developer.konghq.com/gateway/install/ (confirmed `kong-enterprise-edition` is the current apt package name and `gateway-XX` repo layout)
- Kong "Why We're Deprecating Cassandra Support" — https://konghq.com/blog/product-releases/cassandra-support-deprecated
- Kong Gateway 3.4 breaking changes — https://docs.konghq.com/gateway/latest/breaking-changes/34x (Cassandra removed)
- Kong Prometheus plugin docs — https://developer.konghq.com/plugins/prometheus/ (metric names: `kong_request_latency_ms`, `kong_kong_latency_ms`, `kong_upstream_latency_ms`, `kong_bandwidth_bytes`, `kong_http_requests_total`, `kong_upstream_target_health`)
- Kong load balancing docs — https://developer.konghq.com/gateway/load-balancing/ (algorithms: round-robin, consistent-hashing, least-connections, latency)
- Kong upstream schema — https://github.com/Kong/kong/blob/master/kong/db/schema/entities/upstreams.lua
- Kong CLI reference — https://developer.konghq.com/gateway/cli/reference/ (`kong check`, `kong config parse`, `--v`/`--vv` verbose flags)
- mike-engel/jwt-cli — https://github.com/mike-engel/jwt-cli (Rust tool, installed via cargo/homebrew; `jwt encode --alg --exp --iss --secret`)
- Kong official Grafana dashboard — https://github.com/Kong/kong/blob/master/kong/plugins/prometheus/grafana/kong-official.json and https://grafana.com/grafana/dashboards/7424-kong-official/

## Issues Found
1. **Cassandra listed as a supported datastore (outdated).** The intro to the installation section said Kong runs "with a database (PostgreSQL/Cassandra)." Cassandra support was deprecated in Kong 2.7 and fully removed in Kong 3.4, so the 3.7 version covered here does not support it. Changed to "with a database (PostgreSQL)."

2. **`latency` load-balancing algorithm labeled "Enterprise only" (incorrect).** The `latency` (lowest-latency) algorithm is part of open-source Kong Gateway's upstream schema and is not an Enterprise-exclusive feature. Removed the "(Enterprise only)" note and clarified it routes to the server with the lowest measured latency.

3. **jwt-cli install method and flag incorrect.** The post installed the JWT tool with `npm install -g jwt-cli`, but the `jwt encode --secret --exp --iss` syntax shown belongs to mike-engel's Rust-based jwt-cli, which is installed via `cargo install jwt-cli` (or Homebrew), not npm. The npm package of the same name is a decode-only tool and has no `encode` command. Also, that tool's algorithm flag is `--alg`, not `--algorithm`. Fixed the install command to `cargo install jwt-cli` and changed `--algorithm HS256` to `--alg HS256`.

4. **Outdated Prometheus latency metric name.** The post referenced `kong_latency_bucket{...,type="request",...}`, which is the legacy metric format. In current Kong Prometheus plugin versions the latency histograms were split and renamed to `kong_request_latency_ms`, `kong_kong_latency_ms`, and `kong_upstream_latency_ms` (the `type` label no longer exists). Updated the example to `kong_request_latency_ms_bucket{service="user-service",le="100"}` and updated the corresponding `grep kong_latency` line to `grep kong_request_latency_ms`.

5. **Broken Grafana dashboard URL.** The official `kong-official.json` dashboard does not live at `.../Kong/kong/master/grafana/kong-official.json`; it is under `kong/plugins/prometheus/grafana/`. Corrected the raw GitHub URL path.

6. **`kong config parse` used on the wrong file.** In the "Useful Debug Commands" section the post ran `kong config parse /etc/kong/kong.conf --v`. `kong config parse` validates a *declarative* config file (e.g. `kong.yml`), not the main `kong.conf`. Replaced it with `kong check /etc/kong/kong.conf`, which is the correct command for validating the main configuration file.

7. **Wrong verbose flag form.** In the declarative-config validation section, `kong config parse /etc/kong/kong.yml -v` used `-v`; Kong's CLI uses `--v` (and `--vv`) for verbose/debug output. Changed `-v` to `--v`.

## Review Notes
- The apt package name `kong-enterprise-edition` and the `gateway-37` repository path are correct for current Kong Gateway distributions — the single Enterprise-edition package runs in free/OSS mode without a license, so this is consistent with the post calling Kong open-source. Version `3.7.1.2` is plausible and is flagged as adjustable.
- `deck gateway dump` / `deck gateway sync` are the correct subcommands for deck 1.x (the older `deck dump`/`deck sync` forms were namespaced under `gateway`). Verified against the v1.38.1 reference.
- Admin API, Services/Routes/Plugins/Consumers/Upstreams endpoints, plugin config keys, and the systemd unit are all consistent with current Kong 3.x documentation.
- Kong Manager configuration (`admin_gui_*`) is an Enterprise/Konnect feature surface; it will only function on the Enterprise edition (which is the package installed here), so it is accurate in context, though readers running a license-free deployment should be aware Kong Manager Enterprise auth features require a license.
- The Prometheus plugin metrics are exposed on `/metrics` on the Admin API (8001) as shown; Kong also recommends the Status API for production scrapes, but the Admin API endpoint used here is valid.
