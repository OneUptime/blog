# Validation Summary: How to Scale Loki for High Volume

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Loki microservices and simple scalable deployments
- Kubernetes Deployments, StatefulSets, and HorizontalPodAutoscalers
- Prometheus/PromQL monitoring and alerting
- Memcached caching for Loki
- Object storage-backed Loki TSDB indexes

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki scale documentation: https://grafana.com/docs/loki/latest/operations/scalability/
- Grafana Loki zone-aware ingesters documentation: https://grafana.com/docs/loki/latest/operations/zone-ingesters/
- Grafana Loki caching documentation: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki meta-monitoring documentation: https://grafana.com/docs/loki/latest/operations/meta-monitoring/
- Grafana Loki v3.7.2 source for query scheduler metrics: https://github.com/grafana/loki/tree/v3.7.2
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- Kubernetes `apps/v1` Deployment snippets omitted `spec.selector` and matching pod template labels. Added selectors and labels so the manifests conform to Kubernetes controller requirements.
- Kubernetes StatefulSet snippets omitted `serviceName`, `spec.selector`, and matching pod template labels. Added the required fields for the ingester examples.
- Loki configuration used the obsolete `query_frontend` top-level block. Replaced it with the current `frontend` block used by Loki 3.x.
- Loki configuration included removed or outdated options: `ingester.max_transfer_retries`, `storage_config.tsdb_shipper.shared_store`, and `limits_config.enforce_metric_name`. Removed those fields.
- Query scheduler example configured only the frontend. Added `frontend_worker.scheduler_address` so queriers can connect to the query scheduler as required by Loki's scaling documentation.
- Zone-aware replication example placed `zone_awareness_enabled` under `common.ring`. Moved it to `distributor.ring.zone_awareness_enabled`, matching the current Loki configuration and zone-aware ingester guidance.
- The ingester memory pressure PromQL divided a gauge by a cumulative counter. Replaced it with a container memory working-set to memory-limit ratio.

## Review Notes
The sizing numbers and capacity formulas remain high-level planning guidance, not vendor-guaranteed capacity. They should be load-tested against the actual log shape, label cardinality, query mix, retention period, and object storage performance of each deployment.
