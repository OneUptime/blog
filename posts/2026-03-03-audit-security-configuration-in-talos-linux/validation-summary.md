# Validation Summary: How to Audit Security Configuration in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl`, COSI resources: `machineconfig`, `staticpods`)
- Kubernetes (`kubectl`, RBAC, Pod Security Admission, NetworkPolicy)
- `jq` and `yq` (YAML/JSON querying)
- `openssl` (x509 certificate inspection)
- `kube-apiserver` flags (`--authorization-mode`, `--anonymous-auth`, `--audit-log-path`, `--encryption-provider-config`, `--tls-min-version`)
- GitHub Actions (`actions/checkout@v4`, `actions/upload-artifact@v4`, scheduled workflows)
- Bash scripting

## Sources Consulted
- Sidero Labs Talos docs — RBAC: https://www.talos.dev/v1.10/talos-guides/configuration/rbac/
- Talos machine config reference (`machine.features.rbac`, `machine.systemDiskEncryption`, `machine.network.kubespan`, `cluster.allowSchedulingOnControlPlanes`): https://www.talos.dev/v1.10/reference/configuration/
- Talos Static Pods: https://www.talos.dev/v1.6/advanced/static-pods/
- siderolabs/talos issue #10399 (machineconfig output format and redaction): https://github.com/siderolabs/talos/issues/10399
- Talos v1.12 release discussion (RBAC made non-optional): https://github.com/siderolabs/talos/discussions/12228
- Kubernetes Pod Security Admission labels (`pod-security.kubernetes.io/enforce`, `/warn`): https://kubernetes.io/docs/concepts/security/pod-security-admission/
- kube-apiserver CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- GitHub Actions `schedule` event and `actions/upload-artifact@v4`: https://docs.github.com/en/actions

## Issues Found
1. **Certificate audit script used the wrong source for CA certs.** The original `audit-certificates.sh` ran `talosctl get machineconfig -o yaml | yq '.machine.ca.crt'`. Two problems:
   - `talosctl get <resource> -o yaml` returns a COSI resource wrapper, so the actual config lives under `.spec` — the original yq path would have returned `null`.
   - More importantly, sensitive fields (`machine.ca.crt`, `cluster.ca.crt`, tokens, secrets, etcd CA, aescbc secret) are **redacted to `*` by default** in `talosctl get machineconfig` output, so even with the correct path the cert would never decode.

   **Fix:** rewrote the script to read the Talos API CA from the local `~/.talos/config` (`.contexts."<current-ctx>".ca`) and the Kubernetes CA from the local kubeconfig (`kubectl config view --raw -o jsonpath=...`), which is where these CAs actually live in unredacted form. The API server leaf certificate is now checked by connecting to `:6443` with `openssl s_client`, which works regardless of where the cert is stored on the node.

2. **`talosctl read /etc/kubernetes/manifests/kube-apiserver.yaml` is not the documented way to fetch the kube-apiserver static pod in Talos.** While Talos does render static pod manifests to that path on disk for kubelet, accessing them via `talosctl read` is not the canonical interface (Talos exposes them as the `StaticPods` COSI resource). Replaced with `talosctl -n $CONTROL_PLANE get staticpods kube-apiserver -o yaml`, which is the documented, supported approach. The subsequent `grep`-based checks (`authorization-mode`, `anonymous-auth=false`, `audit-log-path`, `encryption-provider-config`, `tls-min-version`) still work because the rendered command-line args appear in the static pod spec.

## Review Notes
- The simple `grep -q "rbac: true"` check in `audit-machine-configs.sh` is somewhat fragile (it matches anywhere in the YAML and assumes a specific formatting). It is still likely to behave correctly because `machine.features.rbac: true` is the canonical way RBAC is written in Talos machine config. Note: in Talos v1.12+, RBAC was made non-optional and the field is effectively always `true`, so this check is mostly a sanity confirmation on recent clusters.
- `kubectl get networkpolicies --all-namespaces --no-headers | awk '{print $1}'` correctly extracts the namespace column (it is the first column when `--all-namespaces` is used).
- The default-deny detection uses `.spec.podSelector == {} or .spec.podSelector.matchLabels == null`. The `{}` empty-selector check is the canonical Kubernetes idiom for "selects all pods"; the second clause is broader and will also match policies that scope by `matchExpressions` rather than `matchLabels`, which is a slight overreach but not a correctness issue for a coarse audit.
- The pod-security audit's runAsRoot heuristic (`runAsUser == 0` OR `runAsNonRoot != true` at both container and pod level) is conservative and may flag pods that actually run as a non-root UID baked into the image but never set `runAsNonRoot`. This is intentional for an audit (false positives are acceptable) — left as-is.
- The GitHub Actions workflow uses `actions/checkout@v4` and `actions/upload-artifact@v4`, both current major versions. The `schedule` cron `'0 8 * * 1'` is a valid weekly Monday-8AM-UTC trigger.
- `talosctl get staticpods` requires an `os:admin` or `os:reader` role; the post does not call this out but the original `talosctl read` calls had the same requirement implicitly.
