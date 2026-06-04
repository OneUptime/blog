# Validation Summary: How to Use CSI Inline Volumes for Short-Lived Secret Injection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CSI inline ephemeral volumes
- Secrets Store CSI Driver
- AWS Secrets Manager and AWS Secrets Store CSI Driver Provider
- HashiCorp Vault CSI provider
- Azure Key Vault Provider for Secrets Store CSI Driver
- Helm, kubectl, AWS CLI, Azure CLI, eksctl

## Sources Consulted
- Kubernetes ephemeral volumes documentation: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/
- Secrets Store CSI Driver installation documentation: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation.html
- Secrets Store CSI Driver sync as Kubernetes Secret documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver set as ENV var documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/set-as-env-var
- Secrets Store CSI Driver secret auto rotation documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver known limitations: https://secrets-store-csi-driver.sigs.k8s.io/known-limitations
- AWS Secrets Store CSI Driver Provider documentation: https://github.com/aws/secrets-store-csi-driver-provider-aws
- HashiCorp Vault Secrets Store CSI provider documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- HashiCorp Vault CSI tutorial: https://developer.hashicorp.com/vault/tutorials/kubernetes-introduction/kubernetes-secret-store-driver
- Azure Key Vault CSI Driver identity access documentation: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Azure Key Vault Provider Helm chart repository: https://azure.github.io/secrets-store-csi-driver-provider-azure/charts/

## Issues Found
- The introduction implied all injected secrets are automatically rotated. Updated the wording to clarify that mounted content and synced Kubernetes Secrets refresh when rotation is enabled.
- The "Traditional secret management" section incorrectly implied PersistentVolumeClaims are part of ordinary Kubernetes Secret management. Updated it to distinguish Kubernetes Secrets from persistent CSI volume workflows.
- The rotation benefit implied environment variables update without a restart. Updated the claim to refer to mounted files and synced Kubernetes Secrets; the official driver documentation states pods using Kubernetes Secrets as environment variables must be restarted to pick up changed values.
- The AWS provider section installed the provider separately but did not configure `tokenRequests` on the Secrets Store CSI Driver. Added the Helm upgrade required by the AWS provider documentation for separate driver installation.
- The AWS provider verification command used a specific label selector that is not documented in the AWS provider troubleshooting instructions. Replaced it with a pod-name check that matches the documented provider pod name.
- The pod environment variable comment said it read secrets from mounted files, but the YAML used `secretKeyRef` from a synced Kubernetes Secret. Corrected the comment.
- The Azure Key Vault example configured a managed identity but did not grant that identity access to read Key Vault secrets. Added an Azure RBAC role assignment for `Key Vault Secrets User`.
- The conclusion said CSI inline volumes eliminate storing sensitive data in Kubernetes. Updated it to clarify this is true when `secretObjects` syncing is not used.

## Review Notes
The examples are generally valid as tutorial snippets, but production usage should pin chart versions, avoid Vault dev mode, use TLS for Vault, and avoid printing secrets with `kubectl exec ... cat` except during controlled validation.
