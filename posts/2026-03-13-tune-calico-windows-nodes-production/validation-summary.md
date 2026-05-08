# Validation Summary: How to Tune Calico on Windows Nodes for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for Windows
- Kubernetes
- Tigera Operator Installation custom resource
- Windows HNS
- Windows PowerShell
- Windows TCP networking

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Calico for Windows limitations and known issues, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico documentation: Calico for Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Install using Operator for Calico for Windows, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configure resource requests and limits, https://docs.tigera.io/calico/latest/reference/configure-resources
- Microsoft Learn: netsh interface command syntax, https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Enable-NetAdapterRss, https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterrss
- Microsoft Learn: TCP Chimney Offload deprecation guidance, https://learn.microsoft.com/en-us/windows-server/networking/technologies/hpn/hpn-software-hardware-features
- Microsoft Learn: HostNetworkingService PowerShell cmdlets, https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/
- Microsoft Learn: Windows container resource controls, https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/resource-controls

## Issues Found
- The post said to tune Windows VXLAN MTU by patching `spec.calicoNetwork.mtu`. Calico documents VXLAN MTU configuration for Calico generally, but Calico for Windows limitations state that VXLAN MTU setting is not supported on Windows. I changed the section to explain VXLAN overhead, clarify that Windows VXLAN MTU is not directly configurable in Calico, and keep the Installation CR patch scoped to Linux workloads in the same VXLAN cluster.
- The HNS verification command claimed to verify MTU while selecting only `Name` and `Type`. I changed the text to say it verifies that the Calico HNS network exists and has the expected type.
- The TCP tuning command used `netsh int tcp set supplemental Internet cwnd=10`, but current `netsh interface tcp set supplemental` syntax uses `icw`, not `cwnd`, and this does not tune the receive window. I replaced it with `netsh int tcp set global autotuninglevel=normal`.
- The post recommended enabling TCP Chimney Offload. Microsoft documents TCP Chimney Offload as deprecated and recommends not using it. I removed the enable command and replaced it with `netsh int tcp show global` for reviewing active settings.
- The resource limit example used unsupported `CALICO_NODE_CPU_LIMIT` and `CALICO_NODE_MEMORY_LIMIT` edits in `C:\CalicoWindows\config.ps1`. I replaced it with the operator-supported `calicoNodeWindowsDaemonSet` resource patch.
- The HNS policy section used an unsupported hard threshold of 500 policy lists. I removed the threshold and changed the guidance to review unexpectedly high policy state and reduce NetworkPolicy or Calico policy complexity.
- The performance counter section was titled "Enable" even though the commands only read counters. I changed the title to "Check Windows Performance Counters."
- The monitoring section referenced a separate `felix` process. I changed the example to check `calico-node` locally and use `kubectl top` for the operator-managed Windows DaemonSet.

## Review Notes
The post is technically relevant and contains implementation details. The corrected guidance assumes an operator-managed Calico for Windows deployment, which is the current preferred installation path; manual Calico for Windows installation is deprecated in current Calico documentation.
