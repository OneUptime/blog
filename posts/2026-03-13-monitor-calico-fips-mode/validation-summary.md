# Validation Summary: How to Monitor Calico FIPS Mode

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico FIPS mode
- Kubernetes and Tigera Operator Installation resources
- Prometheus, PrometheusRule, PromQL, and Pushgateway
- Alertmanager API
- Grafana dashboards
- Linux kernel FIPS status
- Bash scripting

## Sources Consulted
- Calico FIPS mode documentation: https://docs.tigera.io/calico/latest/operations/fips
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Linux kernel `/proc/sys/crypto/fips_enabled` documentation: https://kernel.org/doc/html/latest/admin-guide/sysctl/crypto.html
- kube-state-metrics documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The certificate expiry alert inferred expiry by adding 365 days to `kube_secret_created`. That metric is a Secret creation timestamp, not a certificate `NotAfter` timestamp, and certificate lifetimes are not guaranteed to be 365 days. I changed the rule to use an explicit `calico_cert_expiry_timestamp` metric exported by a certificate checker or certificate exporter.
- The drift script posted alerts to Alertmanager `/api/v1/alerts`. Alertmanager API v1 was deprecated in 0.16.0 and removed in 0.27.0. I updated the example to post to `/api/v2/alerts`.
- The drift script queried `kubectl get installation default`. I changed this to the documented Calico resource name, `installation.operator.tigera.io default`, to avoid ambiguity.
- The OS FIPS check was implemented as a CronJob, which would run a scheduled pod but would not guarantee one check per node. I changed it to a DaemonSet so the check runs on each node and exports the `calico_fips_node_enabled` metric used by the dashboard.
- The OS FIPS check mounted host `/proc` over container `/proc`. I changed the mount to `/host/proc` and updated the script to read `/host/proc/sys/crypto/fips_enabled`.
- The Grafana dashboard referenced `calico_installation_fips_mode_enabled`, but the drift checker did not export it. I updated the script to publish that metric to Pushgateway.
- The dashboard diagram still referred to a CronJob after the OS monitor was corrected. I updated it to show a DaemonSet.

## Review Notes
Calico's current FIPS documentation marks FIPS mode as deprecated and says it will be removed in a future release. The post remains technically relevant, but future revisions should mention the deprecation prominently and pin guidance to the Calico version being monitored. Prometheus also recommends using Prometheus alerting rules where possible instead of sending alerts directly to Alertmanager's API; the direct API example is now current, but a production implementation should prefer metric-based alerting when feasible.
