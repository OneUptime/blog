# Validation Summary: How to Ship Logs to Loki with Vector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Vector
- Vector Remap Language (VRL)
- Grafana Loki
- Docker
- Kubernetes
- Helm
- Prometheus metrics
- TOML and YAML configuration

## Sources Consulted
- Vector installation documentation: https://vector.dev/docs/setup/installation/
- Vector Docker installation documentation: https://vector.dev/docs/setup/installation/platforms/docker/
- Vector releases/download page: https://vector.dev/download/
- Vector Loki sink configuration reference: https://vector.dev/docs/reference/configuration/sinks/loki/
- Vector file source configuration reference: https://vector.dev/docs/reference/configuration/sources/file/
- Vector journald source configuration reference: https://vector.dev/docs/reference/configuration/sources/journald/
- Vector Docker logs source configuration reference: https://vector.dev/docs/reference/configuration/sources/docker_logs/
- Vector Kubernetes logs source configuration reference: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Vector syslog source configuration reference: https://vector.dev/docs/reference/configuration/sources/syslog/
- Vector HTTP server source configuration reference: https://vector.dev/docs/reference/configuration/sources/http_server/
- Vector remap, filter, route, reduce, dedupe, throttle, and sample transform references: https://vector.dev/docs/reference/configuration/transforms/
- VRL language and function documentation: https://vrl.dev/
- Kubernetes DaemonSet and RBAC documentation: https://kubernetes.io/docs/
- Local validation with official Docker images `timberio/vector:0.34.1-alpine` and `timberio/vector:0.56.0-alpine`.

## Issues Found
- The Docker and Kubernetes examples pinned the old `timberio/vector:0.34.1-alpine` image. Updated them to `timberio/vector:0.56.0-alpine`, which is the current version listed by Vector's official download and Docker documentation.
- The production config placed `data_dir` after the `[api]` table, causing TOML to parse it as `api.data_dir`; Vector rejects that field. Moved `data_dir` above `[api]`.
- The production config included `[api].playground = false`, which is no longer accepted by current Vector. Removed the deprecated field.
- Several Loki sink examples used `[sinks.<name>.labels]` and then continued with `batch.*` or `buffer.*` keys. In TOML those later keys were parsed under `labels`, causing Vector to reject the config. Converted those labels to dotted `labels.*` keys while preserving the same values.
- The VRL trace extraction used `parse_regex(...)?`, which is not valid VRL syntax. Replaced it with explicit `parsed_trace, err = parse_regex(...)` handling.
- The VRL `redact` call assigned a fallible expression directly to `.message`. Added `?? .message` fallback handling.
- Filter examples used `r"..."` regex literals, which are invalid VRL syntax. Changed them to `r'...'`.
- The production noise filter used `string!(.message) ?? ""`; current VRL rejects that pattern. Replaced it with `to_string(.message) ?? ""`.
- The throttle transform examples used `key_field = "service"` and `key_field = "pod"`, which bucket by literal strings rather than event fields. Changed them to `key_field = "{{ service }}"` and `key_field = "{{ pod }}"`.
- Current Vector's VRL type checker rejected fallible object handling in the production Kubernetes parser. Updated `merge(., parsed)` to `merge!(., object!(parsed))`.
- Current Vector's VRL type checker rejected unnecessary coalescing on direct nested field access. Replaced the app label and journald service lookups with `get(...) ?? "unknown"`.

## Review Notes
The corrected production configuration validates with Vector 0.34.1 and Vector 0.56.0. Validation emits an expected warning that the route transform's `_unmatched` output has no consumers. The complete Loki sink example includes TLS certificate paths that are environment-specific; syntax was verified, but runtime success requires those files to exist.
