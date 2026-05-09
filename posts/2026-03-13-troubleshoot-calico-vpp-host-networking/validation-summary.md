# Validation Summary: Troubleshoot Calico VPP Host Networking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- VPP CLI
- DPDK
- Linux hugepages
- Linux network interfaces and kernel modules

## Sources Consulted
- Calico documentation: Get started with VPP networking, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico documentation: Primary interface configuration, https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane implementation details, https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Project Calico vpp-dataplane manifest, https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml
- Kubernetes documentation: kubectl logs, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: Manage HugePages, https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/
- FD.io VPP documentation: Basic interface commands, https://docs.fd.io/vpp/25.10/cli-reference/interface/basic.html
- FD.io VPP documentation: VPP memory usage, https://s3-docs.fd.io/vpp/23.02.0/gettingstarted/troubleshooting/cpuusage.html
- FD.io VPP documentation: Multi-threading in VPP, https://docs.fd.io/vpp/25.10/developer/corearchitecture/multi_thread.html
- FD.io VPP documentation: DPDK CLI commands, https://docs.fd.io/vpp/25.10/cli-reference/index.html

## Issues Found
- The startup log command used `-c vpp-manager`, but the Calico VPP DaemonSet manifest uses `vpp` and `agent` containers. Changed it to `-c vpp`.
- The node-level `journalctl -u vpp` command did not match the Calico VPP pod deployment model. Replaced it with `kubectl describe` of the DaemonSet to surface scheduling, hugepage, and startup events.
- The introduction said VPP takes ownership of the primary interface in all cases. Calico supports drivers such as `af_packet`, where the interface stays in Linux, so the wording now says this depends on the uplink driver.
- The DPDK common-cause note referred to a PCI address in the ConfigMap. Current Calico VPP configuration uses `CALICOVPP_INTERFACES` with `interfaceName` and `vppDriver`, so the note now directs readers to verify those fields.
- The pod interface check grepped for `tap`, but Calico VPP pod interfaces are named `tun[0-9]+`; `tap0` is the host connectivity interface. Changed the command to grep for `tun`.
- The hugepage memory command grepped `show memory` output for `hugepages`, which is not the documented VPP memory output. Changed it to `show memory verbose` and added `show buffers`.
- The hugepage update flow did not mention restarting kubelet after dynamically allocating hugepages. Added `systemctl restart kubelet`, consistent with Kubernetes and Calico documentation.
- The DPDK check used bare `show dpdk`, while documented VPP DPDK CLI commands include subcommands such as `show dpdk version`. Changed it to `show dpdk version`.

## Review Notes
The post is intentionally concise and does not pin a Calico or VPP version. The corrected commands align with current Calico Open Source VPP documentation and the v3.31.0 Calico VPP manifest referenced by the latest docs at review time.
