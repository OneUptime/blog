# Validation Summary: How to Troubleshoot Calico VPP Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- FD.io VPP
- Kubernetes
- DPDK
- CNAT/service routing

## Sources Consulted
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico documentation: VPP data plane implementation details, https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: Primary interface configuration, https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Project Calico VPP generated manifest v3.31.0, https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Kubernetes documentation: kubectl debug, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- FD.io VPP CLI reference: CNAT commands, https://s3-docs.fd.io/vpp/24.02/cli-reference/clis/clicmd_src_plugins_cnat.html
- FD.io VPP CLI reference: VPP v25.02 command index, https://s3-docs.fd.io/vpp/25.02/cli-reference/

## Issues Found
- The node hugepage check used `/proc/meminfo` inside a `kubectl debug node` container. Kubernetes documents the node filesystem as mounted under `/host`, so the command was changed to read `/host/proc/meminfo`.
- The pod lookup used the label selector `app=calico-vpp-node`, but the current Calico VPP generated manifest labels the DaemonSet pods with `k8s-app=calico-vpp-node`. The selector was corrected.
- The pod interface check searched for `tap`, but Calico VPP documentation states container interfaces are named `tun[0-9]+`; `tap0` is for host connectivity. The command now searches for `tun`.
- The service-routing section checked `show nat44 sessions`, but current Calico VPP service load balancing is implemented through VPP CNAT/DNAT behavior and the VPP CLI provides `show cnat translation <VIP>`. The section was updated to use CNAT terminology and `show cnat translation <service-ip>`.
- The agent log command referenced a non-existent `calico-vpp-manager` container. The current generated manifest uses the container name `agent`, and Calico documentation describes the runtime component as `calico-vpp-agent`. The command and troubleshooting flow were corrected.

## Review Notes
The guide is technically valid after the corrections. The `vppctl show error` command is accepted in VPP documentation and troubleshooting material, though Calico's documentation commonly shows the abbreviated `show err`. The trace example uses `virtio-input`, which is appropriate for traffic from pod interfaces; traffic arriving from the physical NIC may require the driver-specific input node such as `dpdk-input`, `af-packet-input`, `af_xdp-input`, or `avf-input`.
