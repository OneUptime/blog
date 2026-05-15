# Validation Summary: How to Determine the Right Swap Size for Your RHEL System

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap space
- Linux kernel virtual memory sysctls
- LVM2
- sysstat `sar`
- systemd
- Kubernetes node swap behavior

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Linux kernel documentation, "Overcommit Accounting": https://docs.kernel.org/mm/overcommit-accounting.html
- Linux kernel documentation, "/proc/sys/vm" sysctl reference: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Kubernetes documentation, "Linux Node Swap Behaviors": https://kubernetes.io/docs/reference/node/swap-behavior/
- Local command help/man pages for `sar`, `free`, `journalctl`, `swapon`, and `mkswap`

## Issues Found
- The RHEL recommendation table used older/less precise wording for the first and last RAM ranges. Updated the first row to "Less than 2 GB" and the greater-than-64 GB row to "Workload dependent (at least 4 GB)" to match current RHEL 9 documentation.
- The strict overcommit explanation implied the commit limit is always based only on `overcommit_ratio`. Updated it to include `overcommit_kbytes`, which Linux can use instead of `overcommit_ratio`.
- The `sar` peak swap command printed a fixed field that can be the percentage-used column rather than used swap, depending on output format. Updated the command to extract `kbswpused` more reliably and label the output as KB.
- The swap creation snippets edited `/etc/fstab` but omitted `systemctl daemon-reload`. Added the reload step documented by Red Hat after registering new swap entries.
- The summary said hibernating systems need swap equal to RAM. Updated it to say at least equal to RAM, and often more depending on RAM size, consistent with the RHEL recommendation table.

## Review Notes
The workload-specific swap and swappiness values are reasonable operational starting points rather than vendor-mandated values. Kubernetes swap behavior is version- and kubelet-configuration-dependent; the post now keeps the recommendation conservative by saying Kubernetes nodes typically run without swap unless swap support is explicitly configured.
