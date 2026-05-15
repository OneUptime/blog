# Validation Summary: How to Relabel the Entire Filesystem for SELinux on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux
- SELinux filesystem labels and contexts
- `fixfiles`
- `restorecon`
- `matchpathcon`
- `semanage fcontext`
- `ausearch` and `sealert`

## Sources Consulted
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- SELinux Project `fixfiles(8)` manual page: https://man7.org/linux/man-pages/man8/fixfiles.8.html
- SELinux Project `restorecon(8)` manual page: https://man7.org/linux/man-pages/man8/restorecon.8.html
- Red Hat Enterprise Linux 7 SELinux User's and Administrator's Guide, persistent `semanage fcontext` changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/htmlsingle/selinux_users_and_administrators_guide/sect-managing_confined_services-concurrent_versioning_system-types

## Issues Found
- The post described `fixfiles -F` as forcing a relabel even when policy had not changed and suggested `fixfiles` might otherwise skip relabeling based on policy version. The `fixfiles(8)` manual defines `-F` as forcing reset of customizable file contexts. Updated the explanation accordingly.
- The `fixfiles onboot` example did not include `-F`, while Red Hat's RHEL 9 SELinux documentation recommends `fixfiles -F onboot` when ensuring relabeling after SELinux was previously disabled. Updated the command and added the permissive-mode caveat.
- The post said `.autorelabel` relabels every file on every mounted filesystem. The `fixfiles(8)` manual describes relabeling supported local filesystems and excludes filesystems with a security context mount option. Updated the wording to avoid overclaiming.

## Review Notes
The remaining commands and examples are technically consistent with Red Hat SELinux guidance and SELinux userspace manual pages. In production documentation, it may be useful to mention planned maintenance windows and backups before full-system relabeling, but that is operational guidance rather than a correctness issue.
