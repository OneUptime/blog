# Validation Summary: How to Use the ACL Mask to Limit Effective Permissions on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux POSIX Access Control Lists
- `getfacl`
- `setfacl`
- `chmod`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing file system permissions": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-file-system-permissions_configuring-basic-system-settings
- Linux `acl(5)` manual page: https://man7.org/linux/man-pages/man5/acl.5.html
- Linux `setfacl(1)` manual page: https://man7.org/linux/man-pages/man1/setfacl.1.html
- Linux `getfacl(1)` manual page: https://man7.org/linux/man-pages/man1/getfacl.1.html
- Local `acl`, `setfacl`, and `getfacl` man pages; local command checks with `setfacl`/`getfacl` 2.3.2.

## Issues Found
- The "Temporary Permission Restriction" example said the mask restricts all non-owner access. The mask does not affect the `other` ACL entry, so I changed the text and command comment to say it restricts named users, named groups, and the owning group.
- The first "Controlled Write Access" sequence implied that writers could regain write access by widening the mask while readers still had `rwx` ACL entries. Since effective permissions are the ACL entry bitwise-ANDed with the mask, widening the mask to `rwx` would also allow readers with `rwx` entries to write. I changed the example comments to state that limitation before the post presents the correct per-entry approach.

## Review Notes
The remaining commands and explanations match the documented RHEL/Linux ACL behavior. `setfacl -n` is valid for preventing automatic mask recalculation, and `chmod` changes the mask when an ACL mask entry exists.
