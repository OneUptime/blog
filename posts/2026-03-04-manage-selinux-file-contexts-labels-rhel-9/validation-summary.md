# Validation Summary: How to Manage SELinux File Contexts and Labels on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux file contexts and labels
- `ls -Z`, `stat`, `chcon`, `semanage fcontext`, `restorecon`, and `matchpathcon`
- Apache HTTP Server SELinux content types

## Sources Consulted
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- GNU Coreutils `ls` help for `-Z` / `--context`: local `ls --help`
- GNU Coreutils `stat` help for SELinux context output: local `stat --help`
- GNU Coreutils `chcon` help for `-t`, `-R`, and `--reference`: local `chcon --help`
- Linux man-pages project `restorecon(8)`: https://man7.org/linux/man-pages/man8/restorecon.8.html

## Issues Found
- The context field explanation said the SELinux role is "always object_r for files." This is too absolute. I changed it to "normally object_r for files" to match the usual RHEL file-object context without overstating SELinux policy behavior.
- The common type table described `nfs_t` as "NFS exported files." In RHEL documentation, `nfs_t` is the default type for NFS-mounted files or volumes on the client side. I changed the description to "NFS-mounted files on the client side."
- The context inheritance section said new files inherit the context of the parent directory. Red Hat documentation describes inherited types in common locations such as `/srv`, but SELinux policy can also define type transitions. I changed this to "usually get a type based on their parent directory, unless a policy transition rule applies."

## Review Notes
The main workflow is technically correct for RHEL 9: use `semanage fcontext` for persistent file-context mappings, `restorecon` to apply policy-defined labels, `chcon` only for direct temporary label changes, and `matchpathcon -V` / `restorecon -Rvn` for troubleshooting. The commands are appropriate, but systems may need the `policycoreutils-python-utils` package installed before `semanage` is available.
