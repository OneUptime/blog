# Validation Summary: How to Configure Kubernetes Secrets with External Vaults in Rancher (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes Secrets
- HashiCorp Vault
- Vault Kubernetes auth
- Vault Agent Injector
- External Secrets Operator (ESO)
- AWS Secrets Manager
- Amazon EKS IRSA
- Helm
- kubectl

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secrets good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- External Secrets Operator getting started guide: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator HashiCorp Vault provider guide: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator ExternalSecret API guide: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS access guide: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator metrics guide: https://external-secrets.io/latest/api/metrics/
- External Secrets Operator chart values (authoritative upstream chart config): https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml

## Issues Found
- The introduction stated that Kubernetes Secrets lack auditing and access control capabilities. That was inaccurate because Kubernetes provides audit logging and RBAC-based access control. I changed the text to the documented limitation: Secrets are base64-encoded and stored unencrypted in etcd unless encryption at rest is enabled, and they do not provide built-in rotation or centralized secret management.
- The ESO manifests used `apiVersion: external-secrets.io/v1beta1`, while the current upstream docs use `external-secrets.io/v1`. I updated the `SecretStore`, `ExternalSecret`, and `ClusterSecretStore` examples to `v1`.
- The Vault-backed `ExternalSecret` used `remoteRef.key` values like `secret/data/myapp/database` while the `SecretStore` already set the Vault KV mount path to `secret`. In ESO's Vault provider, the mount path is configured separately, so the key should be relative to that mount. I changed the keys to `myapp/database` and `myapp/api`.
- The Vault Kubernetes auth example omitted audience handling required by current Vault behavior. Vault's docs note that roles without an audience warn in Vault 1.20 and fail in Vault 1.21+. I added `audience=vault` to the Vault role and `audiences: ["vault"]` to the ESO `serviceAccountRef`.
- The Vault Kubernetes auth example omitted the required Kubernetes RBAC permission for TokenReview access. I added a `kubectl create clusterrolebinding` example granting `system:auth-delegator` to the Vault service account used for token review.
- The AWS Secrets Manager example was scoped too broadly as applying to any cluster on AWS, but the `jwt.serviceAccountRef` example in ESO is documented as the EKS service account credential flow. I narrowed the wording to Amazon EKS with IRSA already configured.
- The post described ESO `refreshInterval` as enabling secret rotation. ESO refreshes and resyncs secrets; it does not rotate the upstream secret itself. I changed the section wording to "Sync Rotated Secrets" and "automatic refresh."
- The monitoring section port-forwarded `svc/external-secrets-metrics`, but the metrics service is not exposed by default in the ESO Helm chart. I enabled `metrics.service.enabled=true` in the install command so that the later port-forward example is consistent.
- The Vault Agent example used `source` while executing `/bin/sh -c`. `source` is shell-specific and is not portable across all `/bin/sh` implementations. I changed it to the POSIX-compatible `.` form.
- The conclusion claimed the setup "satisfies" PCI-DSS, SOC 2, and HIPAA requirements. That was too strong because compliance depends on the broader system and operating controls, not this integration alone. I changed the wording to say the approach can support compliance controls when implemented with the required platform and organizational controls.

## Review Notes
- The Vault auth example assumes Vault is running in Kubernetes and that the service account token and CA certificate paths shown are available in the execution environment.
- The Rancher angle is mostly contextual rather than product-specific; the implementation steps are standard Kubernetes, Vault, and ESO configuration and should also apply to non-Rancher clusters with the same components.
