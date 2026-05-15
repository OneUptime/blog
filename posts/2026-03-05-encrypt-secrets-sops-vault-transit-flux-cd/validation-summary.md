# Validation Summary: How to Encrypt Secrets with SOPS and HashiCorp Vault Transit for Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- SOPS
- HashiCorp Vault
- Vault Transit secrets engine
- Vault Kubernetes auth method
- GitOps secret management

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- SOPS documentation and README for HashiCorp Vault Transit, `.sops.yaml`, and `--encrypted-regex`: https://github.com/getsops/sops
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault CLI write command documentation: https://developer.hashicorp.com/vault/docs/commands/write

## Issues Found
- The Kubernetes auth section was labeled as a production setup and implied that a one-time Vault token returned by `auth/kubernetes/login` could simply be stored for Flux. Flux expects a Vault token in `sops.vault-token` or `VAULT_TOKEN`, but that token must be renewed or refreshed before expiry. Changed the section to optional and added a note that production deployments need automated token renewal or token management.
- The Kubernetes auth configuration command omitted context about when `kubernetes_host="https://kubernetes.default.svc:443"` is sufficient. Added a comment explaining that this form applies when Vault can use its in-cluster service account token; otherwise the Kubernetes API server address, CA, and reviewer JWT must be supplied.
- The troubleshooting command used `kubectl exec` with `wget` inside the `kustomize-controller` deployment. Flux controller images should not be assumed to contain shell troubleshooting tools. Replaced it with a temporary `curlimages/curl` pod in the `flux-system` namespace to test Vault reachability.

## Review Notes
The SOPS Vault Transit URI, `.sops.yaml` `hc_vault_transit_uri`, Flux `decryption.provider: sops`, Flux `secretRef`, and `sops.vault-token` key are consistent with current official documentation. The decrypt-only Vault policy is appropriate for Flux runtime decryption, while the operator account used for encryption must separately have permission to call the Transit encrypt endpoint.
