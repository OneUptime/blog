# Validation Summary: How to Test Network Policies with Calico on Windows Nodes with Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- Calico for Windows
- Rancher Manager
- Windows containers
- kubectl
- BusyBox

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Windows containers documentation: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Rancher projects and namespaces documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher namespaces documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-namespaces
- BusyBox wget help output from BusyBox v1.36.1

## Issues Found
- The test used `wget --timeout`, but the `busybox` image normally provides BusyBox `wget`, whose timeout option is `-T SEC`. Changed both test commands to use `-T 10` and `-T 5`.
- The Windows workload used a Windows Server 2019 IIS image without stating the required host/image OS version compatibility. Updated the example image to `windowsservercore-ltsc2022` and added a prerequisite that the Windows node OS version must match the image tag.
- The NetworkPolicy allowed all ports from the allowed client because it had no `ports` clause. Added explicit `policyTypes: Ingress` and limited the allow rule to TCP port 80, matching the IIS test.
- The workload test commands executed immediately after pod creation, which could fail before pods became Ready. Added a `kubectl wait --for=condition=Ready` command for the test pods.
- The initial policy listing command used `grep -v "<none>"`, but `kubectl get networkpolicies -A` does not need that filter. Removed the filter so the command accurately lists all NetworkPolicy resources.

## Review Notes
- The post's core claim is correct: Rancher management does not change Kubernetes NetworkPolicy semantics, while Rancher projects and project network isolation can affect the policy baseline.
- Current Calico for Windows documentation still requires a hybrid Linux/Windows cluster because Kubernetes and Calico control components do not run on Windows.
- Calico for Windows has Windows-specific limitations, including policy programming cost for selector-heavy policies and older Windows 1809 behavior around Service ClusterIPs. The post's direct Pod IP test avoids Service rewrite ambiguity.
