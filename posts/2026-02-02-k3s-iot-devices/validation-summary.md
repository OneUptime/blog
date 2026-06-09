# Validation Summary: How to Configure K3s for IoT Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Kubernetes (v1.28.x)
- Flannel CNI (vxlan, host-gw, wireguard-native backends)
- containerd
- SQLite / embedded etcd datastore
- Raspberry Pi / NVIDIA Jetson Nano (ARM64 hardware)
- kubelet configuration (eviction thresholds, reserved resources, CPU manager)
- kube-apiserver and kube-controller-manager tuning
- Local Path Provisioner
- system-upgrade-controller (`upgrade.cattle.io/v1` Plan)
- Pod Security Standards (PSA)
- NetworkPolicy (networking.k8s.io/v1)
- Prometheus / node_exporter
- ResourceQuota and LimitRange

## Sources Consulted
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s configuration file reference: https://docs.k3s.io/installation/configuration
- K3s networking / Flannel backends: https://docs.k3s.io/networking/basic-network-options
- K3s automated upgrades: https://docs.k3s.io/upgrades/automated
- K3s quick-start (install script env vars): https://docs.k3s.io/quick-start
- Kubernetes kubelet flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Removal of `--pod-eviction-timeout` in v1.27: https://github.com/kubernetes/kubernetes/pull/115840
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- system-upgrade-controller (Plan API): https://github.com/rancher/system-upgrade-controller
- local-path-provisioner: https://github.com/rancher/local-path-provisioner
- prometheus/node_exporter: https://github.com/prometheus/node_exporter

## Issues Found
1. **Removed `--pod-eviction-timeout=5m` from the kube-controller-manager-arg list.**
   - The `--pod-eviction-timeout` flag was removed from the Kubernetes kube-controller-manager in v1.27 (kubernetes/kubernetes#115840). The post references K3s `v1.28.5+k3s1` elsewhere, so passing this flag would cause the controller manager to fail to start. Replaced by taint-based eviction, which is the default behavior.

2. **Replaced `node-role.kubernetes.io/master` with `node-role.kubernetes.io/control-plane` in three places.**
   - The Prometheus Deployment `nodeSelector` (gateway node).
   - The `k3s-server-upgrade` Plan `nodeSelector.matchExpressions`.
   - The `k3s-agent-upgrade` Plan `nodeSelector.matchExpressions`.
   - Rationale: The `master` label was deprecated by KEP-2067 (Kubernetes 1.20) and removed from kubeadm clusters in 1.25. Current K3s documentation and the official automated-upgrade examples use `control-plane`. Using `master` risks selectors not matching any node on modern K3s installations.

## Review Notes
- The `--eviction-soft-grace-period=memory.available=1m` entry is correctly formatted (`<signal>=<duration>`); kept as-is.
- Many of the kubelet CLI flags shown (`max-pods`, `eviction-hard`, etc.) are still functional in 1.28 but are formally deprecated as flags in favor of the kubelet config file. Functionality is unchanged for now, so no edit was required.
- `datastore-endpoint: ""` is effectively a no-op (K3s defaults to SQLite when unset on a single-node server). The accompanying comment is accurate in intent; left as-is since it does no harm.
- The "Standard K8s vs K3s" comparison diagram omits that K3s also bundles kube-proxy inside its single binary; the comparison is simplified but not technically incorrect.
- `flannel-backend: wireguard-native` is supported in K3s v1.21+; the `host-gw` comment is also valid. The deprecated `ipsec` / `wireguard` options were not used.
- The system-upgrade-controller Plan `prepare` block format (with `args` and `image`) matches the upstream Plan CRD schema.
- node_exporter `--no-collector.<name>` flags and all referenced collector names are valid for v1.6.x.
- Pod Security Standards namespace labels and values (`restricted`) are correct for Kubernetes 1.28.
- Resource quantities, K3s install script env vars (`K3S_TOKEN`, `K3S_URL`), and install flags (`--write-kubeconfig-mode`, `--disable traefik|servicelb|metrics-server`, `--tls-san`, `--node-label`, `--node-name`) all verified against upstream docs.
