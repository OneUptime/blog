# Validation Summary: How to Verify Pod Networking with Calico VPP on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico VPP data plane
- Kubernetes
- kubectl
- VPP / vppctl
- CNI networking
- iperf3

## Sources Consulted
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP generated manifest for v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp-nohuge.yaml
- Calico VPP calivppctl helper script for v3.31.0: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/test/scripts/vppdev.sh
- FD.io VPP interface CLI reference: https://s3-docs.fd.io/vpp/19.01.3/df/d68/clicmd_src_vnet.html
- FD.io VPP useful debug CLI reference: https://fd.io/docs/vpp/v2009/reference/cmdreference/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post referred to "VPP manager pods" and used `<vpp-manager-pod>` in `kubectl exec` examples. Calico VPP runs `vpp-manager` inside the `vpp` container of the `calico-vpp-node` pod, so the examples were changed to use `<calico-vpp-node-pod> -c vpp`.
- The pod verification command checked `k8s-app=calico-node` in `kube-system`, which does not verify the Calico VPP dataplane DaemonSet. It was changed to check the `calico-vpp-node` DaemonSet and pods in `calico-vpp-dataplane`.
- The direct `vppctl` examples did not specify the VPP CLI socket used by Calico VPP. The examples now use `vppctl -s /var/run/vpp/cli.sock`, matching the Calico VPP helper script.
- The post suggested using `vppctl show session` to verify pod traffic. Calico's VPP troubleshooting documentation recommends packet tracing through VPP graph nodes for this purpose, so the session-table check was replaced with `clear trace`, `trace add virtio-input 100`, and `show trace max 100`.
- The post used `vppctl show interface statistics`, but the VPP CLI reference documents packet counters under `show interface`. The command and conclusion were updated to `vppctl show interface`.
- The sample VPP interface name `GigabitEthernetb/0/0` contained an invalid-looking character in the PCI slot position. It was corrected to `GigabitEthernet0/0/0`.
- The external test URL was changed from `http://google.com` to `http://example.com` to avoid relying on a redirecting search-engine homepage for a simple HTTP connectivity test.

## Review Notes
The throughput expectation remains intentionally qualitative because Calico VPP performance depends heavily on driver choice, hardware, CPU allocation, MTU, offloads, and whether DPDK or another VPP uplink driver is used. The `iperf3` example is syntactically plausible for `nicolaka/netshoot`, but real clusters may need cleanup commands or namespace flags if the default namespace is not used.
