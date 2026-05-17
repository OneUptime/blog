# Validation Summary: How to Check Talos Linux System Requirements Before Installation

## Status
validated

## Post Type
Guide / Reference (pre-installation checklist)

## Technologies Covered
- Talos Linux
- Kubernetes (etcd, kube-apiserver, kube-scheduler, kube-controller-manager, kubelet)
- talosctl CLI
- KubeSpan (Wireguard)
- UEFI / Legacy BIOS
- CPU architectures (amd64/x86_64, arm64/aarch64)
- Hypervisors (VMware, Proxmox, QEMU/KVM, VirtualBox, Hyper-V)
- Linux `dd` and `uname` utilities, macOS `arch`

## Sources Consulted
- Talos Linux system requirements: https://www.talos.dev/v1.7/introduction/system-requirements/
- Talos Linux network connectivity / firewall rules: https://www.talos.dev/v1.7/learn-more/networking-resources/
- Talos Linux KubeSpan docs: https://www.talos.dev/v1.7/talos-guides/network/kubespan/
- Talos disk management / partitions: https://www.talos.dev/v1.7/talos-guides/configuration/disk-management/
- Kubernetes etcd hardware recommendations: https://etcd.io/docs/v3.5/op-guide/hardware/
- Kubernetes ports and protocols: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- WireGuard default port reference (51820/UDP)
- `talosctl disks` reference: https://www.talos.dev/v1.7/reference/cli/

## Issues Found
- **KubeSpan Wireguard port was incorrect.** The post listed port `51871/UDP` for KubeSpan Wireguard. The actual default port used by Talos KubeSpan is `51820/UDP` (the standard Wireguard port). Updated the inter-node ports table to use `51820`.

## Review Notes
- Hardware minimums (2 CPU/2 GB RAM for control plane, 1 CPU/1 GB RAM for workers, 10 GB disk) align with the official Talos system requirements page.
- The Kubernetes secure component ports `10257` (kube-controller-manager) and `10259` (kube-scheduler) are correct for current Kubernetes versions; older ports (10251/10252) are deprecated and unused on Talos.
- The etcd IOPS guidance ("50 sequential IOPS minimum, 500+ better") is a reasonable paraphrase of etcd hardware recommendations, though the etcd docs themselves emphasize fsync latency over a single IOPS number; the current wording is not misleading.
- The `dd if=/dev/zero of=/tmp/testfile bs=1M count=1024 oflag=dsync` command is GNU-coreutils-specific (`oflag=dsync`) but appropriate since the surrounding text says "on an existing Linux system."
- The `talosctl disks --insecure --nodes <ip>` invocation works in maintenance mode; the `--insecure` flag is required pre-bootstrap since PKI is not yet established.
- Disk partition sizes listed (EFI ~100 MB, BIOS Boot ~1 MB, Boot ~1 GB, META ~1 MB, STATE ~100 MB, EPHEMERAL = remainder) are consistent with Talos's current partition layout.
- macOS `arch` returning `i386` on Intel Macs is correct (it returns `i386` for backwards compatibility even on 64-bit Intel) and `arm64` on Apple Silicon.
- No version pinning in the post; recommendations remain accurate for Talos 1.7+. If Talos's defaults change in the future (especially around Secure Boot or KubeSpan), this post may need a refresh.
