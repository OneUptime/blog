# Validation Summary: How to Set Up the Prometheus Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (ceph-mgr, Prometheus module)
- Prometheus (scrape configuration, metrics)
- Rook (Kubernetes Ceph operator)
- Kubernetes (ServiceMonitor CRD via prometheus-operator)

## Sources Consulted
- Ceph official documentation: Prometheus Module (https://docs.ceph.com/en/latest/mgr/prometheus/)
- Ceph official documentation: Manager Module Commands (https://docs.ceph.com/en/latest/mgr/administrator/)
- Prometheus configuration documentation (https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- Rook documentation: Prometheus Monitoring (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/)
- Kubernetes prometheus-operator: ServiceMonitor CRD (https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)

## Issues Found
1. **Inaccurate description of `rbd_stats_pools` setting**: The post stated that `ceph config set mgr mgr/prometheus/rbd_stats_pools "*"` enables "per-pool and per-OSD detail metrics." This is incorrect. The `rbd_stats_pools` configuration option specifically enables collection of RBD image performance counter metrics for the specified pools. It does not control per-OSD metrics, which are always exposed by the Prometheus module regardless of this setting. Changed to "per-pool RBD image performance metrics."

## Review Notes
- The ServiceMonitor `interval: 5s` is technically valid but very aggressive for Ceph metrics scraping. A 15s-30s interval is more typical in production environments to avoid unnecessary load on the manager daemon. This is a tuning preference rather than a technical error.
- All CLI commands, configuration keys, metric names, and YAML structures are accurate for current Ceph releases (Reef/Squid).
