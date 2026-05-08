# Validation Summary: Validate Cilium with Broadcom NSX

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes NetworkPolicy
- Broadcom VMware NSX / NSX-T
- NSX Container Plugin (NCP)
- CNI chaining
- eBPF

## Sources Consulted
- Cilium CNI Chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium Generic Veth Chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-generic-veth/
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- VMware NSX-T Data Center Quick Start Guide: https://docs.vmware.com/en/VMware-NSX-T-Data-Center/3.2/nsxt_32_quick_start.pdf
- VMware NSX Container Plugin Operator repository: https://github.com/vmware/nsx-container-plugin-operator

## Issues Found
- The post claimed the guide validated traffic between Kubernetes pods and NSX-managed workloads, but the actual steps only test pod traffic over the NSX-managed overlay. Updated the description and introduction to match the validation steps provided.
- The CNI validation command assumed a fixed `/host/etc/cni/net.d/05-nsx.conflist` filename. CNI configuration filenames vary by installation, so the command now locates an NSX-named conflist or falls back to the first conflist before formatting it.
- The policy verification command used `cilium policy get`, which is not part of the current standalone Cilium CLI command reference. Updated it to run `cilium-dbg policy get` inside a Cilium agent pod, matching Cilium's current policy troubleshooting documentation.
- The denied-traffic test created the `other` pod and immediately executed `curl` without waiting for readiness. Added `kubectl wait --for=condition=Ready pod/other` before executing the connectivity test.
- The best-practice note recommended `CiliumNetworkPolicy` for L7 policy without caveat. Cilium's generic CNI chaining documentation notes that advanced features such as L7 policy can be limited when chaining with other CNI plugins, so the guidance now tells readers to verify L7 support for their chaining mode.

## Review Notes
The post remains a practical validation guide rather than a full installation guide. The NSX/NCP namespace, CNI file naming, and exact compatibility matrix can vary by deployment method and product version, so operators should verify those details against their installed NSX/NCP release notes.
