# Validation Summary: How to Handle File Permissions with chmod and chown

## Status
validated

## Post Type
Technical tutorial / system administration guide

## Technologies Covered
- Linux file permissions
- GNU coreutils `chmod`, `chown`, and `chgrp`
- GNU findutils `find`
- POSIX/Linux ACLs with `getfacl` and `setfacl`
- OpenSSH file permission conventions
- Linux `umask`
- SELinux context inspection with `ls -Z`

## Sources Consulted
- GNU coreutils `chmod` manual: https://www.gnu.org/software/coreutils/chmod
- GNU coreutils `chown` manual: https://www.gnu.org/software/coreutils/chown
- GNU coreutils `chgrp` manual: https://www.gnu.org/software/coreutils/chgrp
- GNU findutils `find` manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Linux ACL manual (`acl(5)`): https://man7.org/linux/man-pages/man5/acl.5.html
- Linux `umask(2)` manual: https://man7.org/linux/man-pages/man2/umask.2.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- util-linux `namei(1)` manual: https://man7.org/linux/man-pages/man1/namei.1.html

## Issues Found
- The owner category was described as "file creator". Changed it to "file owner" because ownership can be changed after creation with `chown`.
- The sticky bit was described as "only owner can delete". Changed the wording to restricted deletion and clarified that file owner, directory owner, or root may delete or rename entries in sticky directories.
- The `chown -H user:group link` example was labeled as following symbolic links, but `-H` only affects recursive traversal of command-line symlinked directories. Replaced it with `chown --dereference user:group link`, which accurately describes changing a symlink target and is also the GNU default.
- The SGID web directory note said it allows group write for new files. Changed it to say SGID makes new files inherit the directory group; write permission still depends on the creator's umask or a default ACL.
- The shared project directory comments implied SGID alone guarantees group-writable new files. Clarified that group writability depends on umask or default ACL behavior.
- The log file comment said group and others can read, but `chmod 640` grants group read and no access to others. Updated the comment to match the command.
- The troubleshooting note for creating files in a directory mentioned only write permission. Updated it to require both write and execute/search permission on the directory.

## Review Notes
The remaining command examples are syntactically valid for common GNU/Linux environments. Some recommendations are intentionally simplified for a broad audience; for example, ACL support checks and web server ownership patterns can vary by filesystem, distribution, service account, and deployment model.
