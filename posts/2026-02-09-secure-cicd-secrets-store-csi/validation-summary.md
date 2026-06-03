# Validation Summary: How to Build a Secure CI/CD Pipeline That Uses Kubernetes Secrets Store CSI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Secrets Store CSI Driver
- HashiCorp Vault and Vault CSI provider
- Tekton Pipelines
- Kaniko
- AWS Secrets Manager and EKS IAM service accounts
- Azure Key Vault CSI provider
- GitHub Actions

## Sources Consulted
- Secrets Store CSI Driver installation docs: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver usage docs: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/usage.html
- Secrets Store CSI Driver sync-as-Kubernetes-Secret docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver set-as-env-var docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/set-as-env-var
- HashiCorp Vault CSI provider docs: https://developer.hashicorp.com/vault/docs/platform/k8s/csi
- HashiCorp Vault CSI provider installation docs: https://developer.hashicorp.com/vault/docs/platform/k8s/csi/installation
- HashiCorp Vault audit device docs: https://developer.hashicorp.com/vault/docs/audit/file
- HashiCorp Vault audit enable CLI docs: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- AWS Secrets and Configuration Provider examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/ascp-examples.html
- AWS Secrets Store CSI provider docs: https://github.com/aws/secrets-store-csi-driver-provider-aws
- Azure Key Vault CSI provider identity docs: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Tekton Task docs: https://tekton.dev/docs/pipelines/tasks/
- Tekton TaskRun docs: https://tekton.dev/docs/pipelines/taskruns/
- GitHub Actions checkout docs: https://github.com/actions/checkout
- HashiCorp Vault GitHub Action marketplace page: https://github.com/marketplace/actions/hashicorp-vault
- Kaniko README: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The post claimed Secrets Store CSI could directly mount secrets as environment variables and that credentials never reside in etcd. Updated the wording to clarify that CSI mounts files, environment variables require syncing to Kubernetes Secrets, and synced Kubernetes Secrets are stored like normal Kubernetes Secrets.
- The Vault CSI provider Helm command used a non-official chart reference. Replaced it with HashiCorp's documented Helm repository and `hashicorp/vault` install with `csi.enabled=true`.
- The Tekton Task used a service account in Vault auth but never attached `tekton-sa` to the Tekton execution. Replaced the broad Kubernetes Secret RBAC example with a TaskRun that uses `serviceAccountName: tekton-sa`.
- Updated the Tekton Task API from `tekton.dev/v1beta1` to the stable `tekton.dev/v1` API.
- The Kaniko step used the non-debug executor image with a Tekton `script`, but the standard Kaniko executor image does not include a shell. Switched to a pinned debug image and the BusyBox shell path.
- The AWS deploy step used `amazon/aws-cli` while also calling `kubectl`. Added installation of a pinned `kubectl` binary before the deploy command.
- The AWS IAM example attached `SecretsManagerReadWrite`, which was unnecessarily broad for a read-only CSI mount. Changed it to `SecretsManagerReadOnly`.
- The GitHub Actions example used older action versions. Updated `actions/checkout` and `hashicorp/vault-action` to current major versions checked during review.
- The rotation CronJob used the Vault image but depended on `openssl` and `kubectl`, and it did not provide Vault authentication. Replaced the password generation with Vault's random endpoint, added an explicit `VAULT_TOKEN` source, and removed the in-container `kubectl` restart command.
- The Vault audit example used a ConfigMap-like HCL snippet, but Vault audit devices are enabled through the Vault CLI/API. Replaced it with `vault audit enable file file_path=...`.

## Review Notes
- Kaniko was archived on June 3, 2025 and is no longer actively maintained. The example now uses the final pinned debug image needed for shell-based CI scripts, but future posts should consider a maintained image builder.
- The examples still use placeholder credentials and simplified deployment commands. They are appropriate for a tutorial, but production pipelines should prefer workload identity/OIDC where available, avoid long-lived cloud access keys, and scope any rotator token tightly.
