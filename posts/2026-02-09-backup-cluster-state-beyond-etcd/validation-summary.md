# Validation Summary: How to Back Up Kubernetes Cluster State Beyond etcd Snapshots

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes
- kubectl
- etcd and etcdctl
- Velero
- Helm
- HashiCorp Vault
- AWS S3 and AWS Secrets Manager
- Terraform state
- GPG
- kind

## Sources Consulted
- Kubernetes documentation: Operating etcd clusters for Kubernetes, https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes documentation: kubectl api-resources reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes documentation: kubectl version reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes documentation: PodSecurityPolicy removal, https://kubernetes.io/docs/concepts/security/pod-security-policy/
- etcd documentation: How to save the database, https://etcd.io/docs/v3.7/tasks/operator/how-to-save-database/
- Velero documentation: Basic Install, https://velero.io/docs/v1.18/basic-install/
- Velero documentation: Backup API type, https://velero.io/docs/main/api-types/backup/
- Velero AWS plugin README and compatibility table, https://github.com/velero-io/velero-plugin-for-aws
- HashiCorp Vault documentation: vault kv get, https://developer.hashicorp.com/vault/docs/commands/kv/get
- Helm documentation: helm get values, https://helm.sh/docs/helm/helm_get_values/
- AWS CLI documentation: secretsmanager list-secrets, https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/list-secrets.html
- AWS CLI documentation: s3 sync, https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The resource export example included `podsecuritypolicies`, which was removed in Kubernetes v1.25. Removed it from the current cluster-scoped resource list.
- The "Back up all custom resources" example only exported non-namespaced listable resources and missed namespaced custom resources. Added a namespaced `kubectl api-resources --namespaced=true` loop inside each namespace and clarified the cluster-scoped loop.
- The CronJob used `bitnami/kubectl:latest` while running `aws s3 sync`; that image is not a reliable AWS CLI image. Changed it to a placeholder image name that must include both `kubectl` and the AWS CLI.
- The Velero install example used old Velero and AWS plugin versions. Updated the example to Velero v1.17.0 with the compatible AWS plugin v1.13.0 and removed the unnecessary `--use-volume-snapshots=true` flag from the install command.
- The CRD backup script used only the CRD plural name and always passed `--all-namespaces`. Updated it to use fully qualified resource names and to choose `--all-namespaces` only for namespaced CRDs.
- The AWS Secrets Manager backup script appended separate JSON documents into one file, which does not produce valid JSON. Changed it to emit a JSON array using `jq -s`.
- The comprehensive script used `kubectl version --short`, which is not present in the current generated kubectl reference. Replaced it with `kubectl version`.
- Several helper scripts ignored the destination argument used by the comprehensive backup script. Updated the CRD, Helm, Vault, and AWS Secrets Manager snippets to accept an optional output directory.

## Review Notes
The examples are still illustrative and require environment-specific RBAC, credentials, encryption key handling, image construction, and restore testing. The post correctly emphasizes that etcd snapshots alone do not cover persistent volume contents, external secret stores, Helm release metadata, infrastructure state, or control-plane key material.
