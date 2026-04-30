# Validation Summary: How to Monitor Harvester Cluster Health - Monitor

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Kubernetes
- KubeVirt
- Longhorn
- Prometheus
- Grafana
- Alertmanager
- Bash
- `kubectl`
- `jq`

## Sources Consulted
- Harvester Monitoring docs: https://docs.harvesterhci.io/v1.6/monitoring/harvester-monitoring/
- Harvester Host Management docs: https://docs.harvesterhci.io/v1.7/host
- Harvester VM troubleshooting docs: https://docs.harvesterhci.io/v1.7/troubleshooting/vm/
- RKE2 Cluster Access docs: https://docs.rke2.io/cluster_access
- RKE2 CLI Tools docs: https://docs.rke2.io/reference/cli_tools
- RKE2 Logging docs: https://docs.rke2.io/reference/logging
- RKE2 Managing Server Roles docs: https://docs.rke2.io/install/server_roles
- Kubernetes API health endpoint docs: https://kubernetes.io/docs/reference/using-api/health-checks/
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Longhorn alert rule examples: https://longhorn.io/docs/latest/monitoring/alert-rules-example/
- Longhorn default disk configuration docs: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/default-disk-and-node-config/
- KubeVirt monitoring metrics reference: https://kubevirt.io/monitoring/metrics.html
- KubeVirt architecture and VM status docs: https://kubevirt.io/user-guide/architecture/
- Longhorn manager source for `longhorn_volume_robustness`: https://github.com/longhorn/longhorn-manager/blob/master/metrics_collector/volume_collector.go
- KubeVirt source for `kubevirt_vmi_info` labels: https://github.com/kubevirt/kubevirt/blob/main/pkg/monitoring/metrics/virt-controller/vmistats_collector.go

## Issues Found
- The post described Harvester dashboard health views too specifically and without noting the `rancher-monitoring` add-on dependency. I changed the wording to match the documented dashboard metrics, per-VM metrics, host status, storage health, and alerting views.
- The CLI and script used `kubectl get vmi` to count VM states. In Harvester, stopped VMs can have no `VirtualMachineInstance` object at all, so this misses stopped VMs. I changed the state/count checks to use `kubectl get vm` and `status.printableStatus`, while keeping `vmi` only for running-instance placement.
- The control-plane health example used a brittle `etcdctl` exec pattern and the script incorrectly compared running etcd pods to the total node count. I replaced that with Kubernetes API `readyz` checks plus etcd pod status checks, and updated the script logic to compare running etcd pods to total etcd pods.
- The Longhorn node storage example hardcoded `default-disk-1`, which is not safe because disk names are configurable. I replaced it with a `jq` query that iterates all entries in `status.diskStatus`.
- The cron example scheduled `/opt/scripts/harvester-health-check.sh` without ever placing the script there. I added an install step and updated the run example to use the installed path consistently.
- The PromQL examples had incorrect metric assumptions. I changed the Longhorn robustness alert to the label-based `state` form confirmed by Longhorn source, updated the KubeVirt VMI phase matcher to the lowercase direct-metric labels, and made the node CPU query label-agnostic instead of assuming a nonstandard `node` label.

## Review Notes
- Harvester v1.6 documentation is slightly inconsistent: it says the monitoring add-on is disabled by default in new installations, but another line on the same page says monitoring is automatically enabled during installation. The post now uses the safer wording: monitoring integrations are available when the `rancher-monitoring` add-on is enabled.
- Longhorn’s public docs are also inconsistent about `longhorn_volume_robustness`: the metrics reference describes label-based state series, while the alert-rule example still uses older numeric comparisons. The source code confirms the label-based `state` metric with `1` for the active state and `0` for the others.
