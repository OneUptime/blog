# Validation Summary: How to Use Cluster Capacity Planning Tools

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Metrics Server
- cluster-capacity
- Prometheus and PromQL
- Grafana
- Kubernetes CronJob
- KRR
- Goldilocks
- kube-capacity
- Prometheus Operator PrometheusRule

## Sources Consulted
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kubernetes-sigs cluster-capacity repository: https://github.com/kubernetes-sigs/cluster-capacity
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Robusta KRR repository and usage documentation: https://github.com/robusta-dev/krr
- Goldilocks documentation: https://goldilocks.docs.fairwinds.com/
- kube-capacity repository and usage documentation: https://github.com/robscott/kube-capacity

## Issues Found
- The `kubectl top` section described the data as current real-time capacity. Updated it to say `kubectl top` shows recent resource usage and requires Metrics Server, matching the Kubernetes reference.
- The `kubectl describe nodes` example claimed to calculate cluster-wide utilization, but it only exposes per-node allocated requests and limits and can involve Kubernetes quantity units. Reworded the section and simplified the command to inspect allocated resources.
- The Prometheus capacity rules used `kube_node_status_capacity` for scheduling-oriented capacity. Changed them to `kube_node_status_allocatable`, which better reflects schedulable node resources.
- The PromQL examples used `rate()` on gauge-style request/utilization series. Replaced those with `delta()` for seven-day request growth and `deriv()` for utilization trend calculations, because Prometheus documents `rate()` for counters.
- The "days until capacity exhaustion" formulas divided by `86400` twice. Removed the extra division and kept the trend as percentage points per day.
- The CronJob used unencoded Prometheus API query URLs and `rate()` on gauges. Changed the `curl` calls to `curl -G --data-urlencode` and switched the growth queries to `deriv(...) * 86400`.
- The KRR install and export examples did not match current KRR documentation. Replaced `pip install krr` with the documented Homebrew install path, changed context selection to `-c`, and changed JSON export to `-f json --fileoutput`.
- The KRR example claimed to apply recommendations automatically with a normal `krr simple` command. Replaced it with an explicit Prometheus URL example because automatic application is handled separately by KRR Enforcer.
- The KRR explanation said it calculates P95 usage generically. Updated it to distinguish P95 CPU recommendations from memory recommendations based on maximum usage plus a buffer.
- The kube-capacity pod-level command used `--pod-count --util`, which reports pod counts rather than pod rows. Changed it to `--pods --util`.
- Removed the claim that cluster-capacity accounts for resource quotas, since resource quotas are admission control behavior and the cited project documentation does not support that as a current scheduler simulation feature.

## Review Notes
- The Prometheus examples assume kube-state-metrics/cAdvisor style metric names from a common kube-prometheus-style setup. Metric labels can vary by distribution, so production dashboards should verify the exact labels available in the target Prometheus.
- The cluster-capacity project is useful for examples, but it is an older simulation tool. Teams on newer Kubernetes releases should confirm it matches their scheduler version and enabled scheduler plugins before relying on exact results.
