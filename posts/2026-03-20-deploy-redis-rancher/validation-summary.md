# Validation Summary: How to Deploy Redis on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Rancher-managed Kubernetes
- Helm
- Bitnami Redis Helm chart
- Prometheus / `redis_exporter`
- Longhorn storage

## Sources Consulted
- Bitnami Redis Helm chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/values.yaml
- Bitnami Redis Helm chart Sentinel StatefulSet template: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/templates/sentinel/statefulset.yaml
- Bitnami Redis Helm chart install notes: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/templates/NOTES.txt
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- `redis_exporter` repository: https://github.com/oliver006/redis_exporter

## Issues Found
- The post treated Sentinel mode like the older master/replica StatefulSet layout and used `redis-master-0` in the connection example. The current Bitnami chart renders `redis-node-*` pods in Sentinel mode and sizes that StatefulSet from `replica.replicaCount`, so I changed the example to `replica.replicaCount: 3` and updated the connection flow to discover the active master through Sentinel before connecting.
- The Sentinel validation command omitted authentication. The current chart defaults `auth.sentinel` to `true`, so I updated the command to authenticate before running `SENTINEL masters`.
- The Sentinel status example implied the master would be returned as a raw IP. The current chart defaults `useHostnames: true`, so I changed the expectation to allow either a hostname or an IP.
- The application connection example mixed a direct Redis service endpoint on port `6379` with Sentinel-based failover guidance. The current chart notes that the shared service on `6379` is for read-only access in Sentinel mode, while clients should use Sentinel on `26379` to discover the write target. I removed the direct `host` / `port` secret entries and changed the deployment example to pass Sentinel endpoints, the master set name, and the password to a Sentinel-aware client.
- The persistence guidance suggested enabling AOF with `master.extraFlags`. In the current Bitnami chart, AOF is already enabled by default in `commonConfiguration`, and Sentinel-mode Redis data persistence is configured from the `replica` section. I updated the cache-only example to disable `replica.persistence` and corrected the durable-workload example to preserve the default AOF configuration.
- The metrics example enabled `metrics.serviceMonitor.enabled` without mentioning that this depends on Prometheus Operator CRDs. I added that prerequisite inline.

## Review Notes
- The post does not pin a Bitnami chart version. Since pod names, service behavior, and defaults have changed across chart revisions, pinning a tested chart version would make the guide more stable over time.
- `storageClass: longhorn` is still a valid example for Rancher environments that use Longhorn, but clusters using another StorageClass will need to replace it.
- `metrics.serviceMonitor.namespace: monitoring` assumes that namespace exists and that the Prometheus deployment watches ServiceMonitors there.
