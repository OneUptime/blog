# Validation Summary: Understand the Cilium User FAQ

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- CiliumNetworkPolicy
- Hubble
- Kubernetes
- Linux eBPF

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 Policies and `kube-apiserver` entity: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium CLI command reference for `cilium status`, `cilium config view`, and `cilium features status`: https://docs.cilium.io/en/latest/cmdref/
- Cilium troubleshooting documentation for `cilium-dbg endpoint list`, `cilium-dbg monitor`, and `cilium-health status`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Hubble CLI documentation for dropped flow observation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The kernel requirement stated Linux 4.9+ and claimed kube-proxy replacement and L7 policy require kernel 5.3+. Current Cilium stable documentation recommends Linux 5.10 or later, or equivalent distribution kernels such as RHEL 8.10's 4.18 kernel, and documents feature-specific requirements separately. Updated the statement accordingly.
- The feature-check command used `cilium status --verbose | grep "Kernel"`, which is not the documented way to report enabled Cilium features. Replaced it with `cilium features status`.
- The endpoint inspection command used `cilium endpoint list`, but current documentation exposes endpoint inspection through `cilium-dbg endpoint list`, typically executed inside a Cilium agent pod. Updated the command.
- The low-level drop monitor command used `cilium monitor --type drop`, but current documentation uses `cilium-dbg monitor --type drop` inside a Cilium agent pod. Updated the command.
- The node troubleshooting commands used `cilium connectivity test --test node-to-node` and `cilium node list`. Current troubleshooting documentation recommends `cilium-health status --verbose` for node connectivity, and current node listing is available through `cilium-dbg node list`. Updated both commands.

## Review Notes
The `toEntities: kube-apiserver` CiliumNetworkPolicy example, Hubble dropped-flow command, `cilium status`, `cilium connectivity test`, `kubectl get pods -n kube-system -l k8s-app=cilium`, and `cilium config view` examples are consistent with current Cilium documentation. The post intentionally remains high-level; future revisions could mention that some `kubectl -n kube-system exec -it ds/cilium` commands execute on one selected Cilium pod and may need a specific pod or node when investigating node-local datapath state.
