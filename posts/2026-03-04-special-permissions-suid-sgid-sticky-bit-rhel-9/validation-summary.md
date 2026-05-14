# Validation Summary: How to Use Special Permissions (SUID, SGID, Sticky Bit) on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux file permissions
- SUID, SGID, and sticky bit mode bits
- GNU coreutils `chmod` and `ls`
- GNU findutils `find`
- Linux file capabilities with `setcap`
- SELinux security contexts
- Linux mount options and `/etc/fstab`

## Sources Consulted
- GNU Coreutils manual, `chmod` invocation: https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html
- GNU Coreutils manual, mode structure and special bits: https://www.gnu.org/s/coreutils/manual/html_node/Mode-Structure.html
- GNU Coreutils manual, directory setuid and setgid behavior: https://www.gnu.org/s/coreutils/manual/html_node/Directory-Setuid-and-Setgid.html
- GNU Findutils manual, `find -perm` behavior: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Red Hat documentation, special permissions in Red Hat Enterprise Linux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/html/introduction_to_system_administration/s1-acctsgrps-rhlspec
- Local Linux man pages checked in the review environment: `chmod(1)`, `chmod(2)`, `find(1)`, `setcap(8)`, `mount(8)`, and `ls(1)`

## Issues Found
- The shared-directory Mermaid diagram said both users could edit both files after setting only `chmod 2770` on the directory. SGID on a directory makes new entries inherit the directory group, but it does not by itself force group-write permissions on newly created files. With a common `0022` umask, files may be created as `0644`, matching the earlier example in the post. Changed the diagram label to say that both files keep the `webteam` group, which is the behavior guaranteed by SGID.

## Review Notes
The commands and explanations for SUID, SGID, sticky bit display in `ls`, `chmod` symbolic and octal forms, GNU `find -perm -4000`, `-perm -2000`, and `-perm /6000`, `setcap 'cap_net_bind_service=+ep'`, `ls -lZ`, and `nosuid` mount behavior are technically correct. For future expansion, the shared-directory recipe could mention `umask 0002` or default ACLs if the goal is collaborative editing of newly created files, but that is outside the narrow correction made here.
