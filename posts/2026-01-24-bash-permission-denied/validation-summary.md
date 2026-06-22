# Validation Summary: How to Fix 'Permission Denied' Script Execution Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Bash shell scripting
- Linux file permissions and chmod modes
- Linux filesystem mount options
- SELinux
- AppArmor
- POSIX ACLs
- Linux file attributes with chattr/lsattr

## Sources Consulted
- GNU Coreutils manual: File permissions and chmod behavior: https://www.gnu.org/s/coreutils/manual/html_node/File-permissions.html
- GNU Coreutils chmod documentation: https://www.gnu.org/software/coreutils/chmod
- GNU Coreutils df documentation: https://www.gnu.org/software/coreutils/df
- util-linux findmnt manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- Linux mount manual: https://man7.org/linux/man-pages/man8/mount.8.html
- Bash manual page: https://man7.org/linux/man-pages/man1/bash.1.html
- Linux getfacl manual: https://man7.org/linux/man-pages/man1/getfacl.1.html
- Linux setfacl manual: https://man7.org/linux/man-pages/man1/setfacl.1.html
- Linux chattr manual: https://man7.org/linux/man-pages/man1/chattr.1.html
- Red Hat SELinux documentation on file labels and restorecon/chcon: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-working_with_selinux-selinux_contexts_labeling_files
- Ubuntu AppArmor documentation: https://ubuntu.com/server/docs/how-to/security/apparmor/
- Local command help/man output for `chmod`, `df`, `findmnt`, `mount`, `setfacl`, `getfacl`, `chattr`, and GNU Bash 5.2.

## Issues Found
- `chmod +x` was described as adding execute permission for everyone. On GNU chmod, an omitted class is affected by umask for `+` operations, so this is not always equivalent to everyone. Changed the explicit everyone example to `chmod a+x myscript.sh`.
- The noexec section said the option prevents any script execution. This is too broad because direct execution from the filesystem is blocked, while invoking an interpreter to read a script can still work if the script is readable and the interpreter is executable elsewhere. Updated the wording to direct execution.
- The noexec diagnostic test created and ran `/tmp/test.sh`, which tests `/tmp`, not the filesystem containing `myscript.sh`. Changed it to create a temporary test script in the same directory as the target script.
- The noexec workaround recommended copying to `/tmp`, but the article itself notes `/tmp` is often mounted noexec on hardened systems. Changed the recommendation to copy to an exec-mounted location such as `$HOME/bin`.
- The troubleshooting script used `mount | grep` with a derived mount point, which is fragile for scripting and can fail with special characters or formatting changes. Replaced it with `findmnt -T "$script" -o TARGET,SOURCE,FSTYPE,OPTIONS`, matching util-linux guidance to use `findmnt` for robust mount inspection.
- The troubleshooting script could exit early under `set -e` when reading the shebang from an unreadable file. Wrapped the `head` command in an explicit failure check.
- The troubleshooting script used `which` for interpreter lookup. Replaced it with the shell builtin `command -v`, which is more appropriate in shell scripts.
- The immutable attribute explanation implied the attribute directly prevents execution setup in all cases. Clarified that it prevents permission changes or other modifications needed before execution.

## Review Notes
- The extracted troubleshooting script was validated with `bash -n`.
- SELinux examples are distribution and policy dependent; `restorecon` is generally safer than ad hoc `chcon`, and permanent relabeling usually requires policy/file-context configuration. The existing article already presents these as troubleshooting options rather than universal fixes.
- AppArmor profile-management commands such as `aa-complain` and `aa-disable` may require the relevant AppArmor utilities package on some distributions.
