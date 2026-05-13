# Validation Summary: How to Migrate Existing Workloads to Calico on Windows Nodes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico for Windows
- Kubernetes
- Tigera Operator
- Windows HostProcess containers
- Windows HNS networking
- PowerShell
- kubectl

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows operator installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico for Windows limitations and VXLAN notes: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico for Windows troubleshooting and HNS inspection commands: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#scale
- Microsoft PowerShell Remove-Service documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-service

## Issues Found
- The original workload inventory command used `grep -A5 "nodeSelector.*windows"`, which does not match the normal multi-line YAML structure for `nodeSelector`. Changed the pod lookup to use Kubernetes field selectors and changed the backup command to export relevant workload controllers to YAML.
- The original prerequisites did not mention that current Calico for Windows installation is operator-based and requires Windows HostProcess container support. Added Tigera Operator and Kubernetes v1.22+ HostProcess prerequisites.
- The original PowerShell cleanup used `Remove-Service`, which is only available in PowerShell 6.0 and later and may fail on default Windows PowerShell 5.1 installations. Changed it to `sc.exe delete flanneld`.
- The original Calico install snippet used the deprecated manual Calico for Windows package flow. Replaced it with the current Tigera Operator configuration commands for strict IPAM affinity, VXLAN encapsulation, disabled BGP, `windowsDataplane: HNS`, and monitoring `calico-node-windows`.
- The verification and scale-up pod checks used `grep <windows-node>`. Updated them to use `--field-selector spec.nodeName=<windows-node>`, which is a supported Kubernetes pod field selector.
- The conclusion referred to installing and configuring the Calico Windows package. Updated it to describe enabling the Calico Windows dataplane.

## Review Notes
The guide is technically valid after the fixes, but it remains a high-level migration checklist. In a future revision, it could add platform-specific handling for kube-proxy on Windows and instructions for discovering the cluster service CIDR before applying the `serviceCIDRs` patch.
