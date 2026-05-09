# Validation Summary: How to Test Network Policies with Calico on Windows Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico for Windows
- Kubernetes NetworkPolicy
- Kubernetes Windows Pods
- Windows Host Networking Service (HNS)
- kubectl
- BusyBox wget
- PowerShell

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Networking on Windows documentation: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Microsoft Get-HnsPolicyList PowerShell reference: https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/get-hnspolicylist
- Microsoft Windows container OS version guidance: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/upgrade-windows-containers
- BusyBox wget help output from local BusyBox 1.36.1

## Issues Found
- The Windows pod examples did not set `spec.os.name`. Kubernetes documentation says this field should be set to `windows` for Windows container Pods, so both Windows Pod manifests were updated.
- The Windows container images used LTSC 2019 tags. Current Kubernetes Windows documentation lists Windows Server 2022 and 2025 as supported Windows node operating systems, and Microsoft documents matching Windows container images to the host OS version. The examples were updated to LTSC 2022 tags.
- The BusyBox `wget` examples used `--timeout=5`, which is not available in the local BusyBox 1.36.1 help output. The examples were changed to the portable BusyBox `-T 5` read-timeout flag.
- The Windows-to-Windows test did not state the expected result. Under the shown policy, Windows client traffic to the Windows server should be denied because only pods labeled `os: linux` are allowed as ingress sources. A sentence was added to state that expected failure.
- The introduction described certain `GlobalNetworkPolicy` selectors as unsupported. Calico documents host endpoint policy as unsupported on Windows, but selector-heavy policies as a Windows dataplane resource concern. The sentence was corrected to match that distinction.
- The conclusion said the guide tested cross-OS traffic "vice versa", but the steps only test Linux-to-Windows plus Windows-to-Windows denial. The conclusion was adjusted to avoid claiming an unshown Windows-to-Linux test.

## Review Notes
- The NetworkPolicy YAML uses the current `networking.k8s.io/v1` API and valid selector fields.
- The HNS verification command uses the documented `Get-HnsPolicyList` cmdlet, but the exact shape of returned policy objects can vary by Windows and CNI implementation.
