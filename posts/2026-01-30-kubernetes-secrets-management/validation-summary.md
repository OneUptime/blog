# Validation Summary: How to Build Kubernetes Secrets Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kubernetes encryption at rest
- Kubernetes RBAC
- Kubernetes audit logging
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Bitnami Sealed Secrets
- Stakater Reloader
- Helm
- kubectl

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator AWS Secrets Manager provider documentation: https://external-secrets.io/latest/provider/aws-secrets-manager/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator Azure Key Vault provider documentation: https://external-secrets.io/latest/provider/azure-key-vault/
- Bitnami Sealed Secrets documentation and releases: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The encryption-at-rest sample keys decoded to 28 and 27 bytes, but the shown providers require valid key lengths and the comment specifically says to generate 32 bytes. Replaced them with base64-encoded 32-byte example keys.
- The External Secrets Operator manifests used `external-secrets.io/v1beta1`. Updated examples to the current `external-secrets.io/v1` API.
- The Vault ExternalSecret example included `secret/data/` in `remoteRef.key` while the store already configured `path: "secret"` and `version: "v2"`. Changed the key to `production/api`, matching ESO's Vault provider examples.
- The Vault Kubernetes auth example did not include an audience. Added `audiences: ["vault"]` under `serviceAccountRef`, which is needed for current Vault Kubernetes auth behavior.
- The Sealed Secrets Linux CLI install command referenced old `v0.24.0` artifacts. Updated it to the current `v0.37.0` release and used `install -m 755`.
- The RBAC "deny" section implied Kubernetes RBAC supports explicit deny rules and placed `deployments` in the core API group. Renamed the section to a no-secret-access pattern and split `deployments` into the `apps` API group.
- The audit policy claimed `RequestResponse` with `omitStages` would omit secret request/response bodies. Changed the rule to `Metadata`, which records access without logging secret bodies.
- The troubleshooting `kubectl auth can-i` command did not check the specific namespaced secret. Updated it to check `get secret app-secrets` in the `production` namespace.
- The secret type table described `kubernetes.io/service-account-token` as auto-generated without caveat. Updated it to identify this as the legacy service account token type and mention the required service account annotation plus auto-generated token key.

## Review Notes
- The post is technically relevant and implementation-heavy, so it was reviewed as a code/configuration tutorial.
- Some examples intentionally use static placeholder credentials for illustration. In production, cloud-native identity mechanisms such as AWS IRSA or Azure Workload Identity are preferable to long-lived static access keys.
- The `stringData` examples are valid, but Kubernetes notes that `stringData` does not work well with server-side apply.
