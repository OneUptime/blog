# Validation Summary: How to Configure Prometheus Remote Write to Send Metrics to Grafana Mimir

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prometheus
- Prometheus remote write
- Prometheus Operator
- Grafana Mimir
- Kubernetes
- Grafana data source provisioning
- mimirtool

## Sources Consulted
- Prometheus remote write tuning: https://prometheus.io/docs/practices/remote_write/
- Prometheus configuration reference for `remote_write`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus `promtool` command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Mimir authentication and authorization: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir deployment modes: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir TSDB block upload: https://grafana.com/docs/mimir/latest/configure/configure-tsdb-block-upload/
- Grafana Mimirtool documentation: https://grafana.com/docs/mimir/latest/manage/tools/mimirtool/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The initial Prometheus remote write example attempted to set a Mimir tenant through write relabeling to `__tenant_id__`. Mimir uses the `X-Scope-OrgID` HTTP header for tenancy, so I changed the example to set `headers: X-Scope-OrgID`.
- The remote write failure description implied samples only queue in memory until the buffer fills. Prometheus remote write retries from the WAL and can lose unsent data after WAL compaction, so I corrected that explanation.
- The multi-replica Mimir example used memberlist as the KV store but did not configure memberlist peers. I added `memberlist.join_members` pointing at the headless Kubernetes service.
- The performance example used `maxRetries` as if it were the current Prometheus retry control. I replaced it with `retryOnRateLimit`, which matches the Prometheus Operator queue configuration for retrying HTTP 429 responses.
- The authentication section said Mimir supports basic auth, bearer tokens, and OAuth directly. Mimir expects authentication/authorization to be handled by a proxy or gateway, so I clarified that these are remote write client authentication mechanisms used with an authenticating proxy.
- The backfill section used `promtool tsdb dump` piped into `promtool push metrics --url`, which does not match the documented `promtool push metrics` syntax and is not the recommended Mimir historical backfill path. I replaced it with Mimir's documented block upload and `mimirtool backfill` workflow.

## Review Notes
- The post uses Grafana Mimir `2.10.0`, which is older than the current Mimir documentation version reviewed on 2026-06-04. The corrected concepts and endpoint paths remain valid, but future updates should consider refreshing the example image version.
- The Kubernetes Mimir manifest remains a simplified tutorial example. Grafana recommends the distributed Helm chart for production microservices deployments.
