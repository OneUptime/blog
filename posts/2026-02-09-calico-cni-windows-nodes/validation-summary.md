# Validation Summary: How to Set Up Calico CNI for Windows Nodes in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico CNI
- Calico for Windows
- Tigera Operator
- Windows Server containers
- Windows Host Networking Service (HNS)
- NetworkPolicy and Calico GlobalNetworkPolicy
- PowerShell

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows operator installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico operator Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico manually installed Windows services maintenance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/maintain
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels and namespace selector behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Project Calico v3.27.0 Windows release archive: https://github.com/projectcalico/calico/releases/download/v3.27.0/calico-windows-v3.27.0.zip

## Issues Found
- The Windows VXLAN examples enabled BGP, but Calico documentation requires BGP to be disabled when Calico CNI with VXLAN is used. Changed the operator Installation example to use `bgp: Disabled` and clarified the BGP/VXLAN explanation.
- The architecture section described BIRD as a Windows component. Windows BGP mode uses Windows RemoteAccess routing with Calico components, so the description was corrected.
- The prerequisites overstated the Kubernetes version and understated the HostProcess/containerd/Linux-node requirements. Updated them to match Calico's Windows operator requirements.
- The operator Windows configuration used invalid or misplaced fields, including `windowsNodes.cni` and `windowsNodes.kubeletVolumePluginPath`. Replaced it with supported `serviceCIDRs`, `calicoNetwork.windowsDataplane`, `windowsNodes` path fields, and strict IPAM affinity.
- The manual Windows install flow wrote JSON to `config.ps1` and passed unsupported parameters to `install-calico.ps1`. Updated it to use the bundled `config.ps1` environment-variable model and run `install-calico.ps1` without unsupported flags.
- The service examples referenced a nonexistent `CalicoCNI` service. Changed service checks and restarts to `CalicoFelix` and `CalicoNode`.
- Several manual-install paths did not match the extracted archive layout used in the article. Updated script and log paths under `C:\CalicoWindows\CalicoWindows`.
- The Kubernetes NetworkPolicy test allowed port 8080 while the IIS container exposes port 80. Updated the policy and test commands to port 80.
- The DNS egress namespace selector used a nonstandard `name: kube-system` namespace label. Changed it to Kubernetes' automatic `kubernetes.io/metadata.name: kube-system` label.
- The Calico GlobalNetworkPolicy selector used `kubernetes.io/os == "windows"`, which is a node label and is not automatically added to pods. Changed it to match the sample pod label `os == "windows"`.
- The Felix tuning example wrote an invalid standalone `felix.env` style file and would overwrite `config.ps1`. Changed it to append PowerShell environment assignments to the existing Calico Windows config file.

## Review Notes
The manual Windows service installation method is deprecated by Calico in favor of operator-managed Windows HostProcess containers. The post still includes manual commands, but they are now marked and configured consistently with the bundled v3.27.0 Windows package.
