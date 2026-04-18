# Validation Summary: How to Configure Windows Networking in Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Rancher (RKE)
- Kubernetes on Windows
- Flannel CNI (VXLAN backend)
- Calico, Antrea, Cilium (comparison)
- kube-proxy (winkernel / HNS)
- PowerShell
- Kubernetes NetworkPolicy
- Kubernetes Services (ClusterIP, NodePort, LoadBalancer)
- CoreDNS / cluster DNS

## Sources Consulted
- Kubernetes Windows networking overview: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes guide on Windows containers: https://kubernetes.io/docs/concepts/windows/intro/
- kube-proxy proxy modes (winkernel/kernelspace vs userspace): https://kubernetes.io/docs/reference/networking/virtual-ips/
- Flannel configuration and VXLAN backend (port 8472): https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- RKE network plugin options (flannel_backend_type / flannel_backend_port): https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- Antrea Windows support: https://antrea.io/docs/main/docs/windows/
- Calico Windows dataplane (not eBPF on Windows): https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/
- Cilium Linux-only (eBPF requires Linux kernel): https://docs.cilium.io/
- Windows NetworkPolicy limitations: https://kubernetes.io/docs/concepts/services-networking/windows-networking/#limitations

## Issues Found
- **kube-proxy mode was incorrectly described as "user-space mode"**. Windows kube-proxy actually runs in **kernelspace mode (winkernel)**, using the Windows Host Network Service (HNS). Userspace mode is the deprecated original Linux implementation and is not what Windows uses. Updated the Step 3 introductory sentence to say "kernelspace mode (winkernel), which uses the Host Network Service (HNS)".

## Review Notes
- The CNI comparison table labels the Calico row as "Calico (eBPF)" with "Partial" support. The eBPF dataplane for Calico is Linux-only; Calico's Windows dataplane uses VXLAN/HNS, not eBPF. The entry is technically defensible as written (eBPF has no Windows support), but it understates the Windows support of standard Calico (non-eBPF). Left as-is since the table is already directionally correct and the post explicitly recommends Flannel VXLAN.
- The NetworkPolicy egress claim ("Not supported natively (requires Antrea)") is a reasonable simplification. Egress NetworkPolicy support on Windows is CNI-dependent; Antrea and Calico for Windows offer the most complete coverage. Left as-is.
- The commented-out reference to `C:\k\kubelet.exe.config` is unusual — kubelet on Windows is a Go binary, not a .NET executable, and typically uses a YAML config via `--config`. Because the line is commented out and presented only as an investigative hint, it does not mislead the reader into running a broken command.
- `flannel_backend_port: "8472"` is correct — 8472/UDP is the standard VXLAN port used by Flannel.
- PowerShell cmdlets (`Get-Service`, `Get-NetAdapter`, `Resolve-DnsName`, `Get-Item`) are all valid and current.
