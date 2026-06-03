# Validation Summary: How to Configure ServiceAccount with Multiple Secrets

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes Secrets
- Image pull secrets
- ServiceAccount token Secrets
- Projected volumes
- External Secrets Operator
- kubectl commands

## Sources Consulted
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Images documentation for imagePullSecrets: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator lifecycle documentation: https://external-secrets.io/v0.18.2/guides/ownership-deletion-policy/

## Issues Found
- The post incorrectly implied that putting arbitrary application secrets in `ServiceAccount.secrets` automatically gives Pods access to those credentials. Updated the introduction, custom secret section, access section, and conclusion to clarify that application secrets must be explicitly referenced by Pods as volumes or environment variables.
- The post presented `ServiceAccount.secrets` as a general attachment mechanism for application secrets. Updated the wording to explain that this field is only an allow-list for clusters still using the deprecated `kubernetes.io/enforce-mountable-secrets` annotation.
- The rotation script defined `NAMESPACE` but did not pass it to the `kubectl create secret` commands, so it could create or update secrets in the current context namespace instead of `production`. Added `-n $NAMESPACE` to those commands.
- The rotation script did not quote API key environment variables in `--from-literal` arguments. Added quotes to preserve values containing shell-sensitive characters.
- The troubleshooting section implied that ServiceAccount RBAC permission to `get secrets` is required for secret volume mounts or secret-backed environment variables. Updated it to clarify that RBAC is only needed when the workload reads Secret objects through the Kubernetes API.
- The monitoring section claimed the audit script identifies unused secrets and tracks distribution. Adjusted the wording because the script only reports references from ServiceAccounts and Pods using each ServiceAccount.

## Review Notes
The Kubernetes examples use current core `v1` APIs and the External Secrets Operator examples match documented `ExternalSecret` fields. Long-lived ServiceAccount token Secrets remain supported but are not recommended for normal workloads; the post already frames them as a backward-compatibility or external-access option. `kubectl` was not installed in the review environment, so command validation was performed against official Kubernetes command documentation rather than local `kubectl --help` output.
