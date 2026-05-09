# Validation Summary: How to Troubleshoot Calico on Windows Nodes - Rancher

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Rancher Manager
- RKE2/K3s Rancher system agent
- Kubernetes and kubectl
- Calico for Windows
- Windows Host Networking Service (HNS)
- PowerShell networking and service cmdlets

## Sources Consulted
- Rancher Manager docs: Rancher Agents, https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher Manager docs: Launching Kubernetes on Windows Clusters, https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher Manager docs: Registered Clusters troubleshooting, https://ranchermanager.docs.rancher.com/v2.14/troubleshooting/other-troubleshooting-tips/registered-clusters
- Tigera Calico docs: Troubleshoot Calico for Windows, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Kubernetes docs: kubectl describe, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes docs: kubectl logs, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes docs: kubectl quick reference, https://kubernetes.io/docs/reference/kubectl/quick-reference
- Microsoft Learn: Test-NetConnection, https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Learn: Stop-Service, https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-service

## Issues Found
- The introduction incorrectly stated that `cattle-cluster-agent` communicates with Windows nodes over the Calico pod network. Updated it to state that `cattle-cluster-agent` connects Rancher to the downstream Kubernetes API, while Rancher-provisioned RKE2/K3s nodes are managed by `rancher-system-agent`.
- Step 2 incorrectly looked for a Rancher agent pod on the Windows node. Replaced that with `cattle-cluster-agent` Deployment checks and a Windows `rancher-system-agent` service check.
- Step 3 assumed Calico always runs in `calico-system`. Added the documented `kube-system` namespace caveat for non-operator Calico installs.
- Step 4 hard-coded port 8443 and implied Calico normally blocks Windows host egress to Rancher. Replaced 8443 with a placeholder for custom Rancher port mappings and directed readers to host firewall, proxy, route, and security group checks.
- Step 5 used `Get-HnsNetwork` and `Get-HnsEndpoint` without importing Calico's HNS PowerShell module. Added the documented `ipmo -DisableNameChecking C:\CalicoWindows\libs\hns\hns.psm1` import first.
- Step 7 described cluster-agent logs as being on the management plane. Updated the heading to say the logs are in the downstream cluster.

## Review Notes
The command examples are generic and assume Unix-style filtering with `grep` for `kubectl` output. That is acceptable when run from a Linux/macOS shell or Windows environment with compatible tools, but future improvements could include PowerShell-native filtering alternatives for Windows-only operators.
