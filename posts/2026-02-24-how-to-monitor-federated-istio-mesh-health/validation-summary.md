# Validation Summary: How to Monitor Federated Istio Mesh Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio multicluster and east-west gateways
- Istio telemetry and control plane metrics
- Prometheus scrape configuration and PromQL
- Thanos sidecar and query
- Grafana dashboards
- Kubernetes Deployments and CronJobs
- Envoy listener metrics

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio multicluster east-west gateway documentation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Thanos v0.34 sidecar documentation: https://thanos.io/v0.34/components/sidecar.md/
- Thanos v0.34 query documentation: https://thanos.io/v0.34/components/query.md/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Envoy listener statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats

## Issues Found
- The Prometheus install commands used Istio `release-1.20`, which is outdated relative to current Istio docs. Updated both commands to use `release-1.29`, matching the current Istio Prometheus integration example.
- The custom Prometheus scrape job rewrote `__address__` from only the port annotation, producing an invalid target such as `15020:15020`. Updated the relabeling to keep annotated pods, preserve the annotated metrics path, and build the scrape address from pod IP plus the annotated Prometheus port.
- The east-west gateway PromQL used `reporter="destination"` and `destination_service_name="istio-eastwestgateway"`, which is not the right reporter orientation for gateway-emitted Istio metrics. Updated the examples to select the east-west gateway workload with `reporter="source"`, `source_workload`, and `source_workload_namespace`.
- The control plane metric block referenced `pilot_k8s_endpoints_total`, which is not an exported Istiod metric in the current reference, and described `pilot_xds_pushes` as a remote endpoint sync status metric. Replaced those with `istiod_remote_cluster_sync_status` and `istiod_managed_clusters`, and scoped the push latency histogram to EDS.
- The Thanos Deployment snippets were invalid `apps/v1` Deployments because they lacked required selectors and matching pod template labels. Added selectors and labels to both snippets.
- The Thanos sidecar example omitted Prometheus `--web.enable-admin-api`, which Thanos sidecar expects for reading Prometheus metadata. Added the flag.
- The Thanos Query example used deprecated `--store` flags for Thanos v0.34 and used `cluster` as the replica label, which would deduplicate across clusters. Replaced `--store` with `--endpoint` and changed the replica label to `replica`.
- The Grafana and alert PromQL used `source_cluster!=destination_cluster`, which is not valid PromQL because label matchers cannot compare one label to another. Replaced those examples with explicit `cluster-west` to `cluster-east` and `cluster-east` to `cluster-west` matchers.
- The gateway active connection panel selected an upstream cluster regex for the east-west gateway. Changed it to use Envoy listener downstream active connections for the `eastwest-gateway` scrape job.
- The remote health-check explanation implied that a generic Kubernetes service DNS name always calls the remote mesh. Clarified that the target should be a service that resolves across the mesh, such as one deployed only in the remote cluster.
- The alert for remote endpoint sync lag queried `pilot_xds_push_time{type="eds"}` directly even though the current Istiod metric is a distribution exported as histogram series in Prometheus. Updated it to use `histogram_quantile` over `pilot_xds_push_time_bucket`.

## Review Notes
The post is now technically valid as a focused monitoring guide. The examples still assume two clusters named `cluster-west` and `cluster-east`; future revisions could make the PromQL examples easier to reuse by showing how to generate recording rules for larger cluster sets.
