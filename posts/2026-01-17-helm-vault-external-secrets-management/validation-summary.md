# Validation Summary: Managing External Secrets with HashiCorp Vault and Helm

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Helm
- Kubernetes
- HashiCorp Vault
- Vault Helm chart
- External Secrets Operator
- AWS Secrets Manager
- Vault Agent Injector
- Secrets Store CSI Driver
- Vault Secrets Store CSI provider
- PrometheusRule custom resources

## Sources Consulted
- HashiCorp Vault Helm chart configuration: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Helm chart values: https://github.com/hashicorp/vault-helm/blob/main/values.yaml
- External Secrets Operator HashiCorp Vault provider: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator AWS Secrets Manager provider: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator AWS access guide: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- Secrets Store CSI Driver installation docs: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation.html
- Secrets Store CSI Driver secret auto-rotation docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- HashiCorp Vault Secrets Store CSI provider docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- HashiCorp Vault CSI provider installation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation

## Issues Found
- Updated External Secrets Operator resources from `external-secrets.io/v1beta1` to the current documented `external-secrets.io/v1` API version.
- Corrected the Vault KV v2 policy example so `read` permissions apply to `secret/data/...` paths and `list` permissions apply to `secret/metadata/...` paths.
- Fixed the Vault Agent Injector Deployment examples by adding required `spec.selector` and matching pod template labels.
- Removed an invalid user-defined `volumeMount` from the Vault Agent Injector file-injection example; the injected secrets are mounted by the injector at `/vault/secrets/`.
- Changed the environment injection shell command from `source` to POSIX-compatible `.`, matching the `/bin/sh` command used in the example.
- Fixed the CSI Deployment example by adding required `spec.selector` and matching pod template labels.
- Corrected the Helm chart example so the Vault key path is relative to the ESO Vault provider mount and rendered with Helm's `tpl` function instead of relying on values files being evaluated as templates.

## Review Notes
The guide is technically relevant and salvageable. Some production details remain environment-specific, such as Vault TLS certificate provisioning, Vault Kubernetes auth reviewer setup, AWS IRSA role annotations, storage classes, and Prometheus metric availability. Those are acceptable for a guide using example values, but should be verified in the target cluster before use.
