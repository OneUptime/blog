# Validation Summary: How to Monitor BGP to Workload Connectivity in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- Prometheus and Prometheus Operator
- Prometheus blackbox exporter
- Prometheus Pushgateway
- curl
- Linux routing

## Sources Consulted
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Enterprise BGP metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- CalicoNodeStatus resource documentation: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Prometheus Operator API reference for Probe and PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus blackbox exporter documentation: https://github.com/prometheus/blackbox_exporter
- Prometheus multi-target exporter pattern guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus PromQL function documentation for delta(): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Pushgateway documentation: https://github.com/prometheus/pushgateway
- Prometheus guidance on Pushgateway usage: https://prometheus.io/docs/practices/pushing/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- curl command line documentation for --write-out and time_connect: https://curl.se/docs/manpage.html

## Issues Found
- The post described BGP route monitoring as using Felix metrics and used `felix_bgp_num_established_v4`. Current Calico Felix metrics documentation does not list that metric, and the expression was for established sessions rather than route count. I changed the wording to Calico Enterprise BGP metrics, noted that equivalent exported BGP route metrics are needed for other deployments, and replaced the expression with `delta(bgp_routes_imported{ip_version="IPv4"}[5m]) < -1`, which matches Tigera's documented BGP route metric and Prometheus' gauge-oriented `delta()` function.
- The latency example piped raw Prometheus text format to `nc` on the Pushgateway port. Pushgateway expects an HTTP `POST` or `PUT` to a `/metrics/job/...` path. I changed the snippet to send the generated metric with `curl --data-binary @-` to the Pushgateway HTTP API.
- The route table command did not specify the container when running `kubectl exec` against a calico-node pod. I added `-c calico-node` to match Kubernetes' documented container selection flag and avoid ambiguity in multi-container pods.
- The architecture diagram and conclusion referred to Felix metrics for BGP control-plane health. I updated those references to Calico Enterprise BGP metrics, or equivalent exported BGP route metrics, so they match the corrected metric source.

## Review Notes
The Pushgateway example is now syntactically aligned with the Pushgateway API, but Prometheus generally recommends scraping or node-exporter textfile collection for continuously running instance-level metrics. The Probe CRD example is structurally valid for Prometheus Operator, assuming the Prometheus instance is configured to select Probe resources in the `monitoring` namespace and the blackbox exporter has an `http_2xx` module configured.
