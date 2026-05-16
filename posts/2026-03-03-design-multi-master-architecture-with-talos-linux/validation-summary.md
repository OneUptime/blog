# Validation Summary: How to Design Multi-Master Architecture with Talos Linux

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Talos Linux (v1.6 / v1.7)
- Kubernetes control plane (kube-apiserver, kube-controller-manager, kube-scheduler)
- etcd
- talosctl CLI
- HAProxy (load balancing)
- Talos VIP (built-in virtual IP)
- Cilium (CNI)
- kubectl

## Sources Consulted
- Talos Linux docs — https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos VIP docs — https://docs.siderolabs.com/talos/v1.8/networking/vip/
- Talos `talosctl gen config` reference (`-o, --output` flag)
- Kubernetes kube-controller-manager reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes admission controllers — https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kube-scheduler reference — https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- kubectl drain reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- etcd v3.5 configuration — https://etcd.io/docs/v3.5/op-guide/configuration/
- Kubernetes PR removing `--pod-eviction-timeout` — https://github.com/kubernetes/kubernetes/pull/113710
- Cilium GitHub releases / install paths

## Issues Found

1. **`talosctl gen config --output-dir _out`** — The flag `--output-dir` is not valid. The current flag is `-o, --output`. Replaced `--output-dir _out` with `--output _out`.

2. **VIP example included `equinixMetal: { apiToken: "" }` for a non-Equinix-Metal setup** — Including an empty `equinixMetal` block when the cluster is not on Equinix Metal is misleading and not part of the documented format. Replaced with comments noting that an `equinixMetal` block (or `hcloud` block) should be added only when running on those platforms.

3. **`kube-controller-manager --pod-eviction-timeout` flag** — This flag was deprecated and is removed/non-functional in modern Kubernetes (removed in v1.27, and had been a no-op since v1.13 once taint-based eviction became the default). Removed the `pod-eviction-timeout: "30s"` line from the `controllerManager.extraArgs` example. Per-pod eviction timing is now controlled via `tolerationSeconds` on the `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable` taints (defaulted via the API server's `--default-not-ready-toleration-seconds` / `--default-unreachable-toleration-seconds`).

4. **Cilium `quick-install.yaml` CNI URL** — The URL `https://raw.githubusercontent.com/cilium/cilium/v1.14.5/install/kubernetes/quick-install.yaml` returns 404. The `quick-install.yaml` was removed from the Cilium repo after v1.9.x; v1.14 is installed via the `cilium` CLI or Helm. Changed the `network.cni` block to `name: none` with a comment that Cilium should be installed via Helm after bootstrap. This matches the pattern recommended in the Talos + Cilium docs.

## Review Notes
- `talosctl kubeconfig --nodes 192.168.1.100` uses the Kubernetes VIP as the talosctl target; talosctl normally targets the Talos API on port 50000 on individual control-plane node IPs. This still works in practice when the VIP IP routes to a live control-plane node, but specifying a real control-plane node IP (e.g. `192.168.1.10`) would be more conventional. Left as-is since it is not strictly incorrect.
- The installer image versions referenced (`v1.6.0`, `v1.7.0`) are valid historical Talos releases. They are not the latest at time of review, but the post's upgrade narrative (v1.6.0 → v1.7.0) is consistent and useful as an example.
- `kubectl get componentstatuses` is correctly called out as deprecated in the monitoring section.
- The etcd sizing guidance and tunables (`heartbeat-interval`, `election-timeout`, compaction settings, `quota-backend-bytes`) are valid for etcd v3.5.
- `enable-admission-plugins: "NodeRestriction,PodSecurity"` is correct for Kubernetes ≥ 1.25 (PodSecurity replaced the removed PodSecurityPolicy).
- `talosctl etcd remove-member` takes a member ID (obtained from `talosctl etcd members`); the post correctly uses a `<member-id>` placeholder.
