# Validation Summary: How to Add Users or Groups to Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (talosctl, RBAC roles, talosconfig)
- Kubernetes (RBAC, CertificateSigningRequest API, ServiceAccount, Pod securityContext)
- OpenSSL (key and CSR generation)
- OIDC (Kubernetes API server integration)
- Dex (LDAP-to-OIDC identity broker)

## Sources Consulted
- Talos RBAC documentation: https://docs.siderolabs.com/talos/v1.10/security/rbac
- Talos CLI reference (`gen config`, `config new`, `config info`, `read`): https://docs.siderolabs.com/talos/v1.10/reference/cli
- siderolabs/talos issue #12576 (confirms `gen config` has no `--roles` flag): https://github.com/siderolabs/talos/issues/12576
- siderolabs/talos discussion #6880 (OIDC `cluster.apiServer.extraArgs` config shape): https://github.com/siderolabs/talos/discussions/6880
- Kubernetes CertificateSigningRequest API (`certificates.k8s.io/v1`): https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod securityContext reference: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/

## Issues Found
- **Incorrect `talosctl` command for role-specific configs.** The post used `talosctl gen config my-cluster https://192.168.1.10:6443 --roles os:reader`. The `gen config` subcommand is for generating *initial cluster* configs (controlplane.yaml/worker.yaml/talosconfig) and has no `--roles` flag (confirmed by the v1.10 CLI reference and the open feature request siderolabs/talos#12576). The correct command for issuing a user-scoped talosconfig with specific roles is `talosctl config new --roles=<role> <output-file>`, which connects to the cluster and issues a new client cert. Replaced both example commands with the correct `talosctl config new` form.

## Review Notes
- The four Talos roles listed (`os:admin`, `os:reader`, `os:etcd:backup`, `os:operator`) are all valid per the official RBAC docs.
- Worth noting (not changed in the post): `os:reader` cannot read file contents — it can list directories but `talosctl read /etc/passwd` would require `os:operator` or `os:admin`. The post doesn't explicitly pair them, so no edit was needed, but future readers using a reader config for the `/etc/passwd` example will hit a permission error.
- The Kubernetes CSR, RBAC, ServiceAccount, and Pod securityContext YAML are all valid against current Kubernetes APIs.
- The `cluster.apiServer.extraArgs` OIDC config shape is correct for Talos machine config (keys without leading `--`).
- The `dexidp/dex:v2.37.0` image tag is real but somewhat dated (Dex has released newer versions since); not strictly an error, so left as-is.
