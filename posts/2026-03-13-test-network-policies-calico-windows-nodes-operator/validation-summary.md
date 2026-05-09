# Validation Summary: How to Test Network Policies with Calico on Windows Nodes with the Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes NetworkPolicy
- Kubernetes Windows nodes
- kubectl
- Windows Host Networking Service (HNS)
- BusyBox wget

## Sources Consulted
- Calico documentation: Install Calico for Windows using the Tigera Operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Troubleshoot Calico for Windows: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Calico documentation: Limitations and known issues for Calico for Windows: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Guide for running Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Microsoft Learn: Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Local BusyBox 1.36.1 `wget --help` output for the `busybox` image command syntax.

## Issues Found
- The tag list used `Window` instead of `Windows`. Changed it to `Windows`.
- The Windows IIS pod used an `ltsc2019` image without pinning the workload to a matching Windows node build. Kubernetes documents strict Windows host/container OS compatibility. Added `spec.os.name: windows`, a `node.kubernetes.io/windows-build: "10.0.17763"` selector for the `ltsc2019` image, and a note for Windows Server 2022 nodes.
- The Linux BusyBox client pods were not pinned to Linux nodes. In a mixed Linux/Windows cluster, Kubernetes recommends using node selectors or taints/tolerations to keep OS-specific workloads on compatible nodes. Added Linux `nodeSelector` overrides to both `kubectl run` commands.
- The BusyBox `wget` commands used `--timeout`, which is not supported by the BusyBox 1.36.1 `wget` available in the local environment. Changed the commands to use `-T`.
- The HNS verification command used `Get-HnsPolicyList` without importing the Calico HNS helper module and could miss endpoint-attached ACL policies. Updated it to import `C:\CalicoWindows\libs\hns\hns.psm1` and inspect `Get-HNSEndpoint` output with sufficient JSON depth.

## Review Notes
The Kubernetes NetworkPolicy YAML is syntactically valid and correctly uses same-namespace `podSelector` rules for the allowed Linux client. The article tests direct pod-IP connectivity; future revisions could add an explicit note that Service ClusterIP paths on Windows may have additional kube-proxy/source NAT caveats depending on Windows build and network mode.
