# Validation Summary: How to Replace kube-proxy with Cilium on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Cilium (CNI, kube-proxy replacement, Hubble)
- Kubernetes (services, kube-proxy, DaemonSets)
- Helm 3
- eBPF (datapath, BPF maps)
- Direct Server Return (DSR) and Maglev load-balancing

## Sources Consulted
- Cilium "Kubernetes Without kube-proxy" guide — https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium `status` command reference — https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Talos Linux `talosctl` CLI reference (v1.7) — https://www.talos.dev/v1.7/reference/cli/
- Sidero Labs guide "Deploying Cilium CNI on Talos" — https://www.talos.dev/v1.7/kubernetes-guides/network/deploying-cilium/
- Talos `v1alpha1` machine-config reference (cluster.proxy, cluster.network.cni)
- Hubble CLI flag reference (`--to-service` / `--from-service`)

## Issues Found

1. **Invalid Cilium CLI command `cilium cleanup-kube-proxy-rules`** (step 7 of the migration section). This subcommand does not exist in the Cilium agent CLI. The official Cilium kube-proxy-free guide instructs users to delete the kube-proxy DaemonSet and ConfigMap and then run `iptables-save | grep -v KUBE | iptables-restore` on each node. On Talos, where you cannot SSH into the host, the simplest equivalent is rebooting the nodes so stale rules are cleared on boot. Replaced the bogus command with the documented cleanup approach plus `talosctl reboot` calls, and added the missing `kubectl delete cm kube-proxy` cleanup that was previously only mentioned in step 1.

2. **Incorrect `talosctl apply-config` flag `--patch`** (appeared in step 1 and step 5 of the migration section). The flag on `talosctl apply-config` is `-p, --config-patch` (a string array). `--patch` is the flag used by `talosctl patch machineconfig`, a different subcommand. Changed all three invocations to `--config-patch`.

## Review Notes

- The Talos-recommended values for `k8sServiceHost` / `k8sServicePort` are `localhost` / `7445` (Talos runs a built-in kube-apiserver load balancer on every node). The post uses a direct control-plane IP and port 6443, which also works and matches a common deployment pattern, so left as-is — the post explicitly notes "Use the control plane endpoint or load balancer address."
- `kubeProxyReplacement: true` is the current (boolean) form; older string values `"strict"` / `"partial"` were deprecated and removed. The post uses the current form.
- The Cilium security-context capabilities listed for `ciliumAgent` and `cleanCiliumState` match the Talos guide exactly.
- `hubble observe --to-service` only matches flows whose destination IP is the service ClusterIP, not backend pod IPs — worth keeping in mind but not technically wrong as written.
- The `cgroup.autoMount.enabled: false` + `cgroup.hostRoot: /sys/fs/cgroup` combination is the documented Talos workaround and is correct.
- DSR / Maglev explanations and trade-offs are technically accurate.
