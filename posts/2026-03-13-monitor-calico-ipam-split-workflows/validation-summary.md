# Validation Summary: Monitoring Calico IPAM Split Workflows

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Open Source IPAM
- calicoctl
- Kubernetes CronJob and RBAC
- Prometheus and PrometheusRule
- Calico Felix and calico-kube-controllers metrics

## Sources Consulted
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico kube-controllers Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics monitoring documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- `calicoctl ipam show --show-all-ips` is not a valid `ipam show` flag. Changed the example to `calicoctl ipam check --show-all-ips`, which is the documented command for printing all IPs checked during consistency validation.
- The sample shell script defined warning and critical thresholds but did not use them. Updated the script comment and removed the unused variables so the example accurately describes what it does.
- The post incorrectly described Felix on port 9091 as the source of IPAM metrics. Updated the Prometheus section to use calico-kube-controllers on port 9094, where Calico documents IPAM metrics such as `ipam_allocations_in_use`, `ipam_allocations_gc_candidates`, `ipam_blocks`, and `ipam_ippool_size`.
- The metrics inspection command grepped Felix metrics for IPAM data. Updated it to port-forward calico-kube-controllers and inspect `^ipam_` metrics on port 9094.
- The Prometheus alert used `felix_int_dataplane_failures_total`, but Calico documents the metric as `felix_int_dataplane_failures`; more importantly, that alert was not a pool exhaustion alert. Replaced it with an IP pool utilization alert based on `ipam_allocations_in_use / ipam_ippool_size`, and added an IPAM GC-candidate alert for possible leaked allocations.
- The CronJob manifest referenced a `calico-ipam-monitor` service account without defining it. Added a ServiceAccount, ClusterRole, and ClusterRoleBinding so the manifest is self-contained for read-only IPAM inspection.
- The `CalicoNodeNotReady` alert description said IPAM allocations and policy enforcement are stopped. Updated it to a narrower statement that networking and policy enforcement on that node may be impacted.

## Review Notes
The examples assume the Calico components run in `kube-system`, matching the original post. Operator-based Calico installs commonly use `calico-system`, so readers may need to adjust namespaces for their deployment.
