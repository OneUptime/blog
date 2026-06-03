# Validation Summary: How to Set Up Secret Store CSI Driver for External Secrets in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Secrets Store CSI Driver
- AWS Secrets Manager and AWS Secrets and Configuration Provider
- Azure Key Vault provider for Secrets Store CSI Driver
- HashiCorp Vault Secrets Store CSI provider
- Google Secret Manager provider for Secrets Store CSI Driver
- Helm, kubectl, AWS CLI, Vault CLI
- Python watchdog file watcher example

## Sources Consulted
- Secrets Store CSI Driver installation docs: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver concepts and security notes: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- Secrets Store CSI Driver secret rotation docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver sync-as-Kubernetes-Secret docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- AWS provider README: https://github.com/aws/secrets-store-csi-driver-provider-aws
- AWS Secrets Manager ASCP examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/ascp-examples.html
- Azure AKS Secrets Store CSI Driver docs: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Azure workload identity access docs: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Azure provider Helm chart README: https://github.com/Azure/secrets-store-csi-driver-provider-azure/blob/master/charts/csi-secrets-store-provider-azure/README.md
- HashiCorp Vault CSI provider docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- HashiCorp Vault CSI provider installation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation
- GCP provider README and examples: https://github.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp

## Issues Found
- The introduction said the driver keeps sensitive data out of Kubernetes entirely. This is too broad when `syncSecret.enabled=true` is used, because synced Kubernetes Secrets are created and stored in Kubernetes. Updated the wording to say secrets stay out of Kubernetes Secret objects unless syncing is explicitly enabled.
- The benefits section said secrets never exist in etcd and rotation happens automatically. Updated this to clarify that secrets avoid etcd only when not synced to Kubernetes Secrets, and that rotation must be enabled.
- The Azure provider installation omitted the Helm repository setup, did not disable the bundled CSI driver even though the post had already installed it, and used a pod label that does not match current Azure provider verification examples. Added `helm repo add` / `helm repo update`, set `secrets-store-csi-driver.install=false`, and changed the verification selector to `app=secrets-store-provider-azure`.
- The Azure Workload Identity example left `clientID` empty while saying it would use workload identity. Updated it to require a workload identity client ID and removed the managed identity flag from that workload identity snippet.
- The Vault provider install command referenced a non-existent `hashicorp/vault-csi-provider` chart and an unsupported `vault.address` value. Replaced it with the official HashiCorp Helm chart installation using `csi.enabled=true` with Vault server and injector disabled.
- The rotation verification command queried a Deployment, but the Secrets Store CSI Driver runs as a DaemonSet. Updated the command to query `daemonset csi-secrets-store` and changed the default interval wording to `2 minutes`, matching current docs.

## Review Notes
The provider examples are intentionally minimal and still require the referenced cloud identity setup, IAM/RBAC permissions, and actual backend secrets to exist before they will work. The post correctly notes that synced Kubernetes Secrets require a pod volume mount before synchronization occurs.
