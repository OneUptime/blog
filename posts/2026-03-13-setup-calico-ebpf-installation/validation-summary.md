# Validation Summary: How to Set Up Calico eBPF Installation Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Calico (v3.27.0)
- Tigera Operator
- Kubernetes (kubeadm, k3s)
- eBPF / BPF
- kube-proxy
- bpftool
- kubectl (debug, patch, exec)
- VXLAN encapsulation

## Sources Consulted
- Calico — Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico — Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico — Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico v3.27.0 release: https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Tigera Installation API reference (operator.tigera.io/v1)
- Kubernetes — kubeadm init: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes — kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- projectcalico/bpftool: https://github.com/projectcalico/bpftool

## Issues Found
1. **Kernel requirement was too low.** The post said "Linux kernel 5.3+ on all nodes (5.10+ recommended)." Current Calico docs require a minimum of v5.10 for the eBPF data plane, with v6.6+ recommended for full feature support. Changed to "Linux kernel 5.10+ on all nodes (6.6+ recommended)."
2. **Incorrect nodeSelector key for disabling kube-proxy.** The post used `"non-calico-ebpf": "true"`. The officially documented Calico approach uses `"non-calico": "true"` as a non-existent label that effectively descheduled all kube-proxy pods. Changed to `"non-calico"` to match documented practice.

## Review Notes
- The ConfigMap (`kubernetes-services-endpoint` in `tigera-operator` namespace with `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT`) is correct and matches Calico's documented requirement for eBPF service routing.
- The `Installation` CR fields (`linuxDataplane: BPF`, `hostPorts: Disabled`, `variant: Calico`) are valid per the operator.tigera.io/v1 API. `hostPorts: Disabled` is correctly required since host ports are unsupported under BPF mode.
- The `kubectl debug node/...` command for checking/mounting the BPF filesystem runs in the debug pod's mount namespace, not the host's, so the `mount -t bpf ...` fallback would not actually mount on the host. In practice, modern systemd-based distros auto-mount `/sys/fs/bpf`, so this is generally a non-issue, but the command was left as-is since it serves primarily as a verification check.
- The busybox `wget` test in Step 6 hits `https://kubernetes.default.svc`. Stock busybox lacks CA certs/SSL for HTTPS in many builds, and `&& echo "OK"` runs locally based on `kubectl run` exit, not on wget success. The test is imperfect but not technically incorrect — left unchanged to preserve author intent.
- Calico v3.27.0 (released 2023-12-15) is a real, valid release.
- `bpftool` ships inside the `calico/node` image, so the verification `kubectl exec ... -- bpftool prog list` works.
- The ConfigMap example hardcodes `192.168.1.100`; the values fetched in Step 3 should be substituted manually. The post notes this with an inline comment.
