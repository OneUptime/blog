# Validation Summary: How to Create and Manage Swap Files on Ubuntu (Not Swap Partitions)

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux swap files
- util-linux commands: `swapon`, `swapoff`, `mkswap`, `fallocate`
- `/etc/fstab`
- Linux VM sysctls: `vm.swappiness`, `vm.vfs_cache_pressure`
- Btrfs swap files
- Kubernetes node swap behavior

## Sources Consulted
- `swapon(8)` local man page from util-linux 2.39.3, also available at https://man7.org/linux/man-pages/man8/swapon.8.html
- `mkswap(8)` local man page from util-linux 2.39.3, also available at https://man7.org/linux/man-pages/man8/mkswap.8.html
- `fstab(5)` local man page from util-linux 2.39.3, also available at https://man7.org/linux/man-pages/man5/fstab.5.html
- `sysctl(8)` local man page from procps-ng, also available at https://man7.org/linux/man-pages/man8/sysctl.8.html
- Linux kernel documentation for `/proc/sys/vm`, including `swappiness` and `vfs_cache_pressure`: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html
- Btrfs manual, swapfile support: https://btrfs.readthedocs.io/en/latest/btrfs-man5.html#swapfile-support
- Kubernetes documentation, Swap memory management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Ubuntu Wiki swap file specification: https://wiki.ubuntu.com/FoundationsTeam/Specs/SwapFile

## Issues Found
- The multiple swap files section had swap priority semantics reversed. `swapon(8)` documents that higher priority numbers are higher priority. I changed the secondary swap example from priority `5` to `-3`, updated the sample output, and corrected the explanation.
- The swappiness section said the range was `0` to `100`. Current Linux kernel documentation defines `vm.swappiness` as `0` to `200`. I updated the range and revised the endpoint descriptions to match kernel documentation.
- The Btrfs guidance said Btrfs swap files must always use `dd` and not `fallocate`. Btrfs documentation allows properly prepared preallocated NODATACOW swap files and documents `fallocate` and `btrfs filesystem mkswapfile`. I narrowed the claim to say `dd` is a portable non-sparse allocation method after disabling copy-on-write.
- The Kubernetes note implied swap generally must be disabled because kubelet cannot account for it. Current Kubernetes documentation says Linux kubelet does not start with swap by default unless configured to tolerate swap, and Kubernetes has swap support modes, while scheduling still does not account for swap memory usage. I updated the note accordingly.

## Review Notes
The remaining commands and snippets are consistent with the checked man pages and documentation. Future improvements could mention `btrfs filesystem mkswapfile` for systems with btrfs-progs 6.1 or newer, but that was not required to keep the existing tutorial correct.
