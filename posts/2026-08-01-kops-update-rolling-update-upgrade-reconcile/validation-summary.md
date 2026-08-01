# Validation Summary: `kops update`, `rolling-update`, `upgrade`, or `reconcile`: Which to Run?

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered

- kOps cluster updates, rolling updates, Kubernetes upgrades, and reconciliation
- Kubernetes control-plane, API-server, and worker-node version skew
- Kubernetes node draining, eviction, and PodDisruptionBudgets
- Cloud instance groups, launch templates, and rolling-update strategies
- Terraform-managed kOps infrastructure

## Sources Consulted

- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops upgrade cluster`](https://kops.sigs.k8s.io/cli/kops_upgrade_cluster/)
- [kOps CLI: `kops reconcile cluster`](https://kops.sigs.k8s.io/cli/kops_reconcile_cluster/)
- [kOps: Updates and Upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Upgrading Kubernetes](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps 1.31 release notes](https://kops.sigs.k8s.io/releases/1.31-notes/)
- [kOps: Releases and Versioning](https://kops.sigs.k8s.io/welcome/releases/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)

## Issues Found
No technical issues found.

## Review Notes

- The shell snippets are syntactically valid, and the documented `--state`, `--yes`, `--kubernetes-version`, `--force`, `--cloudonly`, and Terraform target options match the current command references.
- The post correctly distinguishes writing the desired Kubernetes version from applying cloud-resource changes and replacing running instances.
- The Kubernetes 1.31+ reconciliation sequence and the separate targeted Terraform apply/rolling-update procedure match the official upgrade guide and Kubernetes version-skew requirements.
- kOps and Kubernetes compatibility is version-specific; the post appropriately tells operators to check the installed binary, target release documentation, and supported next-minor version before a maintenance window.
