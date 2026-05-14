# Validation Summary: Mounting BPF Filesystem with systemd for Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF and bpffs
- systemd mount units
- Linux fstab
- cloud-init

## Sources Consulted
- Cilium system requirements, mounted eBPF filesystem - https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes configuration, Mounting BPFFS with systemd - https://docs.cilium.io/en/latest/network/kubernetes/configuration/#mounting-bpffs-with-systemd
- Cilium command reference: `cilium-dbg bpf ct list` - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium command reference: `cilium-dbg bpf fs` - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_fs.html
- Linux kernel documentation: BPF maps - https://docs.kernel.org/bpf/maps.html
- systemd.mount manual - https://man7.org/linux/man-pages/man5/systemd.mount.5.html
- fstab manual - https://man7.org/linux/man-pages/man5/fstab.5.html
- Kubernetes `kubectl debug` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The description said eBPF maps survive node reboots. bpffs is a pseudo-filesystem used to pin BPF objects across process restarts, but its contents do not persist across a node reboot. Updated the wording to say the bpffs mount is available after reboot.
- The introduction said Cilium fails whenever bpffs is not mounted at startup. Current Cilium documentation states that Cilium automatically mounts bpffs if it is missing, while warning about disruption when automatic mounting is disabled or blocked. Adjusted the claim to match that behavior.
- The post described Cilium's own bpffs mounting as an init-container-only behavior. Current Cilium documentation describes automatic mounting by Cilium more generally. Reworded the paragraph to avoid tying the behavior to a specific init container.
- The kernel support check used `CONFIG_BPF_SYSCALL`, which verifies the BPF syscall but not bpffs support. Changed the check to `CONFIG_BPF_FS`, and used `zgrep` for `/proc/config.gz`.
- The troubleshooting section suggested `modprobe bpf` for `unknown filesystem type 'bpf'`. bpffs support is controlled by the kernel's `CONFIG_BPF_FS`; there is not generally a `bpf` filesystem module to load. Replaced the command with a kernel config check.
- The validation command used `cilium bpf ct list global`, but current Cilium command references document `cilium-dbg bpf ct list` and do not include the `global` argument. Updated the command and clarified that it reads BPF maps rather than creating them.
- The `kubectl debug node` loop checked `/sys/fs/bpf` directly. Kubernetes node debug pods expose the host filesystem under `/host`, so the command now uses `chroot /host mountpoint /sys/fs/bpf`.
- The conclusion overstated that the unit guarantees bpffs is mounted before all container runtime and Kubernetes components. Reworded it to the narrower, documented benefit that bpffs is available after node boot.

## Review Notes
The systemd mount unit in the post matches the Cilium documentation for mounting BPFFS with systemd. Some distributions mount bpffs automatically, and Cilium may also auto-mount it unless that behavior is disabled, so systemd mounting is best framed as a provisioning hardening step rather than the only valid way to run Cilium.
