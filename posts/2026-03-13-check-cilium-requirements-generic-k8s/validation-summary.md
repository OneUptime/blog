# Validation Summary: Checking Cilium Requirements for Generic Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kubeadm
- k3s
- RKE2
- Linux kernel
- eBPF
- bpffs
- CNI
- kube-proxy
- iptables
- VXLAN

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Quick Installation: https://docs.cilium.io/en/latest/gettingstarted/k8s-install-default/
- Cilium Adjusting CNI Configuration: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium CNI Chaining: https://docs.cilium.io/en/stable/installation/cni-chaining.html

## Issues Found
- The kernel minimum was outdated. Current Cilium documentation lists Linux kernel 5.10 or later, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, as the baseline for current releases. Updated the kernel comments and checklist.
- The feature-specific kernel note implied that BPF host routing and WireGuard generally require kernel 5.15 or later. Replaced it with a narrower note that some features have newer requirements, such as BIG TCP on 6.8 or later.
- The kernel configuration command assumed `/proc/config.gz` exists on every node. Updated it to fall back to `/boot/config-$(uname -r)` and added additional BPF-related kernel options from Cilium's system requirements.
- The bpffs section implied manual mounting is always required. Current Cilium documentation states Cilium can mount bpffs automatically, while persistent pre-mounting is optional. Updated the wording and fstab entry to match the documented `bpffs /sys/fs/bpf bpf defaults 0 0` format.
- The CNI section said all other CNI configs must be removed before installation. That is true for a normal exclusive Cilium install but not for supported CNI chaining modes. Added the chaining caveat and changed destructive removal commands to move files aside.
- The kube-proxy section used the older "strict kube-proxy replacement" terminology and omitted the documented configmap deletion and iptables cleanup. Updated it to describe full kube-proxy replacement and include the official cleanup commands.
- The Pod CIDR check printed columns from `kubectl get nodes -o wide` with `awk`, which is brittle because column positions can vary. Replaced it with an explicit `custom-columns` query for node names, PodCIDRs, and InternalIPs.
- The UDP port check treated `nc -zu` as a definitive open-port check. UDP probing with netcat is not definitive without an application response, so the text now says to validate firewall rules separately.

## Review Notes
The post is technically relevant and now aligns with current Cilium stable documentation as of May 14, 2026. Some checks remain environment-dependent: kube-proxy may not be deployed as a DaemonSet on every distribution, `/boot/config-$(uname -r)` may not exist on every Linux image, and Cilium port requirements vary by enabled features such as Hubble, WireGuard, IPsec, or direct routing.
