# Validation Summary: Monitor Mixed Linux and Windows Networking with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico CNI (v3.23+) for Kubernetes
- Calico for Windows (calico-node-windows DaemonSet)
- Kubernetes (mixed Linux + Windows Server 2019+ node clusters)
- Windows Host Network Service (HNS) and PowerShell HNS cmdlets
- VXLAN overlay networking
- kubectl, calicoctl CLIs
- Calico GlobalNetworkPolicy (projectcalico.org/v3)
- Kubernetes CronJob (batch/v1)
- PowerShell Test-NetConnection

## Sources Consulted
- Calico for Windows documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy rule schema (entityRule/ports): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Microsoft HNS PowerShell module (Get-HNSNetwork, Get-HNSEndpoint): https://learn.microsoft.com/en-us/virtualization/windowscontainers/kubernetes/network-topologies
- Microsoft Test-NetConnection cmdlet docs: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Kubernetes CronJob (batch/v1 GA in 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Microsoft Windows container base images (mcr.microsoft.com/windows/servercore:ltsc2019)
- curlimages/curl on Docker Hub: https://hub.docker.com/r/curlimages/curl

## Issues Found
No technical issues found.

Verifications performed:
- The claim that Windows uses HNS while Linux uses netfilter/iptables (or eBPF) is accurate; eBPF dataplane is Linux-only.
- The `calico-system` namespace and `k8s-app=calico-node` / `k8s-app=calico-node-windows` labels match the Tigera operator-managed Calico install.
- The `Get-HNSNetwork` and `Get-HNSEndpoint` PowerShell cmdlets are correct and available inside calico-node-windows host-process containers.
- The `GlobalNetworkPolicy` schema with `apiVersion: projectcalico.org/v3`, `selector`, `order`, `types`, and ingress/egress rules with nested `source`/`destination` `selector` + `ports` is valid Calico v3 syntax.
- `apiVersion: batch/v1` for CronJob is the GA version since Kubernetes 1.21.
- The kubectl `custom-columns` syntax with backslash line continuations resolves to a single comma-separated specification (valid).
- `mcr.microsoft.com/windows/servercore:ltsc2019` and `curlimages/curl` are valid, published container images.

## Review Notes
- The post lists `Calico v3.23+` and `calicoctl v3.27+`. Calico Windows actually went GA earlier (v3.21 for HostProcess-based deployment via Tigera operator), so the version floors are conservative but not incorrect. Future revisions might mention current versions (Calico v3.28+ as of 2026).
- The `Get-HNSNetwork` / `Get-HNSEndpoint` cmdlets rely on the HNS PowerShell module being present in the calico-node-windows container — this is the case for the calico-node-windows hostprocess container, but readers running these against arbitrary Windows pods may need to import the module first.
- Windows Server 2019 (ltsc2019) is end-of-mainstream-support; readers running newer clusters may prefer `ltsc2022` images on Windows Server 2022 nodes. Not technically wrong as written.
- Tag list contains `Window` (likely intended `Windows`) — left untouched as the task scope is technical accuracy of code/commands, not metadata.
