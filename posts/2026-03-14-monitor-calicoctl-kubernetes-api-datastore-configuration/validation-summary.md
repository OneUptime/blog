# Validation Summary: Monitoring Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes API datastore
- Kubernetes CronJob
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL
- Grafana

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Configuring Typha - https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico documentation: Typha overview - https://docs.tigera.io/calico/latest/reference/typha/overview
- Prometheus Operator documentation: Getting Started with ServiceMonitor - https://prometheus-operator.dev/docs/developer/getting-started/
- Kubernetes documentation: CronJob - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The prerequisite "calicoctl v3.27 or later" was too broad. Calico documents that calicoctl should match the Calico version running in the cluster, and calicoctl can fail on version mismatch. Updated the prerequisite accordingly.
- The health check script used `set -euo pipefail` with unguarded command substitutions. If `calicoctl` or JSON parsing failed, the script could exit before printing the intended health message. Wrapped those commands in conditional checks.
- The health check script allowed a later warning to overwrite an earlier critical result. Added `set_status()` and changed exit codes so warning is `1` and critical is `2`.
- The `calicoctl node status` check was described as a Felix status check. Calico documents this as a local Calico node command that includes node process and BGP status and must run on a Calico node host. Updated the wording.
- The ServiceMonitor example selected labels that normally identify Calico pods, but Prometheus Operator ServiceMonitor selectors match Services. Added explicit headless Services with stable labels and named `metrics` ports, then updated ServiceMonitor selectors to match those Services.
- The high-latency alert used `histogram_quantile()` with `felix_calc_graph_update_time_seconds_bucket`, but Calico documents `felix_calc_graph_update_time_seconds` as a summary metric with `quantile` labels. Updated the PromQL expression to use `felix_calc_graph_update_time_seconds{quantile="0.99"}`.
- The Felix datastore alert did not mention the Typha caveat. Calico documents `felix_resync_state` as not meaningful in a Typha deployment, so the alert comment now states that caveat.

## Review Notes
- The post is technically relevant and contains implementation-level examples, so it was reviewed as a code/configuration tutorial.
- Felix metrics are disabled by default in Calico and Typha metrics may require operator or manifest configuration before the ServiceMonitor targets return data.
- Typha metrics port defaults vary by installation path; the post uses port `9093`, which is valid for operator-enabled/Amazon-manifest style configurations but should be adjusted if the cluster exposes Typha metrics on a different port.
- The CronJob snippet assumes the `calico-monitor` ServiceAccount and its RBAC permissions already exist. The troubleshooting section correctly calls out missing RBAC as a common failure cause.
