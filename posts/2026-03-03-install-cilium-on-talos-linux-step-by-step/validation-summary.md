# Validation Summary: How to Install Cilium on Talos Linux Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS by Sidero Labs)
- Cilium CNI (eBPF-based networking)
- Kubernetes
- Helm
- talosctl CLI
- kubectl
- Cilium CLI
- Hubble (Cilium observability)
- WireGuard (encryption)
- KubePrism (Talos local API server proxy)

## Sources Consulted
- Talos Linux Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos Linux KubePrism docs: https://www.talos.dev/v1.8/kubernetes-guides/configuration/kubeprism/
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Cilium Helm chart values: https://docs.cilium.io/en/stable/helm-reference/
- Cilium rp_filter discussion: cilium/cilium issues #13130 and #10645

## Issues Found

1. **Incorrect `talosctl apply-config --patch` usage** — The post used `talosctl apply-config --nodes X --patch @file.yaml` to apply a YAML patch to an existing node's configuration. While `apply-config` has a `--config-patch` flag, it is designed to patch a full config file passed with `-f` before applying. The correct command for patching an existing machine config on a running node is `talosctl patch mc --nodes X --patch @file.yaml`. Fixed by replacing all occurrences of `talosctl apply-config --nodes X --patch ...` with `talosctl patch mc --nodes X --patch ...` (in Step 1 and Step 2).

## Review Notes
- All Cilium Helm values used in Step 3 match the current official Talos Cilium deployment guide exactly (kubeProxyReplacement=true, cgroup settings, securityContext capabilities for ciliumAgent and cleanCiliumState, k8sServiceHost=localhost, k8sServicePort=7445).
- KubePrism on `localhost:7445` is correctly identified as the recommended endpoint and has been the default since Talos 1.6.
- `kubeProxyReplacement=true` is the modern syntax; older Cilium versions (<1.14) used `strict`, but the post correctly uses the current form.
- The pod label selectors (`app.kubernetes.io/part-of=cilium`, `k8s-app=cilium`, `app.kubernetes.io/name=cilium-operator`) are all correctly applied by the current Cilium Helm chart.
- The `rp_filter=0` sysctl is functional with Cilium, though Cilium maintainers more commonly recommend `2` (loose mode) which still provides some source validation. `0` is acceptable and leaving it unchanged as the post's choice.
- The Cilium CLI download URL pattern and the `stable.txt` lookup are current and correct.
- The `cilium status` ASCII art block is a stylized illustration rather than literal verbatim output, which is reasonable for a tutorial.
