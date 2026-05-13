# Validation Summary: How to Monitor for IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Calico (calicoctl, calico-kube-controllers, IPAM)
- Kubernetes (CronJob, kubectl, ServiceAccount)
- Prometheus / prometheus-operator (PrometheusRule)
- kube-state-metrics
- Mermaid (for the diagram)

## Sources Consulted
- Calico calicoctl ipam check documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calico/ctl container image: https://hub.docker.com/r/calico/ctl
- calicoctl ipam check source: https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/datastore/ipam/check.go
- kube-state-metrics deployment metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- prometheus-operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Kubernetes CronJob v1 reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
No technical issues found.

Verifications performed:
- `calicoctl ipam check` is a documented subcommand (introduced ~v3.16, present in v3.27.0).
- The `calico/ctl:v3.27.0` image is published on Docker Hub.
- `kubectl get pods --all-namespaces -o wide` column 7 corresponds to the IP field (column order: NAMESPACE, NAME, READY, STATUS, RESTARTS, AGE, IP, NODE, ...), so `awk '{print $7}'` correctly targets pod IPs.
- The grep filter `"IP\|<none>"` correctly strips the header row and pods without assigned IPs.
- `kube_deployment_status_replicas_available` is a valid kube-state-metrics metric and accepts `namespace` and `deployment` labels.
- `monitoring.coreos.com/v1` is the correct apiVersion for PrometheusRule.
- Mermaid `flowchart LR` syntax including the `C & F & H --> I` combined-edge form is valid.
- CronJob `apiVersion: batch/v1` is the stable, supported version (graduated in Kubernetes 1.21).

## Review Notes
- Pods running with `hostNetwork: true` will share their node's IP, which would produce duplicate-IP false positives in the simple `awk | sort | uniq -d` check. This is a minor caveat worth noting in future revisions but does not make the example technically incorrect.
- The grep-based detection (`error|conflict|inconsist`) is a defensive approach since `calicoctl ipam check` historically printed inconsistencies without always returning a non-zero exit code. This still works in v3.27.0; if exit codes become reliable in later versions, simply checking `$?` would be cleaner.
- The `calico-node` ServiceAccount is used here for the CronJob. The `calico-kube-controllers` SA is a slightly more natural fit for cluster-wide IPAM operations, but `calico-node` has sufficient datastore access for `ipam check` in standard installs.
