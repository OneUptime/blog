# Validation Summary: How to Get Your kubeconfig from a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes
- kubectl
- kubeconfig file format
- Kubernetes RBAC (Role, RoleBinding, ServiceAccount, TokenRequest)
- OpenSSL (for certificate inspection)

## Sources Consulted
- talosctl source: https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/kubeconfig.go
- Talos CLI reference: https://www.talos.dev/v1.8/reference/cli/ (https://docs.siderolabs.com/talos/v1.8/reference/cli/)
- kubectl reference for `create role`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#create-role
- kubectl reference for `create token`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#create-token
- Kubernetes service-accounts admin docs: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes kubeconfig docs: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/

## Issues Found
1. **Incorrect filename when passing a directory to `talosctl kubeconfig`**: The post stated that Talos writes the file as `config` inside the supplied directory (e.g. `~/.kube/clusters/my-cluster/config`). Per the talosctl source (`cmd/talosctl/cmd/talos/kubeconfig.go`), when the path argument is a directory it is joined with the literal filename `kubeconfig`, not `config`. Updated both the prose ("write the kubeconfig as a `kubeconfig` file inside that directory") and the example file path comment to `~/.kube/clusters/my-cluster/kubeconfig`.

## Review Notes
- `talosctl kubeconfig` correctly merges into `~/.kube/config` by default (`--merge`/`-m` defaults to `true`), and `--force` (`-f`) is a real flag that overwrites an existing entry — both as described.
- The claim that the admin certificate Talos embeds in the generated kubeconfig is valid for one year is consistent with Talos's server-side default (365 days). Note that `talosctl kubeconfig` itself does not expose a client-side `--crt-ttl` flag (that flag lives on `talosctl config new` for Talos API certs, not the Kubernetes admin cert). The post does not claim such a flag exists, so no change was needed.
- `kubectl create token dev-user -n dev-team --duration=8760h` is syntactically valid, but in practice the API server enforces `--service-account-max-token-expiration` (default 24h, hard max 720h / 30 days). The server will silently clamp the issued token's lifetime. The post does not explicitly promise a 1-year token, so this was left as-is, but readers should be aware the actual token lifetime will typically be much shorter than 8760h.
- `kubectl create role` with comma-separated `--verb` and `--resource` values is valid. `deployments` resolves correctly without the `.apps` suffix in current kubectl versions.
- The example kubeconfig YAML structure is accurate. Field names (`certificate-authority-data`, `client-certificate-data`, `client-key-data`, `current-context`, etc.) are correct.
- The `kubectl config set-cluster ... --server=...` syntax in the "Specifying a Different Endpoint" section is correct.
- The troubleshooting pipeline `kubectl config view --raw | grep client-certificate-data | awk '{print $2}' | base64 -d | openssl x509 -noout -dates` is valid and will work when the kubeconfig has exactly one user with embedded cert data; readers with multiple contexts may need to add `--minify` and `--flatten` for unambiguous output, but the command as written is technically correct.
