# Validation Summary: Fixing Tunneling Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VXLAN
- Geneve
- Native routing
- eBPF host routing
- MTU tuning
- iperf3
- kubectl

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Helm upgrade examples did not include `--reuse-values`. For an existing Cilium installation, `helm upgrade` with only new `--set` values can reset other chart values to defaults. Added `--reuse-values` to the Cilium upgrade examples so the commands preserve existing release values while applying the intended changes.
- The eBPF host-routing guidance was framed as tunnel-specific and set `bpf.hostLegacyRouting=false` without enabling eBPF masquerading. Cilium's performance tuning documentation lists eBPF kube-proxy replacement and eBPF masquerading as requirements for eBPF host routing. Updated the prose, section heading/comment, and command to use `--set bpf.masquerade=true` with `--set kubeProxyReplacement=true`.
- The drop-monitoring checklist used `cilium monitor --type drop` as if it were run directly from the local Cilium CLI. Current Cilium troubleshooting documentation uses `cilium-dbg monitor --type drop` inside a Cilium pod. Updated the checklist to select a Cilium pod and run `cilium-dbg monitor` through `kubectl exec`.

## Review Notes
- The native routing, `autoDirectNodeRoutes`, `ipv4NativeRoutingCIDR`, `tunnelProtocol=geneve`, and MTU examples use valid Cilium Helm values.
- The post's native routing guidance is accurate but environment-dependent: pod CIDRs must be routable by the underlying network or by routes installed on each node.
- BPF host routing has documented compatibility caveats, including features that depend on host netfilter hooks and some service-mesh configurations.
