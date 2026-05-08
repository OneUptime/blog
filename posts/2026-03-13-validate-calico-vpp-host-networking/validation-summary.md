# Validation Summary: Validate Calico VPP Host Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP and `vppctl`
- DPDK and hugepages
- iperf3 benchmarking
- Calico network policy enforcement

## Sources Consulted
- Calico VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP host network configuration: https://docs.tigera.io/calico/latest/reference/vpp/host-network
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP generated Kubernetes manifest v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- VPP show command reference: https://fd.io/docs/vpp/v2101/reference/cmdreference/show/
- VPP debug CLI command index: https://docs.fd.io/vpp/19.01/clicmd.html

## Issues Found
- The VPP pod log command used container name `vpp-manager`, but the referenced Calico VPP manifest names the container `vpp`. Updated the command to `-c vpp`.
- The interface examples described `tap0`, `tap1`, etc. as pod interfaces. Calico VPP troubleshooting documentation identifies pod interfaces as `tun[0-9]+` and `tap0` as the host connectivity tap. Updated the interface list, diagram, Step 4 wording, and conclusion.
- The performance benchmark stated a fixed expected improvement of `2-5x`. Official Calico documentation describes higher throughput as a benefit but does not guarantee a fixed multiplier. Replaced the fixed claim with a workload and hardware dependent caveat.
- The policy verification command used `vppctl show acl-plugin acl`, but Calico VPP policy programming is handled by the Calico VPP agent and a custom VPP plugin. Updated the check to inspect agent logs for policy programming.

## Review Notes
The remaining Kubernetes commands use current command forms. `kubectl` was not installed in the local environment, so CLI syntax was verified against the official generated Kubernetes reference rather than local `--help` output.
