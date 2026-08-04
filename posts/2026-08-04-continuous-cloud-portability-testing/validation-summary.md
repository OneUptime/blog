# Validation Summary: Test Cloud Portability Continuously

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes and managed Kubernetes services (Amazon EKS and Azure Kubernetes Service)
- Helm
- Terraform and Terraform test files
- Gateway API, Ingress, CNI, CSI, NetworkPolicy, StorageClass, and VolumeSnapshotClass
- CI/CD, infrastructure testing, policy checks, and ephemeral environments
- Disaster recovery, backups, RPO/RTO measurement, data restores, and cutover rehearsals
- Workload identity, DNS, TLS, registries, queues, object storage, PostgreSQL, and secret stores

## Sources Consulted

- [Helm `template` command](https://helm.sh/docs/helm/helm_template/)
- [Kubernetes `kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes API concepts: server-side dry run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [CNCF Certified Kubernetes Software Conformance](https://www.cncf.io/training/certification/software-conformance/)
- [CNCF Kubernetes conformance test repository](https://github.com/cncf/k8s-conformance)
- [Gateway API conformance](https://gateway-api.sigs.k8s.io/docs/concepts/conformance/)
- [Gateway API implementer's guide](https://gateway-api.sigs.k8s.io/guides/implementers-guide/)
- [Kubernetes storage classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes volume snapshot classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Kubernetes networking overview and NetworkPolicy implementation notes](https://kubernetes.io/docs/concepts/services-networking/)
- [Terraform `fmt` command](https://developer.hashicorp.com/terraform/cli/commands/fmt)
- [Terraform `validate` command](https://developer.hashicorp.com/terraform/cli/commands/validate)
- [Terraform `test` command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Amazon EKS Kubernetes version lifecycle](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
- [AKS supported Kubernetes versions](https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions)
- [AWS Well-Architected disaster recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/disaster-recovery-dr-objectives.html)

## Issues Found

- The static-check command sequence ran `terraform validate` without initialization. HashiCorp documents that validation requires an initialized working directory, so `terraform init -backend=false -input=false` was added before validation.
- The Helm command did not explicitly render for the declared target Kubernetes version. Added `--kube-version 1.35.0`, and narrowed “exact deployment artifacts” to “workload manifests” because local `helm template` does not perform an install or automatically reproduce every in-cluster capability.
- Terraform provider mocking was presented without its minimum supported version. Clarified that provider mocks require Terraform 1.7 or later.
- The conformance description could be read as covering the entire Kubernetes API surface. Changed it to the required Kubernetes APIs within the conformance program's defined scope.
- The storage test list incorrectly grouped snapshots under `StorageClass`. Corrected it to distinguish persistent-volume lifecycle through `StorageClass` from snapshot lifecycle through `VolumeSnapshotClass`.

## Review Notes

- Kubernetes 1.35 was confirmed as a supported version for both EKS and AKS on the validation date. Availability can still vary by service rollout, region, subscription, and patch version, so the post's instruction to select currently supported target versions remains important.
- The YAML and JSON examples are syntactically valid. The shell commands and flags are current and were cross-checked against official references and installed CLI help.
- No unresolved technical issues remain.
