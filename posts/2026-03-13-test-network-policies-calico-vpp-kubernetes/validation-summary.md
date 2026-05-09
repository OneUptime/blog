# Validation Summary: How to Test Network Policies with Calico VPP on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes kubectl
- FD.io VPP policy/ACL CLI
- BusyBox wget

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP implementation and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/specifics
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Project Calico VPP dataplane source, v3.31.0: https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0
- FD.io VPP ACL CLI reference: https://docs.fd.io/vpp/18.01.2/clicmd_src_plugins_acl.html
- BusyBox command reference for wget options: https://busybox.net/BusyBox.html

## Issues Found
- The post described Calico VPP policy enforcement as generic VPP ACL table programming. Current Calico VPP documentation describes `calico-vpp-agent` programming policies through Calico's VPP policy implementation, and the v3.31.0 source exposes a custom policy CLI. Updated the introduction and verification wording to refer to VPP policy state instead of generic ACL tables.
- The VPP inspection command targeted a placeholder `vpp-manager` pod without selecting the VPP container. Calico VPP runs `vpp-manager` and `calico-vpp-agent` as containers in `calico-vpp-node` pods, and troubleshooting examples execute `vppctl` in the `vpp` container. Updated the prerequisite and command to use `<calico-vpp-node-pod-on-server-node> -c vpp`.
- The VPP CLI command `show acl-plugin acl` would show generic ACL plugin ACLs, not Calico's custom policy state. Updated it to `show acl-plugin custom-access-policies`, which is present in the Calico VPP dataplane v3.31.0 source patch for custom access policies.
- The BusyBox `wget --timeout=5` long option may depend on BusyBox build options. Updated the examples to use the documented BusyBox `-T 5` network read timeout form.
- The prerequisite listed `calicoctl`, but no example uses it. Removed it from the required tools list.
- The latency claims stated that VPP policy enforcement adds negligible latency and is virtually free. Official documentation supports VPP as a high-throughput dataplane, but does not justify a blanket zero-cost latency claim. Reworded the section and conclusion to recommend measuring the impact in the user's own cluster.

## Review Notes
The Kubernetes NetworkPolicy YAML is syntactically valid and uses the current `networking.k8s.io/v1` API. The example allows all ingress ports from pods in the same namespace with `app=allowed`; that matches the test intent because only HTTP connectivity to the nginx pod is tested.
