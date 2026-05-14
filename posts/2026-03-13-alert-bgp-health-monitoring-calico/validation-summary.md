# Validation Summary: Calico Observability: alert-bgp-health-monitoring-calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- Prometheus and PrometheusRule
- Grafana
- Calico Cloud/Enterprise flow logs
- BGP monitoring
- Calico IPAM metrics

## Sources Consulted
- Calico Open Source FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Cloud FelixConfiguration reference for flow logs: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Enterprise policy metrics reference: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Calico Enterprise BGP metrics reference: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus

## Issues Found
- The introduction implied flow logs are a general Calico capability. I clarified that the flow-log configuration shown applies to Calico Cloud and Calico Enterprise, while Felix metrics on port 9091 are available in open-source Calico.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, but official Calico documentation defines that metric as the number of dataplane update failures that will be retried, not policy denies. I renamed the alert to `CalicoDataplaneFailures` and corrected the summary.
- The conclusion described Felix dataplane failures as specifically indicating iptables programming errors. I broadened this to dataplane programming errors because the metric is documented as dataplane update failures and can apply beyond iptables-specific causes.
- The conclusion mentioned policy deny rate and IPAM utilization without identifying their metric sources. I clarified that policy deny-rate metrics are Calico Enterprise policy metrics and IPAM utilization comes from kube-controllers metrics.

## Review Notes
The `calicoctl node status` command is correct for checking local BGP peering state, but official documentation notes it should be run on the node whose status is being inspected. Calico Enterprise also exposes BGP Prometheus metrics such as `bgp_peers`, `bgp_routes_imported`, and `bgp_route_updates_received`, which could be added in a future post if the article is intended to focus specifically on BGP alerting.
