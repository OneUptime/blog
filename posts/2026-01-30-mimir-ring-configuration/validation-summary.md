# Validation Summary: How to Create Mimir Ring Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Mimir
- Mimir hash rings and KV stores
- Memberlist
- Consul
- Etcd
- Kubernetes StatefulSets
- Prometheus alerting rules

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir hash rings: https://grafana.com/docs/mimir/latest/configure/configure-hash-rings/
- Grafana Mimir zone-aware replication: https://grafana.com/docs/mimir/latest/configure/configure-zone-aware-replication/
- Grafana Mimir store-gateway architecture: https://grafana.com/docs/mimir/latest/references/architecture/components/store-gateway/
- Grafana Mimir ingester architecture: https://grafana.com/docs/mimir/latest/references/architecture/components/ingester/
- Grafana Mimir HTTP API: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir versioning: https://grafana.com/docs/mimir/latest/configure/about-versioning/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post said Mimir supports three ring KV backends. Updated the wording to note that hash rings also document the `multi` backend for migrations, while Memberlist, Consul, and Etcd remain the primary normal-operation backends.
- Several examples used `common.ring`, which is not a documented current Mimir configuration block. Updated those examples to use component ring blocks such as `ingester.ring`.
- Consul and Etcd examples placed `prefix` inside the backend-specific `consul` and `etcd` blocks. Moved `prefix` to the documented `kvstore.prefix` position.
- The zone-awareness example used `common.instance_availability_zone`, which is not a documented current Mimir key. Moved `instance_availability_zone` under `ingester.ring` and `store_gateway.sharding_ring`.
- Store-gateway examples used `replication_factor_for_each_tenant`, which is not a documented current key. Replaced it with `replication_factor`.
- The Kubernetes example attempted to read the node zone via a pod label that Kubernetes does not automatically set. Changed it to a zone-specific StatefulSet pattern with a pod label and matching `nodeSelector`, added the required StatefulSet `serviceName`, and updated the Mimir image tag to the current 3.1.0 line.
- The heartbeat example included undocumented current keys `join_after`, a top-level `ring.ring_check_period`, and `memberlist.indirect_checks`. Removed those fields and corrected comments for `min_ready_duration` and `final_sleep`.
- The production example used `dns+` for Kubernetes memberlist discovery. Updated it to the documented `dnssrv+` format for Kubernetes headless service discovery.
- The production limits example used outdated or invalid limit names `max_series_per_user`, `max_series_per_metric`, and `limits.replication_factor`. Replaced the series limits with `max_global_series_per_user` and `max_global_series_per_metric`, and removed the invalid replication limit.
- Clarified wording around central coordination so it does not imply Consul or Etcd deployments have no external coordination dependency.

## Review Notes
The YAML code fences were syntax-checked after edits. The examples remain illustrative; real production deployments should still validate the full generated Mimir configuration with the exact Mimir version and deployment mode in use.
