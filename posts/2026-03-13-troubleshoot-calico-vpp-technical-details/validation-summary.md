# Validation Summary: Troubleshoot Calico VPP Technical Details

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP/vppctl
- DPDK
- Calico policy programming

## Sources Consulted
- Calico VPP data plane troubleshooting: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Project Calico vpp-dataplane v3.31.0 source and troubleshooting docs: https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0
- VPP trace command documentation: https://docs.fd.io/vpp/25.06/gettingstarted/progressivevpp/traces.html
- VPP VLIB CLI reference for error counters and memory commands: https://docs.fd.io/vpp/24.02/cli-reference/clis/clicmd_src_vlib.html
- VPP ACL CLI reference: https://docs.fd.io/vpp/22.10.1/cli-reference/clis/clicmd_src_plugins_acl.html
- VPP DPDK CLI reference: https://docs.fd.io/vpp/25.06/cli-reference/clis/clicmd_src_plugins_dpdk_device.html
- VPP interface command reference: https://docs.fd.io/vpp/22.10/cli-reference/interface/basic.html

## Issues Found
- Replaced the broad statement that Calico VPP translates policies only into VPP ACLs. Current Calico docs describe Felix and calico-vpp-agent policy programming, while the v3.31.0 source includes VPP policy and ACL/custom-access-policy support.
- Changed `vppctl clear run` to `vppctl clear errors` and `show node counters` to `show errors` for drop diagnosis. Calico VPP's own troubleshooting guide uses VPP error counters for packet drops.
- Corrected pod interface terminology from `tap` to `tun`, matching Calico VPP documentation for container interfaces.
- Replaced `show acl-plugin interface $POD_IF` with ACL/plugin inspection commands that match documented VPP ACL CLI syntax and Calico VPP's custom access policy command.
- Replaced `vppctl show dpdk statistics`, which is not present in current VPP DPDK CLI docs, with `show hardware-interfaces` and `show dpdk buffer`.

## Review Notes
The packet trace output remains illustrative; actual node names and trace fields vary by VPP version, driver, Calico VPP version, and enabled features. The `kubectl exec ds/calico-vpp-node` examples assume kubectl can resolve the DaemonSet resource to a pod in the target cluster.
