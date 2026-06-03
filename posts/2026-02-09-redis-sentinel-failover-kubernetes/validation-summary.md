# Validation Summary: How to Configure Automatic Failover for Redis Sentinel on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis 7.2
- Redis Sentinel
- Kubernetes StatefulSet, Service, NetworkPolicy, and CronJob resources
- Prometheus Operator ServiceMonitor
- oliver006/redis_exporter
- redis-py Sentinel client
- go-redis Sentinel client

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- Redis LASTSAVE command documentation: https://redis.io/docs/latest/commands/lastsave/
- redis-py connection and Sentinel documentation: https://redis.readthedocs.io/en/stable/connections.html
- go-redis official Redis documentation: https://redis.io/docs/latest/integrate/go-redis/
- go-redis v9 package/source documentation: https://pkg.go.dev/github.com/redis/go-redis/v9
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes NetworkPolicy API documentation: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- redis_exporter documentation and source: https://github.com/oliver006/redis_exporter

## Issues Found
- Corrected the Sentinel architecture explanation. Redis Sentinel does not use the Raft consensus algorithm; it uses Sentinel-specific quorum checks, epochs, leader election, and majority authorization.
- Corrected quorum guidance. Sentinel quorum is the number of Sentinels required to agree that a master is unreachable, while actual failover authorization requires a majority of known Sentinels.
- Reduced overclaims that the sample is production-ready, prevents split-brain outright, or guarantees failover in under 10 seconds.
- Updated the Go example from the legacy `github.com/go-redis/redis/v8` import path to the current `github.com/redis/go-redis/v9` path.
- Fixed the Prometheus exporter Service and ServiceMonitor mismatch by naming the `metrics` port and setting `targetPort`.
- Changed the exporter target to the Sentinel port for Sentinel metrics and corrected example metric names to metrics exposed by redis_exporter.
- Corrected the NetworkPolicy example so Sentinels can communicate with each other, clients can reach Sentinel, and Sentinel pods can resolve DNS names.
- Corrected the backup CronJob wait loop so it compares `LASTSAVE` against the pre-`BGSAVE` timestamp instead of the current Unix time.
- Clarified that Sentinel reconfigures the old master after it is reachable again, rather than implying that a static Kubernetes pod restart alone handles the role transition.

## Review Notes
The article is technically relevant and now accurate as a tutorial-level Sentinel deployment. A future production version should add authentication/TLS, anti-affinity or topology spread constraints, PodDisruptionBudgets, dynamic Redis startup configuration that consults Sentinel after restarts, and a backup implementation that copies data from a mounted persistent volume or object-storage-aware sidecar.
