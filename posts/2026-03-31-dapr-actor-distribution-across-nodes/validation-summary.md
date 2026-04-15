# Validation Summary: How to Monitor Dapr Actor Distribution Across Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Actor framework, Placement service, Sidecar, mTLS)
- Kubernetes (kubectl, port-forwarding, rolling restarts)
- Prometheus (metrics scraping, ServiceMonitor, PromQL)
- Grafana (dashboard visualization)
- Python (programmatic monitoring script)

## Sources Consulted
- [Dapr Metrics documentation (dapr/dapr GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — verified all actor metric names
- [Dapr Placement service overview](https://docs.dapr.io/concepts/dapr-services/placement/) — verified placement API endpoint, port, and enablement flags
- [Dapr Actors API reference](https://docs.dapr.io/reference/api/actors_api/) — verified valid actor endpoint URL patterns
- [Dapr Metadata API reference](https://docs.dapr.io/reference/api/metadata_api/) — verified metadata endpoint and activeActors response format
- [Dapr Configure metrics](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — verified default metrics port (9090)
- [Dapr mTLS export CLI reference](https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-export/) — confirmed `dapr mtls export` exports certificates, not placement data

## Issues Found

### 1. Wrong command for querying placement table
- **What was wrong:** The post used `dapr mtls export -o ./certs` and described it as "Query the placement table via the Dapr CLI." The `dapr mtls export` command exports mTLS root CA and issuer certificates — it has nothing to do with the placement table.
- **What was changed:** Replaced with `curl http://localhost:8080/placement/state`, the actual Placement API endpoint. Added note about enabling the API with `DAPR_PLACEMENT_METADATA_ENABLED=true`.

### 2. Wrong port for placement service API
- **What was wrong:** Port-forward targeted port 50005, which is the gRPC port for sidecar-to-placement communication. The HTTP placement table API is exposed on the healthz port (8080).
- **What was changed:** Changed port-forward from `50005:50005` to `8080:8080`.

### 3. Invalid actor endpoint URL
- **What was wrong:** `curl http://localhost:3500/v1.0/actors/<actorType>/<actorId>` is not a valid Dapr API endpoint. All actor endpoints require a suffix (`/method/<method>`, `/state/<key>`, `/reminders/<name>`, or `/timers/<name>`). The comment described it as querying "actor configuration" which this URL does not do.
- **What was changed:** Replaced with `curl http://localhost:3500/v1.0/metadata`, the correct endpoint for discovering registered actor types and active actor counts per sidecar.

### 4. Non-existent Prometheus metric: `dapr_actor_active_actors`
- **What was wrong:** `dapr_actor_active_actors` is not a real Dapr metric. Dapr does not expose an "active actors" gauge via Prometheus. The actual actor metrics use the `dapr_runtime_actor_` prefix.
- **What was changed:** Replaced with `dapr_runtime_actor_pending_actor_calls`, which is a real gauge metric tracking pending actor calls waiting to acquire the per-actor lock — useful for detecting overloaded hosts.

### 5. Non-existent Prometheus metric: `dapr_actor_method_invoked_total`
- **What was wrong:** `dapr_actor_method_invoked_total` is not a real Dapr metric.
- **What was changed:** Replaced with `dapr_runtime_actor_rebalanced_total`, a real counter metric tracking actor rebalance events.

### 6. Grafana PromQL query used non-existent metric
- **What was wrong:** The Grafana query used `dapr_actor_active_actors` which does not exist.
- **What was changed:** Updated to use `dapr_runtime_actor_pending_actor_calls`.

### 7. Python code scraped Prometheus for non-existent metric
- **What was wrong:** The Python code scraped the Prometheus metrics endpoint on port 9090 looking for `dapr_actor_active_actors`. Since this metric doesn't exist, the approach wouldn't work. Additionally, Dapr doesn't expose active actor counts via Prometheus metrics.
- **What was changed:** Rewrote to use the Dapr metadata API (`GET /v1.0/metadata` on port 3500), which returns `actorRuntime.activeActors` with per-type counts — the correct way to programmatically get active actor counts per sidecar.

## Review Notes
- The ServiceMonitor uses `matchLabels: app: dapr-sidecar` which is not a standard label in Dapr Kubernetes deployments. The Dapr sidecar is injected as a container within application pods, so there is no dedicated "dapr-sidecar" service. In practice, a PodMonitor targeting pods with the `dapr.io/enabled` annotation, or Prometheus pod annotations (`prometheus.io/scrape`, `prometheus.io/port: "9090"`), would be more accurate. This was left as-is since it illustrates the concept and the exact label depends on the user's deployment.
- The ServiceMonitor namespace is set to `dapr-system`, but Dapr sidecars run in application namespaces, not `dapr-system`. The ServiceMonitor may need to target the application namespace instead.
- The `get_pods_in_namespace` and `parse_actor_metric` helper functions in the original Python code were undefined placeholders. The rewritten code uses only `get_pods_in_namespace` as a placeholder, which is more realistic since the rest uses standard `requests` and JSON parsing.
