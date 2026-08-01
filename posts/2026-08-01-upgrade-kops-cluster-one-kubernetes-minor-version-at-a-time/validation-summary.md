# Validation Summary: How to Upgrade a kOps Cluster One Kubernetes Minor Version at a Time

## Status
validated

## Post Type
Operational upgrade guide

## Technologies Covered

- kOps cluster specifications, upgrades, reconciliation, validation, and rolling updates
- Kubernetes control-plane and kubelet version skew
- kubectl and Kubernetes API-server version inspection
- Deprecated Kubernetes APIs, admission and conversion webhooks, and CRD storage versions
- etcd-manager backups and disaster recovery
- PodDisruptionBudgets and node draining
- Terraform-managed kOps infrastructure

## Sources Consulted

- [kOps: Updates and Upgrades](https://kops.sigs.k8s.io/operations/updates_and_upgrades/)
- [kOps: Upgrading Kubernetes](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/)
- [kOps: Releases and Versioning](https://kops.sigs.k8s.io/welcome/releases/)
- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps: etcd Backup, Restore, and Encryption](https://kops.sigs.k8s.io/operations/etcd_backup_restore_encryption/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops edit cluster`](https://kops.sigs.k8s.io/cli/kops_edit_cluster/)
- [kOps CLI: `kops upgrade cluster`](https://kops.sigs.k8s.io/cli/kops_upgrade_cluster/)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops reconcile cluster`](https://kops.sigs.k8s.io/cli/kops_reconcile_cluster/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [Kubernetes: Version Skew Policy](https://kubernetes.io/releases/version-skew-policy/)
- [Kubernetes: Upgrade a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/cluster-upgrade/)
- [Kubernetes: Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes: API Deprecation Policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [Kubernetes: Versions in CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes CLI: `kubectl get`](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get)

## Issues Found

- The baseline inventory described `kubectl get --raw=/version` as capturing a “served API version.” That endpoint returns the API server's build/version information, not the set of served resource API group versions, so the text now calls it the “API-server version.”
- The Terraform workflow referred only to control-plane instance-group resources. The official kOps 1.31+ procedure targets instance groups with `ControlPlane`, legacy `Master`, or `APIServer` roles before rolling the control-plane and API-server nodes, so the wording now names all applicable roles.
- The final drift check used the default direct-cloud `kops update cluster` preview for every target type. Terraform-managed clusters should regenerate their Terraform output and use `terraform plan`, so the direct preview is now labeled and the Terraform alternative is stated.

## Review Notes

- The post correctly requires consecutive minor-version API-server upgrades and an exact target patch, consistent with the Kubernetes version-skew policy and upgrade guidance.
- The kOps 1.31+ `reconcile` workflow, the older `update` plus `rolling-update` workflow, and the dry-run/`--yes` behavior were confirmed against the current kOps guide and CLI reference.
- The documented `--kubernetes-version`, `--state`, `--wait`, `--count`, and `--yes` flags are current. The kubectl commands and custom-column field paths are syntactically valid; the locally available kubectl v1.34.1 also confirms the used options.
- The backup frequency/retention discussion, separate `main` and `events` backups, restore downtime, post-backup data-loss warning, and PDB-aware drain behavior match the official documentation.
- Exact supported Kubernetes patches and kOps release compatibility remain time-sensitive and should be checked again immediately before each upgrade window, as the post advises.
