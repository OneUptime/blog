# Validation Summary: How to Troubleshoot Calico on Windows Nodes - Operator

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes
- kubectl
- Windows Host Networking Service (HNS)
- Windows PowerShell
- Windows Firewall
- VXLAN

## Sources Consulted
- Calico documentation: Install Calico for Windows using the operator, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Windows limitations and HNS network removal guidance, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Kubernetes documentation: kubectl logs, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Microsoft Learn: Remove-HnsNetwork, https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/remove-hnsnetwork
- Microsoft Learn: Windows containers HNS and Calico for Windows, https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/multi-subnet

## Issues Found
- The TigeraStatus command described `calico`, but Windows-specific operator status is reported as `calico-windows` where available. Updated the command to `kubectl describe tigerastatus calico-windows`.
- The Windows pod log command omitted container names. `calico-node-windows` pods have multiple containers, so `kubectl logs` needs `-c`. Added log commands for `node`, `felix`, `confd`, and `install-cni`.
- The HNS commands used Calico HNS cmdlets without importing the Calico HNS helper module. Added `Import-Module -DisableNameChecking C:\CalicoWindows\libs\hns\hns.psm1`.
- The HNS removal example targeted Flannel networks while the guide is about Calico. Replaced it with Calico HNS network removal and added the required drain-before-removal caveat.
- The node annotation section claimed the operator annotates Windows nodes with Calico configuration. Replaced it with checks for the Installation resource and `kubernetes-services-endpoint` ConfigMap, which are documented operator configuration points for Calico for Windows.

## Review Notes
The `grep` examples are appropriate for Unix-like admin shells, but Windows-only operators may prefer PowerShell equivalents such as `Select-String` in future revisions. The post does not pin a Calico version; the review used current Calico 3.32 documentation.
