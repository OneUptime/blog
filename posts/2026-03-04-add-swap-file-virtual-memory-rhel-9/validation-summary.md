# Validation Summary: How to Add a Swap File to RHEL for Additional Virtual Memory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap files and swap priorities
- `/etc/fstab`
- `dd`, `fallocate`, `mkswap`, `swapon`, `swapoff`, `free`, `filefrag`
- systemd swap activation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Linux `swapon(8)` manual page from man7.org: https://man7.org/linux/man-pages/man8/swapon.8.html
- Local command help for `swapon`, `mkswap`, `free`, `dd`, and `filefrag`

## Issues Found
- The post said swap files work on any filesystem. I changed this to common RHEL filesystems such as XFS and ext4 because swap files have filesystem restrictions, especially around sparse files and copy-on-write filesystems.
- The post warned not to use `fallocate` on XFS and said `mkswap` would reject the result. I corrected this for RHEL 9: Red Hat documents `fallocate` as preferable on modern filesystems such as XFS and ext4, while `dd` remains the portable method; files with holes are rejected by `swapon`, not generally by `mkswap`.
- The hibernation sizing statement understated RHEL guidance. I changed it to refer readers to RHEL's hibernation swap guidance, which can require more than RAM and does not recommend hibernation above 64 GiB RAM.
- The resizing wording said a swap file cannot be resized in place. I changed this to the precise requirement that it cannot be resized while active.
- The fstab edit examples did not refresh systemd's generated units. I added `systemctl daemon-reload` after fstab changes, matching Red Hat's procedure.
- The fragmentation check described `filefrag` as ext4-only. I removed that qualifier because `filefrag` is not limited to ext4.

## Review Notes
The remaining commands and fstab examples are syntactically valid for the documented workflow. `fallocate` is appropriate for RHEL 9 on XFS/ext4, but `dd` remains a conservative fallback when filesystem support is uncertain.
