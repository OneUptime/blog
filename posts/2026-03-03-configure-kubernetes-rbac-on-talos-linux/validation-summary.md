# Validation Summary: How to Configure Kubernetes RBAC on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes RBAC (Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- kubectl (config, auth can-i, apply, get)
- OpenSSL (certificate generation and signing)
- yq (YAML processing)
- jq (JSON processing)
- Kubernetes API groups (core, apps, batch, networking.k8s.io, storage.k8s.io, rbac.authorization.k8s.io)

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Talos Linux documentation: https://www.talos.dev/
- siderolabs/talos source (constants.go) for static pod manifest naming: https://github.com/siderolabs/talos/blob/main/pkg/machinery/constants/constants.go
- siderolabs/talos source (control_plane_static_pod.go) for kube-apiserver authorization-mode default
- siderolabs/crypto source (certificate_key.go) for `crt`/`key` YAML field names
- siderolabs/talos issue #10399 (machineconfig spec is a YAML-encoded string in -o yaml output)
- Kubernetes API reference for RBAC subresources (pods/log, pods/exec)

## Issues Found
1. **Incorrect static pod manifest path.** The post referenced `/etc/kubernetes/manifests/kube-apiserver.yaml`, but Talos prefixes its rendered static pod manifests with `talos-` (constant `TalosManifestPrefix` in `pkg/machinery/constants/constants.go`). Updated the `talosctl read` path to `/etc/kubernetes/manifests/talos-kube-apiserver.yaml` so the command actually works on a Talos node.

2. **Broken yq query for extracting the Kubernetes CA.** The post used `talosctl -n <ip> get machineconfig -o yaml | yq '.cluster.ca.crt'`. In current Talos versions, `talosctl get machineconfig -o yaml` returns a COSI resource whose `.spec` field contains the machine config as a YAML-encoded string (see siderolabs/talos issue #10399). The original pipe returns `null`. Updated both the cert and key extraction commands to `yq '.spec | from_yaml | .cluster.ca.crt'` (and `.cluster.ca.key`), and added a one-line comment explaining the parsing step.

## Review Notes
- The default authorization mode `Node,RBAC` is correct (hardcoded in Talos's control plane static-pod controller). Since Talos 1.9, the kube-apiserver may also be configured via `--authorization-config` when supported, but Node + RBAC authorizers are always added — so the `grep authorization-mode` check still works.
- The RBAC YAML examples (Role, ClusterRole, RoleBinding, ClusterRoleBinding) all use the correct `rbac.authorization.k8s.io/v1` API and valid verbs/resources/apiGroups.
- The `pods/log` rule includes verbs like `create`/`delete` that are not meaningful for that subresource (only `get` is useful), but this is harmless and not technically incorrect.
- The aggregation rule example (`aggregationRule` + `clusterRoleSelectors` + `matchLabels`, with `rules: []` to be auto-filled) matches the documented Kubernetes ClusterRole aggregation behavior.
- The `system:serviceaccount:<namespace>:<name>` format used with `kubectl auth can-i --as` is correct.
- For users who don't want to depend on `from_yaml`, the kubeconfig produced by `talosctl kubeconfig` exposes the K8s CA cert in `clusters[0].cluster.certificate-authority-data` — this could be mentioned in a future revision as an alternative path that avoids parsing the machineconfig at all (though it does not expose the CA private key, which is still needed for signing client certs).
