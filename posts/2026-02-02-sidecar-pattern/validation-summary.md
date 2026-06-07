# Validation Summary: How to Implement Sidecar Pattern for Cross-Cutting Concerns

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Kubernetes (native sidecars via `initContainers` with `restartPolicy: Always`, 1.28+)
- Fluent Bit 2.2 (tail input, record_modifier filter, Elasticsearch + S3 outputs)
- Prometheus StatsD Exporter v0.26.0 (statsd-to-Prometheus mapping)
- OAuth2 Proxy v7.5.1 (Google provider, Redis session store)
- Open Policy Agent (OPA) 0.60.0 with Rego (bundle service, decision logs)
- HashiCorp Consul Template 0.35.0 (Consul + Vault integration)
- Envoy v1.28 (HTTP connection manager, Zipkin tracer to Jaeger collector)
- Prometheus Operator PodMonitor (`monitoring.coreos.com/v1`)

## Sources Consulted
- Kubernetes sidecar containers docs: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes `shareProcessNamespace` docs: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Fluent Bit configuration / monitoring docs: https://docs.fluentbit.io/manual/administration/monitoring
- Prometheus StatsD Exporter README: https://github.com/prometheus/statsd_exporter
- OAuth2 Proxy v7.5.1 configuration: https://github.com/oauth2-proxy/oauth2-proxy/blob/v7.5.1/docs/docs/configuration/overview.md
- OPA REST API (Health API): https://www.openpolicyagent.org/docs/latest/rest-api/
- OPA Management / Bundles: https://www.openpolicyagent.org/docs/latest/management-bundles/
- Consul Template configuration: https://github.com/hashicorp/consul-template/blob/main/docs/configuration.md
- Envoy v3 API tracing (Zipkin) docs: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/zipkin.proto
- Prometheus Operator PodMonitor CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PodMonitor

## Issues Found
1. **OPA readiness probe used wrong query parameter.** The probe `path: /health?bundle=true` used the singular form. Per the OPA Health API, the correct query parameter is `bundles` (plural). Changed `path: /health?bundle=true` to `path: /health?bundles=true` so the probe actually reflects bundle activation status.
2. **Consul Template Vault token was treated as a literal string.** The original config had `token = "/vault/token"`, which Consul Template would interpret as the literal token value `/vault/token`, not a file path — so it would never authenticate to Vault. Changed to `vault_agent_token_file = "/vault/token"`, which is the documented way to read a token from a file. Removed `renew_token = true` because the docs state it is incompatible with `vault_agent_token_file`. Added an inline comment noting the constraint.
3. **`pkill -HUP -f backend-service` from the sidecar would never find the main app's process.** Kubernetes pods do not share a PID namespace between containers by default, so the consul-template sidecar's `pkill` would silently do nothing (it's hidden by `|| true`). Added `shareProcessNamespace: true` to the pod spec so the sidecar can actually see and signal the main app's process.

## Review Notes
- The post correctly describes Kubernetes 1.28 native sidecar support via `initContainers` with `restartPolicy: Always`. Worth noting (not corrected) that this was alpha in 1.28, beta in 1.29, and stable in 1.33 — so the example pod would need the `SidecarContainers` feature gate enabled on older clusters between 1.28 and 1.33.
- `--skip-auth-route=/health` is accepted by OAuth2 Proxy and matches all methods, but newer docs recommend the `METHOD=path_regex` form (e.g. `GET=^/health$`). Either works.
- Signaling a process across containers via `shareProcessNamespace: true` may additionally require the `SYS_PTRACE` capability on the signaling container in some Kubernetes/runtime combinations; not added because basic SIGHUP via `pkill` typically works without it when the target UID matches.
- Fluent Bit also exposes `/api/v2/health` (JSON, returns 500 on failure), which is generally preferred over `/api/v1/health` for probes. The v1 endpoint used in the post is still valid.
- The OAuth2 Proxy cookie-secret generation hint (`openssl rand -base64 32 | head -c 32`) yields a 32-character ASCII string treated as 32 raw bytes by oauth2-proxy — which is one of the supported AES key sizes, so this works.
- Envoy image tag `v1.28-latest` is a valid rolling tag, but pinning to an exact patch version (e.g. `v1.28.7`) would be safer for production.
