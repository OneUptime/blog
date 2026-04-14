# Validation Summary: How to Use Dapr with Kubernetes Service Accounts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar annotations, Component CRD)
- Kubernetes (Service Accounts, Deployments, RBAC)
- AWS EKS (IRSA via eksctl)
- GCP GKE (Workload Identity)
- HashiCorp Vault (Dapr secret store component)

## Sources Consulted
- [Dapr HashiCorp Vault Secret Store Reference](https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/) — verified all metadata field names for the Vault component
- [Dapr Vault component source code (GitHub)](https://github.com/dapr/components-contrib/blob/master/secretstores/hashicorp/vault/vault.go) — confirmed the exhaustive list of supported metadata fields
- [eksctl IAM Roles for Service Accounts documentation](https://eksctl.io/usage/iamserviceaccounts/) — verified `eksctl create iamserviceaccount` flags and syntax
- [GKE Workload Identity documentation](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) — verified `gcloud iam service-accounts add-iam-policy-binding` syntax and `--member` format

## Issues Found

### 1. Deployment YAML missing required `selector` field
**What was wrong:** The `apps/v1` Deployment manifest omitted the required `spec.selector` field and `metadata.labels` on the pod template. Kubernetes rejects Deployments without a selector.
**What was changed:** Added `spec.selector.matchLabels` and `template.metadata.labels` with `app: order-service`.
**Why:** The `selector` field is mandatory for `apps/v1` Deployments. Without it, `kubectl apply` returns a validation error.

### 2. Vault component used non-existent metadata fields
**What was wrong:** The Dapr Vault component example used `k8sMount` and `k8sTokenPath` as metadata field names. These fields do not exist in the Dapr HashiCorp Vault secret store component. The component only supports token-based auth via `vaultToken` or `vaultTokenMountPath`.
**What was changed:** Replaced the two fabricated fields with the single correct field `vaultTokenMountPath` pointing to `/var/run/secrets/vault/token`. Updated the section description from "authenticate via service account tokens" to "authenticate via a token file" to accurately reflect how the component works.
**Why:** Verified against both the official Dapr documentation and the component source code — `k8sMount` and `k8sTokenPath` are not recognized by the component and would be silently ignored, resulting in an authentication failure.

### 3. AWS IAM ARN used invalid 9-digit account ID
**What was wrong:** The example ARN `arn:aws:iam::123456789:policy/...` used a 9-digit account ID. AWS account IDs are always 12 digits.
**What was changed:** Updated to `arn:aws:iam::123456789012:policy/...` (12-digit placeholder).
**Why:** While clearly a placeholder, using the wrong number of digits is technically invalid and could confuse readers trying to match the format against their own ARNs.

## Review Notes
- The ServiceAccount is created with `automountServiceAccountToken: false`, which is a good security practice. However, if the Vault token file approach requires a mounted service account token (e.g., for an init container performing Kubernetes auth to Vault), pods would need to explicitly set `automountServiceAccountToken: true` in their pod spec or use a projected volume. The post treats these as independent examples, so this is not an error, but readers combining the patterns should be aware.
- The Dapr Vault component does not natively support Vault's Kubernetes auth method. To use Kubernetes SA tokens for Vault authentication, a separate mechanism (e.g., Vault Agent Injector sidecar or an init container) is needed to exchange the SA token for a Vault token and write it to the file path referenced by `vaultTokenMountPath`.
- The `eksctl create iamserviceaccount` command is functional but AWS now also recommends EKS Pod Identity as a newer alternative to IRSA for some use cases.
