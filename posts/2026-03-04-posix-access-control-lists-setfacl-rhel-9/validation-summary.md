# Validation Summary: How to Configure POSIX Access Control Lists with setfacl on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux POSIX ACLs
- setfacl
- getfacl
- GNU coreutils cp
- rsync ACL preservation
- XFS and ext4 filesystems

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing the Access Control List": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index#managing-the-access-control-list
- Linux acl(5) manual page, ACL mask and access check algorithm: https://man7.org/linux/man-pages/man5/acl.5.html
- Linux setfacl(1) manual page, options and ACL entry formats: https://man7.org/linux/man-pages/man1/setfacl.1.html
- Linux getfacl(1) manual page, output format and `--skip-base`: https://man7.org/linux/man-pages/man1/getfacl.1.html
- GNU coreutils manual, `cp` invocation and ACL preservation: https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html
- Local system manual pages for `acl(5)`, `setfacl(1)`, and `getfacl(1)`.

## Issues Found
- The ACL permission flow diagram checked the owning group before named group ACLs as separate sequential branches. Linux ACL checks group membership against the owning group and all matching named group entries together, then grants access if the mask and any matching group entry contain the requested permissions. Updated the Mermaid diagram to reflect the actual group matching behavior.
- The command for finding files with ACLs used `grep "user:"`, which also matches the required base `user::` entry on files without extended ACLs. Replaced it with `getfacl -R -s /opt 2>/dev/null`, using `getfacl --skip-base` to skip files that only have owner, group, and other ACL entries.

## Review Notes
Most command examples and explanations match the documented behavior of `setfacl`, `getfacl`, ACL masks, recursive ACL operations, backup and restore with `setfacl --restore`, `ls -l` ACL indicators, and `cp` ACL preservation. The post could later mention default ACLs for inheritance on newly created files in shared directories, but that is an enhancement rather than a correctness issue.
