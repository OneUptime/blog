# Validation Summary: How to Debug Secret-Related Sync Failures in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets and RBAC
- External Secrets Operator
- Sealed Secrets
- HashiCorp Vault
- kubectl
- kubeseal

## Sources Consulted
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator Vault Dynamic Secret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- Sealed Secrets project documentation: https://github.com/bitnami-labs/sealed-secrets
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Updated External Secrets Operator examples from `external-secrets.io/v1beta1` to `external-secrets.io/v1`, which is the current API version shown in the official ESO documentation.
- Corrected the Vault KV v2 `remoteRef.key` example. ESO's Vault provider uses keys relative to the configured provider path, so the example should not imply that `secret/data/...` must be included in the ExternalSecret key.
- Replaced the dynamic-secret `remoteRef` example with a `dataFrom.extract` example for structured KV data. ESO's Vault provider supports the KV secrets engine; Vault dynamic secrets are handled through the Vault Dynamic Secret generator.
- Corrected the Argo CD diff command. `argocd app diff` does not support the shown `--resource` flag, and the official CLI reference notes that Kubernetes Secret contents are not printed in CLI diffs.
- Replaced `argocd app get myapp --show-conditions` with `argocd app get myapp -o yaml` because the current official `argocd app get` command reference does not include a `--show-conditions` flag.
- Fixed the Vault Kubernetes login test so the service account token is read inside the target pod rather than expanded by the local shell before `kubectl exec` runs.

## Review Notes
- The `ignoreDifferences` example is technically valid, but ignoring `/data` for Secrets can hide real secret drift. It should be used only when another controller intentionally owns the generated Secret data.
- `stringData` is valid for Kubernetes Secrets and avoids manual base64 encoding, but Kubernetes notes that it does not work well with server-side apply.
