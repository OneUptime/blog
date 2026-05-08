# Validation Summary: How to Verify Pod Networking with Calico on Windows Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico for Windows
- Kubernetes Windows nodes and Windows containers
- Kubernetes Pods and `kubectl`
- Windows Host Networking Service (HNS)
- PowerShell networking commands
- Calico IPAM and `calicoctl`
- BusyBox HTTP tooling

## Sources Consulted
- Kubernetes documentation: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes documentation: Networking on Windows: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes documentation: `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Calico documentation: Install Calico for Windows using the operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Install Calico for Windows manually: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico documentation: Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Troubleshoot Calico for Windows: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Calico documentation: `calicoctl ipam show`: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Microsoft Learn: Windows container network drivers and topologies: https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/network-drivers-topologies
- BusyBox command documentation: https://busybox.net/BusyBox.html

## Issues Found
- The `Window` tag was incorrect. Changed it to `Windows`.
- The prerequisites implied that `kubectl` must be run from a Linux node. Changed this to a Linux or other Unix-like shell because the commands require shell behavior, not node locality.
- The Windows service check was only accurate for manually installed Calico for Windows. Added a HostProcess/operator caveat because operator-managed Calico for Windows runs in `calico-node-windows` pods rather than registering `CalicoNode` and `CalicoFelix` services directly on the host.
- The HNS endpoint command omitted the Calico HNS PowerShell module import shown in Calico's troubleshooting documentation. Added the `ipmo -DisableNameChecking C:\CalicoWindows\libs\hns\hns.psm1` step.
- The Windows pod manifest used an unquoted heredoc, so the local shell would expand PowerShell variables such as `$true`. Changed it to `<<'EOF'`.
- The Windows pod manifest used a fixed `ltsc2019` image. Updated the example to `ltsc2022` and added a note to use a base image tag matching the Windows node OS version.
- The Windows pod manifest did not set `.spec.os.name`, which Kubernetes documentation recommends for Windows Pods. Added `os.name: windows`.
- The cross-OS test attempted `Test-NetConnection` to port 80 on a BusyBox pod that was only sleeping, so the test would fail even with working networking. Changed the Linux test pod to run BusyBox `httpd` on port 8080.
- The Linux-to-Windows test used ICMP ping, which is not as reliable as an application-level connectivity check across Windows firewall and policy configurations. Changed the Windows test pod to run an HTTP listener and changed the Linux test to `wget` the Windows pod IP on port 8080.
- The log-checking step only covered manually installed Calico for Windows. Added operator-managed HostProcess `kubectl logs` commands for the `node` and `felix` containers.

## Review Notes
The post is technically valid after the fixes. The examples remain version-sensitive: Windows container base image tags must match the node OS, and Calico for Windows verification differs between manual installs and current operator-managed HostProcess installs.
