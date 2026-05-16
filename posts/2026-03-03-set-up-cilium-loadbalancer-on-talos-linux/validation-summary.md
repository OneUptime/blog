# Validation Summary: How to Set Up Cilium LoadBalancer on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux
- Cilium (CNI)
- Cilium LB-IPAM (LoadBalancer IP Address Management)
- Cilium L2 Announcements
- Kubernetes Service (type: LoadBalancer)
- Helm
- kube-proxy replacement / KubePrism

## Sources Consulted
- Cilium LB-IPAM documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium L2 Announcements documentation: https://docs.cilium.io/en/stable/network/l2-announcements/
- Cilium kube-proxy-free documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Sidero Labs: Deploying Cilium on Talos: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Cilium 1.14.0 release notes (L2 Announcements introduction)
- cilium/cilium#25988 (deprecation of `kubeProxyReplacement=partial`)

## Issues Found

1. **Incorrect minimum Cilium version requirement.** The prerequisites listed Cilium 1.13 as the minimum, but L2 Announcements (which the post relies on for Steps 3 and 4) was introduced in Cilium 1.14, not 1.13. LB-IPAM alone was added in 1.13, but L2 Announcements requires 1.14+. Updated the prerequisites line to say "version 1.14 or newer" and clarified the relationship between the two features.

2. **Outdated `CiliumLoadBalancerIPPool` apiVersion.** All three IP pool examples used `cilium.io/v2alpha1`. This CRD graduated to the stable `cilium.io/v2` API group in current Cilium releases. While `v2alpha1` may still be accepted for backward compatibility in some versions, `cilium.io/v2` is the current correct value. Updated all three YAML manifests to use `cilium.io/v2`.

## Review Notes

- The `CiliumL2AnnouncementPolicy` resource is correctly kept on `cilium.io/v2alpha1` — this CRD has NOT graduated yet in current Cilium (1.19.x) and L2 Announcements remains a beta feature. Readers should be aware of this beta status for production use.
- The `spec.loadBalancerIP` field in the Kubernetes Service spec was deprecated in Kubernetes 1.24 but is still supported. Cilium also accepts the `lbipam.cilium.io/ips` annotation (comma-separated IPs) as a forward-compatible alternative. The post's usage still works but readers writing new manifests may prefer the annotation.
- The string values for `kubeProxyReplacement` (`strict`, `partial`, `disabled`) were removed in Cilium 1.16 — the post correctly uses the boolean `true`.
- The Talos-specific Helm values (`k8sServiceHost=localhost`, `k8sServicePort=7445` for KubePrism, security capabilities, cgroup mounts) match the official Sidero/Talos deployment guide.
- The `cilium service list` and `cilium bpf lb list` commands are valid inside the Cilium agent pod. In newer versions the binary is `cilium-dbg`, but the `cilium` invocation still works in agent context.
