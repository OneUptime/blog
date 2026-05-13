# Validation Summary: How to Monitor BGP Peering in Calico

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Enterprise
- Kubernetes
- BGP
- BIRD
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana

## Sources Consulted
- Calico Enterprise BGP metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- Calico Open Source Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source CalicoNodeStatus documentation: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico Open Source BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed Calico Open Source Felix exposes BGP session metrics named `felix_bgp_num_established_v4`, `felix_bgp_num_established_v6`, and `felix_bgp_num_not_established`. These are not listed in the Felix Prometheus metric reference. Calico Enterprise documents BGP metrics as `bgp_peers`, `bgp_routes_imported`, and `bgp_route_updates_received`, so the post was corrected to target Calico Enterprise BGP metrics.
- The post instructed readers to enable Felix metrics on port 9091 to monitor BGP peering. Felix metrics are valid for Felix dataplane metrics, but the documented Calico Enterprise BGP metrics endpoint is exposed on port 9900 and secured with mTLS. The setup and verification commands were updated accordingly.
- The ServiceMonitor example selected a service port named `calico-metrics-port`, but the post did not create a Kubernetes Service with that named port. It also would not scrape the documented Calico Enterprise BGP metrics endpoint. The section was changed to a standalone Prometheus scrape job using Kubernetes node discovery, HTTPS, mTLS, and port 9900.
- The alerting rules used non-existent Felix BGP metric names. They were updated to use the documented `bgp_peers` metric and its `status` and `ip_version` labels.
- The metric table listed `felix_route_table_list_seconds_*` as route update latency for BGP peering. That metric is a Felix dataplane metric, not a Calico Enterprise BGP metric. The table was updated with documented BGP route metrics.

## Review Notes
Calico Open Source can report BGP status through `calicoctl node status` and the `CalicoNodeStatus` resource, but the documented Prometheus BGP metrics used in this post are Calico Enterprise-specific.
