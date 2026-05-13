# Validation Summary: How to Install Calico on Windows Nodes with the Operator Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes Windows nodes
- Windows HostProcess containers
- Kubernetes DaemonSets
- containerd
- kube-proxy
- Windows Server 2019 and 2022

## Sources Consulted
- Calico Open Source documentation: Install Calico for Windows using the operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico Open Source documentation: Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico Open Source documentation: Installation API reference for `windowsDataplane`, `serviceCIDRs`, and `calico-node-windows`: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes documentation: Create a Windows HostProcess Pod: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes documentation: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/

## Issues Found
1. **Metadata typo**: The tags used `Window` instead of `Windows`. Updated the tag to the correct platform name.
2. **Missing operator install prerequisites**: The prerequisites did not mention Calico v3.27+, Kubernetes v1.22+, HostProcess requirements, supported Windows Server build requirements, or containerd v1.6+. Added these requirements based on the Calico for Windows documentation.
3. **Incomplete Installation CR configuration**: The original patch replaced the IP pool with a hard-coded `192.168.0.0/16` pool and omitted required operator-install settings. Replaced it with source-backed steps for strict IPAM affinity, VXLAN encapsulation, disabling BGP for VXLAN, setting `serviceCIDRs`, and enabling `windowsDataplane: HNS`.
4. **Missing Kubernetes API server endpoint setup**: The operator installation flow requires the API server host and port to be available to Calico for Windows unless already provided by an existing kubeconfig. Added the `kubernetes-services-endpoint` ConfigMap step.
5. **Missing kube-proxy requirement**: The guide did not mention that kube-proxy must run on Windows nodes unless the platform already provides it. Added the official HostProcess kube-proxy DaemonSet command with a matching Kubernetes version placeholder.
6. **Overstated automatic detection behavior**: The post implied the operator deploys the Windows DaemonSet merely by detecting Windows nodes. Updated the wording to state that the DaemonSet is rendered after `windowsDataplane` is set to `HNS`.
7. **Weak networking test**: The test pod only pinged `127.0.0.1`, which does not validate pod networking. Replaced it with a Windows Server Core pod that checks connectivity to the Kubernetes service DNS name on port 443 and noted that the image tag must match the Windows node OS version.

## Review Notes
- The guide now targets the current operator-managed HostProcess installation path. Manual Calico for Windows installation is deprecated in the Calico documentation.
- The VXLAN patch assumes there is one operator-managed IP pool at `/spec/calicoNetwork/ipPools/0`, matching the official example. Clusters with multiple pools should review pool selection before applying the command.
