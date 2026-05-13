# Validation Summary: How to Monitor Calico IPAM Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico IPAM
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- calicoctl

## Sources Consulted
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Prometheus Operator API reference: PrometheusRule and Rule fields - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post claimed Felix exposes IPAM-related utilization and allocation metrics on port 9091. Current Calico Felix documentation lists the Felix metrics exposed on port 9091, but does not document `calico_ipam_utilization_percent` or `felix_ipam_allocations_per_second` as built-in Felix metrics. I changed the section to describe these as custom metrics exported from `calicoctl ipam show` and `calicoctl ipam check`.
- The example scrape command looked for IPAM metrics in Felix output. I replaced it with documented `calicoctl ipam show --show-blocks` and `calicoctl ipam check --show-problem-ips` commands, which are the supported interfaces for IPAM usage and consistency data.
- The dashboard used `rate(felix_ipam_allocations_per_second[5m])`, which applied `rate()` to a metric name that was already described as a per-second rate and is not documented by Calico. I changed it to `deriv(calico_ipam_ips_in_use[5m])` over the custom in-use IP gauge.
- The architecture diagram and conclusion referred to Felix as the IPAM utilization source. I updated them to point to an IPAM exporter or CronJob based on `calicoctl` output.

## Review Notes
The PrometheusRule manifest shape is valid for the Prometheus Operator, but the metric names in the alert expressions are custom metrics. The post now makes that dependency explicit; a production implementation still needs an exporter or CronJob that emits those exact series.
