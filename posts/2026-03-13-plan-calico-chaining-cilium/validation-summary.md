# Validation Summary: Plan Calico Chaining with Cilium

## Status
validated

## Post Type
Planning Guide / Migration Tutorial

## Technologies Covered
- Cilium (v1.14.0)
- Calico (v3.24+)
- Kubernetes (1.24+)
- CNI Chaining
- eBPF
- Felix (Calico component)
- Hubble
- Helm

## Sources Consulted
- Cilium Calico CNI Chaining Documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-calico/
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Monitor Documentation: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor/
- Calico FelixConfiguration Reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Operator Migration Guide: https://docs.tigera.io/calico/latest/operations/operator-migration
- GitHub PR adding `Auto` option for `iptablesBackend`: https://github.com/projectcalico/calico/pull/6871

## Issues Found
No technical issues found. All claims, commands, and configuration snippets verified against official documentation:
- `cni.chainingMode=generic-veth` is the correct Helm value for Cilium-on-Calico chaining
- `cni.exclusive=false` is correct (prevents Cilium from removing Calico's CNI config from `/etc/cni/net.d`)
- `enableIPv4Masquerade=false` and `enableIdentityMark=false` are valid and recommended Helm values for chaining mode
- `bpfEnabled: false` is the correct FelixConfiguration field to disable Calico's eBPF dataplane
- `iptablesBackend: Auto` is a valid value (alongside `Legacy` and `NFT`) for Calico v3.24+
- The `calico-system` namespace is correct for Tigera Operator-managed Calico deployments
- The stated chaining limitations (no kube-proxy replacement, Calico eBPF must be off, reduced Hubble L7 visibility) are all accurate
- `cilium connectivity test`, `cilium policy get`, and `cilium monitor --type policy-verdict` are valid commands for Cilium 1.14

## Review Notes
- The Helm install command in Step 4 is illustrative for a planning-level guide. A complete production setup based on the official Cilium docs also typically requires `cni.customConf=true`, `cni.configMap=cni-configuration` (referencing a pre-created CNI ConfigMap), `routingMode=native`, and `endpointRoutes.enabled=true`. These are commonly added in a full implementation guide; the post's command captures the essential chaining flags and is not technically incorrect for a planning context.
- Starting in Cilium 1.16, the in-agent CLI binary was renamed from `cilium` to `cilium-dbg`. For the v1.14.x target version in this post, `cilium policy get` (run inside the agent pod) is still correct.
- The post correctly positions Calico-Cilium chaining as a transitional architecture and not a long-term solution, aligning with Cilium project guidance.
- Kubernetes 1.24+, Calico v3.24+, Cilium CLI v0.15+, and kernel 5.4+ are all reasonable prerequisites for Cilium 1.14 eBPF features.
