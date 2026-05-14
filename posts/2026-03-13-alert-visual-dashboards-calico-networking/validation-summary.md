# Validation Summary: Calico Observability: alert-visual-dashboards-calico-networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Cloud/Enterprise
- Kubernetes
- FelixConfiguration
- Prometheus and PrometheusRule
- Grafana
- calicoctl

## Sources Consulted
- Calico Open Source FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Cloud FelixConfiguration reference: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described flow logs as a general Calico capability without noting product scope. The flow-log FelixConfiguration fields used in the command are documented for Calico Cloud/Enterprise, so the introduction, command comment, and conclusion now make that scope explicit.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, which is a Felix dataplane update failure metric, not a policy deny-rate metric. I renamed that alert to `CalicoDataplaneFailures` and updated its summary.
- The alert configuration claimed to cover high policy deny rate but did not use the documented policy-deny metric. I added a `CalicoHighDenyRate` rule using `rate(calico_denied_packets[5m])`.
- The conclusion recommended alerts for IPAM utilization, but the alert snippet did not include an IPAM utilization alert. I added a `CalicoHighIPAMUtilization` rule based on the documented `ipam_allocations_in_use` and `ipam_ippool_size` metrics.
- The conclusion said Felix dataplane failures indicate iptables programming errors. Since Calico can use multiple dataplanes, I changed this to dataplane programming errors.

## Review Notes
The policy-deny metrics are Calico Enterprise/Cloud policy metrics and require scraping the relevant policy metrics endpoint. The Prometheus `job` label in the `up{job="calico-node-metrics"}` rule must match the local Prometheus scrape configuration.
