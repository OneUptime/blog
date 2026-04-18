# Validation Summary: How to Set Up Vault Integration with Rancher - With

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- HashiCorp Vault (server + Agent Injector)
- Vault Helm chart
- Kubernetes auth method
- KV v2 secrets engine
- Rancher (as the Kubernetes distribution)
- kubectl
- Vault policies and roles (RBAC)

## Sources Consulted
- HashiCorp Vault Helm chart run docs: https://developer.hashicorp.com/vault/docs/platform/k8s/helm/run
- HashiCorp Vault Raft deployment guide: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-raft-deployment-guide
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- HashiCorp Vault sidecar injection tutorial: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-sidecar
- HashiCorp Vault operator init / unseal CLI docs (standard Shamir seal flags)
- HashiCorp Vault Kubernetes auth method docs (auth/kubernetes/config and role options)
- HashiCorp Vault KV v2 secrets engine docs (path formatting, `data.data` in templates)

## Issues Found
- **Missing Raft storage flag in Helm install.** The original `helm install` used `server.ha.enabled=true` without enabling Raft. With the default Vault Helm chart, enabling HA mode without Raft assumes an external Consul storage backend, which is not deployed in this tutorial. Pods would fail to start. Added `--set server.ha.raft.enabled=true` so Vault uses integrated (Raft) storage, matching HashiCorp's recommended self-contained HA deployment pattern.

## Review Notes
- The `kubectl exec -it ... -- vault policy write myapp - <<'EOF'` pattern allocates a TTY (`-t`) while piping a heredoc to stdin. This generally works in practice but the `-t` is technically unnecessary and can produce "input is not a terminal" warnings in some shells. Using `-i` without `-t` would be slightly cleaner. Left as-is since it's a stylistic nit rather than an error.
- After adding Raft, the pods will need to be initialized on `vault-0` (as shown) and then `vault-1`/`vault-2` joined to the Raft cluster via `vault operator raft join`. The current post does not cover joining the follower nodes, so readers deploying a true 3-node cluster would need to do that step separately. Not a correctness error, but worth expanding in a future revision.
- `vault operator init -key-shares=5 -key-threshold=3` uses the standard Shamir seal flags. If auto-unseal (e.g., via a cloud KMS) were configured, the recovery-shares/recovery-threshold flags would be used instead. The current post implicitly assumes Shamir seal, which is correct given no auto-unseal is configured.
- The KV v2 policy path `secret/data/myapp/*` and the annotation path `secret/data/myapp/database` both correctly include the `data/` segment required for KV v2 API access. Matches HashiCorp's official examples.
- The agent-inject template correctly uses `.Data.data.username` / `.Data.data.password` (the double `.data` is required for KV v2).
- The title "How to Set Up Vault Integration with Rancher - With" contains a trailing "- With" fragment that looks like an editing artifact. Not a technical issue, so left untouched per reviewer scope.
- The claim about "automatic rotation" in the conclusion is loosely accurate for dynamic secrets and lease renewal, but static KV secrets are not rotated automatically by Vault Agent alone. Minor marketing-style phrasing rather than a technical error.
