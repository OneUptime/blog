# Validation Summary: How to Validate etcd Health Before and After Recovery in Talos

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes
- kubectl
- Bash
- Prometheus metrics

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux etcd maintenance guide: https://www.talos.dev/v1.12/advanced/etcd-maintenance/
- Talos Linux troubleshooting guide: https://www.talos.dev/v1.11/introduction/troubleshooting/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- etcd metrics documentation: https://etcd.io/docs/v3.4/metrics/etcd-metrics-v3.4.4/
- etcd FAQ on slow apply and heartbeat warnings: https://etcd.io/docs/v3.2/faq/

## Issues Found
- The post described the `talosctl etcd status` leader field as "Leader status". Current Talos output reports the leader member ID in the `LEADER` column, so this was changed to "Leader member ID".
- The validation script counted members by grepping for `10.`, which depends on the cluster IP range and can miscount. This was changed to count non-header rows in `talosctl etcd members` output.
- The validation script checked for a leader by grepping for `true`, but Talos `etcd status` reports the leader as a member ID, while boolean fields such as `LEARNER` are unrelated. This was changed to check that exactly one status row has a member ID matching the leader ID.
- The validation script used `talosctl services`, but current Talos documentation uses the singular `talosctl service` command for service state checks. The command and parser were updated.
- The script used `((ERRORS++))` under `set -e`, which can terminate the script when incrementing from zero. The increments were changed to `ERRORS=$((ERRORS + 1))`.
- The write test used a fixed namespace name, which could fail if the namespace already existed. It now uses a timestamped namespace name.

## Review Notes
The remaining commands and guidance are consistent with current Talos, Kubernetes, and etcd documentation. The cross-member API server check may depend on how the Kubernetes API server certificate SANs and kubeconfig are configured in a specific Talos cluster.
