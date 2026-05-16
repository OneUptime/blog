# Validation Summary: How to Deploy External Secrets Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- External Secrets Operator (ESO)
- Helm v3
- HashiCorp Vault (as a secret provider)
- AWS Secrets Manager (as a secret provider)
- kubectl

## Sources Consulted
- External Secrets Operator official documentation — https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator API spec — https://external-secrets.io/latest/api/spec/
- External Secrets Helm chart values.yaml — https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml
- External Secrets Operator deprecation policy — https://external-secrets.io/latest/introduction/deprecation-policy/
- External Secrets Operator releases — https://github.com/external-secrets/external-secrets/releases
- HashiCorp Vault provider documentation — https://external-secrets.io/latest/provider/hashicorp-vault/
- AWS Secrets Manager provider documentation — https://external-secrets.io/latest/provider/aws-secrets-manager/

## Issues Found
- **Outdated API version (`external-secrets.io/v1beta1`)**: All five YAML manifests (SecretStore for Vault, ExternalSecret for database credentials, ClusterSecretStore, ExternalSecret for app-config, and SecretStore for AWS) used `apiVersion: external-secrets.io/v1beta1`. As of External Secrets Operator v0.17.0, the `v1beta1` API is no longer served — `external-secrets.io/v1` is the current GA version. Updated all five manifests to use `external-secrets.io/v1`. Field structures (provider, auth, data, target, refreshInterval, etc.) are identical between the two versions, so no other YAML changes were required.

## Review Notes
- The Helm install command sets `--set installCRDs=true`, which is redundant since `installCRDs` defaults to `true` in the official chart. Harmless but unnecessary.
- The Helm install command sets `--set webhook.port=9443`. The chart default is `10250`. Overriding to `9443` is a valid configuration choice (common for Kubernetes admission webhooks) but is not required and was not explained in the post. Left as-is since it is technically valid.
- The post uses `kubectl create namespace external-secrets` before `helm install`. The more idiomatic approach is `helm install ... --create-namespace`, but the current approach is equally correct.
- The Vault `tokenSecretRef` in the `ClusterSecretStore` correctly includes a `namespace` field (pointing the cluster-scoped store at a namespaced secret), which is required for ClusterSecretStore — this is correct.
- The `secretRef` structure for the AWS provider (`accessKeyIDSecretRef` / `secretAccessKeySecretRef`) is correct, but for production AWS workloads, IRSA or `pod-identity` is generally preferred over static access keys. The post mentions this is just one of several auth options, which is fine.
- Pod names in the "Expected output" comment (`external-secrets-controller`, `external-secrets-webhook`, `external-secrets-cert-controller`) are illustrative — actual pod names include a deployment hash suffix, but the deployment names match.
