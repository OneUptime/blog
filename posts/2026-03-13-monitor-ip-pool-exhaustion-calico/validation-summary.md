# Validation Summary: How to Monitor IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico IPAM
- calicoctl
- Kubernetes CronJob
- Prometheus Pushgateway
- Prometheus alerting rules
- Prometheus Operator PrometheusRule

## Sources Consulted
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The description and root cause referred to "calicoctl metrics", but `calicoctl ipam show` is a CLI output command, not a metrics endpoint. Updated the wording to "calicoctl IPAM output".
- The exporter parsed used addresses with `grep -i "allocat"`, but documented `calicoctl ipam show` output uses the `IPS IN USE` and `IPS FREE` table columns and does not contain an "allocated" line. Replaced the parser with an `awk` table parser that sums `IP Pool` rows from the documented output.
- The original parser used `grep -P`, which is not consistently available in minimal container images. The replacement uses POSIX-style `awk` parsing.

## Review Notes
- Current Calico documentation lists kube-controllers IPAM metrics such as `ipam_allocations_in_use` and `ipam_ippool_size`; clusters that expose those metrics may be able to alert directly without a custom Pushgateway job. The post's approach remains valid for environments where those metrics are unavailable or not scraped.
- Pushgateway is appropriate for short-lived batch jobs, but users should monitor exporter freshness because pushed metrics can become stale if the CronJob stops running.
