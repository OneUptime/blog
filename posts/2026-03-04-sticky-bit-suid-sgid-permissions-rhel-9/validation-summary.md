# Validation Summary: How to Configure Sticky Bit, SUID, and SGID Permissions on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux file permissions
- SUID, SGID, and sticky bit permissions
- GNU coreutils `chmod`
- GNU findutils `find`
- SELinux interaction with setuid applications

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Managing file system permissions": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/managing-file-system-permissions_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Customer Portal, "Why Are Certain Binaries SUID (4000) by Default in RHEL 7, 8, and 9?": https://access.redhat.com/solutions/7128425
- Red Hat Customer Portal, "How to make setuid / suid shell scripts work the way setuid binaries work?": https://access.redhat.com/solutions/124693
- GNU coreutils `chmod(1)` manual: https://www.man7.org/linux/man-pages/man1/chmod.1.html
- GNU findutils manual, `find` file mode bits and `-perm`: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Local `chmod(1)` and `find --help` output on the review system

## Issues Found
- The sticky bit description said only the file owner can delete files. GNU `chmod(1)` documents the directory sticky bit as allowing removal or rename by the file owner or directory owner, with privileged users also able to bypass normal permission checks. Updated the table and sticky bit section to describe unprivileged-user behavior accurately.
- The SUID examples were presented as a default RHEL list and implied that files outside the short list are abnormal. Red Hat documents additional SUID binaries that can be expected on RHEL 7, 8, and 9 depending on installed packages. Expanded the examples and clarified that the exact list depends on the installed package set.

## Review Notes
The `chmod` symbolic and octal examples are valid. The `find / -xdev -type ... -perm -MODE` audit commands are valid GNU findutils syntax and correctly match files or directories with the specified special bit set. The note that Linux does not honor SUID on shell scripts is consistent with Red Hat guidance for RHEL 4 through RHEL 9.
