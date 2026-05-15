# Validation Summary: How to Set Default ACLs on Directories for Shared Access on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux POSIX ACLs
- `setfacl`
- `getfacl`
- `umask`
- Unix file and directory permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing file system permissions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-file-system-permissions_configuring-basic-system-settings
- Linux `setfacl(1)` manual page: https://man7.org/linux/man-pages/man1/setfacl.1.html
- Linux `getfacl(1)` manual page: https://man7.org/linux/man-pages/man1/getfacl.1.html
- Linux `acl(5)` manual page: https://man7.org/linux/man-pages/man5/acl.5.html
- Linux `umask(2)` manual page: https://man7.org/linux/man-pages/man2/umask.2.html

## Issues Found
- The post said inherited execute permissions on new files are removed "per the umask." On Linux, when a parent directory has a default ACL, the process umask is ignored; inherited ACL permissions are still limited by the mode requested by the file-creation system call. I changed the wording to explain that common tools such as `touch` request mode `0666`, so execute permission is turned off even if the default ACL includes `x`.
- The post said the default ACL "takes full control" of permissions. I clarified that the default ACL is inherited and the umask is ignored, but the file-creation mode still limits the final permissions.
- The post described the removal of execute permission as caused by the "kernel's file creation mask." I changed this to refer to the requested creation mode, which is the mechanism described by `acl(5)` and `umask(2)`.

## Review Notes
The commands and options shown for `setfacl`, `getfacl`, recursive ACL application, default ACL removal, and ACL backup/restore are valid. The examples assume that named users and groups such as `alice`, `developers`, `dev`, `qa`, and `team` already exist.
