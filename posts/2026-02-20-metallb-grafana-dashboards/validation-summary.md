# Validation Summary: How to Set Up Grafana Dashboards for MetalLB Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor
- Grafana dashboards and panels

## Sources Consulted
- MetalLB Prometheus Metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB Installation documentation: https://metallb.io/installation/index.html
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB v0.16.0 Prometheus manifests: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-native-prometheus.yaml and https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/manifests/metallb-frr-k8s-prometheus.yaml
- MetalLB speaker metric source for `metallb_speaker_announced`: https://raw.githubusercontent.com/metallb/metallb/main/speaker/main.go
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Grafana Gauge documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/gauge/
- Grafana Value mappings documentation: https://grafana.com/docs/grafana/latest/panels/value-mappings/

## Issues Found
- The ServiceMonitor example used `app: metallb` and port `monitoring`, which does not match the current MetalLB Prometheus monitor services. Updated it to select the `controller-monitor-service` and `speaker-monitor-service` labels and scrape the `metricshttps` port over HTTPS with bearer token and TLS settings matching the official MetalLB manifests.
- The metrics verification command only searched for `metallb` metrics. Updated it to also match `frrk8s`, because current default FRR-K8s deployments expose BGP and BFD metrics with the `frrk8s_` prefix.
- The BGP section described `rate(metallb_bgp_opens_sent[5m])` as "session uptime - time since last session reset." That metric is an open-message counter, not uptime. Updated the explanation and example to use it as a flapping/reset signal.
- Several BGP examples used FRR-specific metrics with the older `metallb_` prefix. Updated the examples to show `frrk8s_` equivalents for default FRR-K8s mode while retaining native `metallb_` session/update examples where applicable.
- The BFD section used non-existent echo packet metric names, `metallb_bfd_echo_packets_sent` and `metallb_bfd_echo_packets_received`. Updated them to the documented FRR-K8s metrics `frrk8s_bfd_echo_packet_output` and `frrk8s_bfd_echo_packet_input`.

## Review Notes
The Grafana JSON snippets are illustrative panel fragments rather than complete dashboard JSON exports. They are consistent with Grafana panel concepts, but a production dashboard export would normally include additional dashboard-level and datasource fields.
