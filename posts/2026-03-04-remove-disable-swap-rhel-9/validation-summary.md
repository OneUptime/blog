# Validation Summary: How to Remove and Disable Swap on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap
- `/etc/fstab`
- systemd swap units
- LVM
- XFS
- Kubernetes kubelet swap behavior

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices/
- Red Hat Enterprise Linux 9 Managing file systems, "Increasing the size of an XFS file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- systemd.swap manual: https://www.freedesktop.org/software/systemd/man/systemd.swap.html
- Kubernetes documentation, "Swap memory management": https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Local command help for `swapoff`, `swapon`, and `systemctl`

## Issues Found
- The post stated that Kubernetes requires swap to be off on worker nodes. Current Kubernetes documentation says the Linux kubelet does not start with swap enabled by default, but swap can be used when `failSwapOn` and `memorySwap` behavior are configured. Updated the wording to reflect the default behavior and the configurable exception.
- The post recommended masking `swap.target` as a standard persistence step. Red Hat documents reloading systemd after changing `/etc/fstab`, and systemd documents that fstab entries are converted into generated swap units. Replaced the target masking guidance with `systemctl daemon-reload` and kept individual unit masking only for swap units configured outside `/etc/fstab`.
- The `sed` examples matched any line containing `swap`, including already-commented lines and unrelated comments. Updated them to target uncommented fstab swap entries when disabling swap, and commented fstab swap entries when re-enabling it.
- The re-enable example recreated `/etc/fstab` entries but did not reload systemd afterward. Added `systemctl daemon-reload` before `swapon -a`.

## Review Notes
The LVM, swap file, `swapoff`, `swapon`, and XFS growth commands are broadly correct for the RHEL 9 assumptions in the article. Future improvements could mention that `xfs_growfs /` applies only when the target filesystem is XFS, which is the RHEL 9 default but not guaranteed on every installation.
