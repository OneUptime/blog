# Validation Summary: How to Upgrade K3s Safely

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- K3s
- Kubernetes
- kubectl
- System Upgrade Controller
- K3s embedded etcd snapshots and restore
- Bash upgrade and rollback scripts
- OneUptime monitoring checks

## Sources Consulted
- K3s Automated Upgrades documentation: https://docs.k3s.io/upgrades/automated
- K3s Manual Upgrades documentation: https://docs.k3s.io/upgrades/manual
- K3s Rolling Back K3s documentation: https://docs.k3s.io/upgrades/roll-back
- K3s etcd snapshot CLI documentation: https://docs.k3s.io/cli/etcd-snapshot
- K3s Configuration Options documentation: https://docs.k3s.io/installation/configuration
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- System Upgrade Controller Plan type definitions: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/apis/upgrade.cattle.io/v1/types.go

## Issues Found
- The System Upgrade Controller installation YAML did not install the `Plan` CRD and pinned controller-related details manually. Replaced it with the official upstream `kubectl apply` command that installs the CRD and controller manifests together.
- Manual K3s upgrade commands re-ran the installer with only `server` or `agent`, which can drop original `INSTALL_K3S_EXEC`, `K3S_*` variables, and trailing service arguments. Updated the scripts and HA guidance to preserve original install arguments and call out original environment variables.
- The rollback section described SUC rollback plans, but the official K3s automated upgrade documentation states that `rancher/k3s-upgrade` refuses downgrades and failed downgrade plans can leave nodes cordoned. Replaced that section with the correct limitation.
- The binary rollback section implied a no-data-loss rollback for all versions. Updated it to distinguish same-minor binary rollback from previous-minor rollback, which requires a pre-upgrade datastore snapshot.
- The etcd restore script treated `k3s server --cluster-reset --cluster-reset-restore-path` as if it left K3s running. Updated the flow to start `k3s` normally after the restore command exits.
- The monitoring ConfigMap used deprecated `/healthz` and called the check latency even though it only checked health. Updated it to use `/readyz` and renamed the variable to API health.
- The best-practices version-skew wording said not to skip more than one minor version. Updated it to match K3s and Kubernetes guidance: do not skip intermediate minor versions.
- The troubleshooting section labeled `k3s etcd-snapshot list` as checking the etcd member list. Corrected the wording to say it checks available etcd snapshots.

## Review Notes
The remaining examples are intentionally generic and assume the operator has sufficient cluster capacity for drains, appropriate PodDisruptionBudgets, SSH or node access where scripts say to run remote commands, and node names that match Kubernetes node objects. Those are operational prerequisites rather than syntax errors.
