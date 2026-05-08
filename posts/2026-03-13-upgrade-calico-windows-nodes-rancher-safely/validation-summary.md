# Validation Summary: How to Upgrade Calico on Windows Nodes with Rancher Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico for Windows
- Kubernetes
- Rancher
- RKE2
- Windows HostProcess containers
- PowerShell
- kubectl

## Sources Consulted
- Calico documentation: Install Calico for Windows manually - https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico documentation: Install using Operator for Windows HostProcess containers - https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- RKE2 documentation: Network Options - https://docs.rke2.io/networking/basic_network_options
- RKE2 documentation: Helm integration and HelmChartConfig - https://docs.rke2.io/add-ons/helm
- Rancher documentation: RKE2 Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher documentation: Upgrading and Rolling Back Kubernetes - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/upgrade-and-roll-back-kubernetes
- Rancher documentation: Launching Kubernetes on Windows Clusters - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Kubernetes documentation: kubectl command reference - https://kubernetes.io/docs/reference/kubectl/
- GitHub Project Calico releases - https://github.com/projectcalico/calico/releases

## Issues Found
- The post implied Rancher directly pins the Calico version from cluster creation. Updated the wording to reflect that RKE2 bundles CNI charts with each RKE2 release and Rancher stores RKE2 cluster configuration and chart values in the cluster configuration.
- The command `kubectl get configmap -n kube-system rke2-chart-values -o yaml | grep calico` was not supported by the official Rancher/RKE2 docs as a reliable way to inspect Calico chart state. Replaced it with commands to inspect the downstream `rke2-calico` HelmChart and Rancher-managed `clusters.provisioning.cattle.io` chart values.
- The post said Windows Calico components require manual steps in general. Updated it to specify that this applies to Windows nodes using the manual Calico for Windows installation, and noted that the operator-based Windows HostProcess container method is now preferred because the manual method is deprecated.
- The PowerShell example ran `C:\CalicoWindows\install-calico.ps1` without changing into the installation directory. Updated it to `cd C:\CalicoWindows` followed by `.\install-calico.ps1`, matching the Calico manual installation documentation.
- Added the documented caveat that the Windows installer initializes the vSwitch and can briefly disrupt connectivity, and that kubelet or kube-proxy may need restarting if already running.

## Review Notes
The Calico version in the Windows example is an example target version. In a real Rancher-managed RKE2 cluster, the target Calico version should be chosen to match the RKE2 release and Rancher-supported Kubernetes version being deployed. `kubectl` was not installed in the local workspace, so command help could not be checked locally; commands were reviewed against official documentation instead.
