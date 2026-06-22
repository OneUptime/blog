# Validation Summary: How to Fix 'Permission Denied' Errors in Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux discretionary file permissions
- GNU coreutils (`chmod`, `chown`, `ls`)
- util-linux (`namei`, `mount`, `findmnt`, `/etc/fstab`)
- POSIX ACL tools (`getfacl`, `setfacl`)
- SELinux
- AppArmor
- OpenSSH file permission requirements

## Sources Consulted
- GNU Coreutils manual for `chmod`: https://www.gnu.org/software/coreutils/manual/coreutils.html
- GNU `chmod(1)` manual page: https://manpages.debian.org/testing/coreutils/chmod.1.en.html
- util-linux `namei(1)` manual page: https://man7.org/linux/man-pages/man1/namei.1.html
- util-linux `mount(8)` manual page: https://man7.org/linux/man-pages/man8/mount.8.html
- `fstab(5)` manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- `setfacl(1)` manual page: https://man7.org/linux/man-pages/man1/setfacl.1.html
- `getfacl(1)` manual page: https://man7.org/linux/man-pages/man1/getfacl.1.html
- Red Hat Enterprise Linux SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/index
- `audit2allow(1)` manual page: https://man7.org/linux/man-pages/man1/audit2allow.1.html
- AppArmor `aa-status(8)` manual page: https://manpages.ubuntu.com/manpages/focal/man8/aa-status.8.html
- AppArmor `apparmor_parser` manual page: https://apparmor.net/man/master/apparmor_parser/
- OpenSSH `sshd(8)` manual page for `~/.ssh` and `authorized_keys` permissions: https://man.openbsd.org/sshd

## Issues Found
- The quick diagnosis section described `namei -l` as checking effective permissions for the current user. `namei -l` shows long-format mode and owner information for each pathname component, so the wording was changed to "Check permissions along the path."
- The permissions table said directory write permission means "Create/delete files." Directory creation and deletion also require execute/search permission on the directory, so the directory effect was clarified to "Create/delete entries (with execute)."
- The recursive `chmod -R o+rX` note said capital `X` only adds execute to directories. GNU `chmod` applies `X` to directories and to files that already have execute permission for at least one user, so the note was corrected.
- The sticky bit description said only the owner can delete files. On directories, the restricted deletion flag permits deletion or renaming by the file owner, directory owner, or a privileged user, so the description was corrected.
- The ACL section used `mount | grep acl` as a support check. Modern Linux filesystems often support ACLs without an explicit `acl` mount option, so this was replaced with a `findmnt` command that shows the relevant filesystem and mount options before using `getfacl`.

## Review Notes
The remaining commands and examples are technically valid as general Linux administration guidance. Some commands are distribution-package dependent (`sealert`, `audit2allow`, `aa-complain`, `aa-disable`) and may require installing the relevant SELinux or AppArmor utility packages, but the command usage itself is current.
