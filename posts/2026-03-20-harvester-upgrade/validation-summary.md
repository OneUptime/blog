# Validation Summary: How to Upgrade Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Kubernetes
- `kubectl`
- RKE2
- Longhorn
- KubeVirt
- Rancher
- Linux systemd

## Sources Consulted
- Harvester upgrade guide: https://docs.harvesterhci.io/v1.6/upgrade/index/
- Harvester upgrade guide: https://docs.harvesterhci.io/v1.7/upgrade/index/
- Harvester upgrade troubleshooting: https://docs.harvesterhci.io/v1.5/upgrade/troubleshooting/
- Harvester live migration: https://docs.harvesterhci.io/v1.7/vm/live-migration/
- Harvester VM backup and restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester advanced settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Upgrade API: https://docs.harvesterhci.io/v1.5/api/create-namespaced-upgrade/
- Harvester VirtualMachineBackup API: https://docs.harvesterhci.io/v1.5/api/create-namespaced-virtual-machine-backup/
- Longhorn metrics and robustness states: https://longhorn.io/docs/latest/monitoring/metrics/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post implied that VMs generally keep running through the entire upgrade. I changed the introduction, flow diagram, node-phase explanation, and conclusion to distinguish live-migratable VMs from non-migratable VMs, which may require shutdown depending on Harvester `upgrade-config`.
- The post used `kubectl get setting server-version -n harvester-system`, which does not match Harvester’s documented `settings.harvesterhci.io` resource usage. I corrected both version-check commands to `kubectl get settings.harvesterhci.io server-version -o jsonpath='{.value}'`.
- The pre-upgrade checklist omitted two documented prerequisites: at least 30 GiB free in `/usr/local` on each node and running the version-matched Harvester pre-check script. I added both.
- The degraded-volume check used `grep -v healthy`, which can produce false positives. I replaced it with a JSONPath filter that only prints Longhorn volumes whose robustness is not `healthy`.
- The backup section omitted an important Harvester limitation: VM backups require a configured backup target and do not support volumes in external storage. I added that constraint and also replaced the brittle VM name extraction pipeline with a JSONPath query.
- The UI and CR examples did not line up with how `UpgradeLog` is created. I added the optional logging step in the UI flow and set `logEnabled: true` in the `Upgrade` example so the later logging commands are technically consistent.
- The monitoring and rollback examples used undocumented label selectors like `app=upgrade-log` and `app=upgrade`. I replaced them with Harvester’s documented `UpgradeLog`-based selectors and added `--tail=-1` so `kubectl logs -l ...` returns the full log set instead of the default short tail.
- The troubleshooting section suggested `journalctl --unit=upgrade` and forcibly `uncordon`ing a node during an upgrade. I replaced that guidance with Harvester’s documented manifest/node job inspection, RKE2 service logs, and the warning not to restart a failed node-upgrade phase without SUSE support guidance.
- The process diagram had node upgrades occurring before system component upgrades. I corrected the order to match Harvester’s documented phase sequence.

## Review Notes
- The sample `Upgrade` manifest now uses `v1.6.0` as an illustrative target, but the target version must still be chosen from a supported upgrade path for the cluster’s currently installed version.
- Harvester v1.8 introduces an experimental Upgrade Manager add-on, but this post correctly stays focused on the built-in UI and `Upgrade` custom resource workflow.
- Commands were validated against official documentation and API references; they were not executed against a live Harvester cluster during this review.
