# Validation Summary: How to Configure the Kubernetes API Server on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl CLI)
- Kubernetes (kube-apiserver static pod, admission controllers, feature gates, OIDC, API aggregation)
- TLS (cipher suites, certificate SANs, minimum versions)
- Audit logging and EncryptionConfiguration
- kubectl, openssl

## Sources Consulted
- Talos v1alpha1 configuration reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Talos CLI reference (talosctl apply-config, talosctl patch, talosctl logs, talosctl get): https://www.talos.dev/v1.7/reference/cli/
- Talos configuration patches docs: https://www.talos.dev/v1.9/talos-guides/configuration/patching/
- Talos static pods docs (kube-apiserver as static pod): https://www.talos.dev/v1.9/talos-guides/configuration/static-pods/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes feature gates: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes graceful node shutdown (kubelet-only feature): https://kubernetes.io/docs/concepts/cluster-administration/node-shutdown/
- Kubernetes auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes encryption at rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes OIDC authentication: https://kubernetes.io/docs/reference/access-authn-authz/authentication/#openid-connect-tokens

## Issues Found

1. **Wrong talosctl flag for applying patches (multiple locations).** The post used `talosctl apply-config --patch @file.yaml`. `apply-config` does not have a `--patch` flag — its patch flag is `--config-patch` (or `-p`), and even then it expects a full config via `--file`. To apply a standalone patch against a running node's machine config, the correct command is `talosctl patch machineconfig` (alias `patch mc`). Changed all three command examples to `talosctl patch mc --nodes ... --patch @file.yaml`.

2. **`talosctl service kube-apiserver` is invalid.** `kube-apiserver` is a Kubernetes static pod managed by kubelet, not a Talos system service (Talos services are apid, containerd, cri, etcd, kubelet, machined, trustd, etc.). The command would error. Replaced with `talosctl -n <ip> get staticpodstatus`, which is the correct Talos resource for inspecting static pod state.

3. **`talosctl logs kube-apiserver --tail 50` is invalid for the same reason.** Without the `-k`/`--kubernetes` flag, talosctl looks up the name as a Talos service. Replaced with the equivalent `kubectl -n kube-system logs -l component=kube-apiserver --tail=50`, which is simpler than constructing the full `<namespace>/<pod>/<container>` container ID required for `talosctl logs -k`.

4. **`GracefulNodeShutdown` is a kubelet feature gate, not an API server feature gate.** It is GA/enabled-by-default since Kubernetes 1.21 and has no meaning under `cluster.apiServer.extraArgs.feature-gates`. Replaced the example with `WatchList=true`, which is an actual kube-apiserver feature gate (beta in 1.30), and added a comment noting that only kube-apiserver-specific gates belong here.

## Review Notes

- The OIDC flags (`--oidc-issuer-url`, `--oidc-client-id`, etc.) shown in the post are still functional but are considered legacy as of Kubernetes 1.30+, which introduces a structured `AuthenticationConfiguration` file as the recommended approach. Not a current correctness issue.
- `cluster.apiServer.resources` is a relatively recent Talos addition (~v1.7) — readers on older Talos may need to upgrade.
- `disable-admission-plugins: ""` in the admission controller example is harmless but unnecessary; leaving it out would be cleaner.
- The audit-log and encryption volume example creates the host files via `machine.files` and mounts them via `extraVolumes` correctly, but the corresponding `--audit-policy-file` and `--encryption-provider-config` `extraArgs` would also need to be added in a real deployment for those volumes to take effect — not strictly an error, since the post frames it as "the volumes need to be mounted" rather than a complete example.
- The pod name `kube-apiserver-talos-control-1` in the final verification step is illustrative and depends on actual node naming; the format `kube-apiserver-<node-name>` is correct for static pods.
