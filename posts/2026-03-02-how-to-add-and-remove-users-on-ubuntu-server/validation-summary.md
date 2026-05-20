# Validation Summary: How to Add and Remove Users on Ubuntu Server

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu Server
- Linux user and group management
- `adduser`, `deluser`, `useradd`, `userdel`, and `usermod`
- OpenSSH `authorized_keys`
- Shell scripting for batch user creation

## Sources Consulted
- Ubuntu manpage for `adduser(8)`: https://manpages.ubuntu.com/manpages/noble/man8/adduser.8.html
- Ubuntu manpage for `deluser(8)`: https://manpages.ubuntu.com/manpages/noble/man8/deluser.8.html
- Ubuntu manpage for `useradd(8)`: https://manpages.ubuntu.com/manpages/noble/man8/useradd.8.html
- Ubuntu manpage for `userdel(8)`: https://manpages.ubuntu.com/manpages/noble/man8/userdel.8.html
- Ubuntu manpage for `usermod(8)`: https://manpages.ubuntu.com/manpages/noble/man8/usermod.8.html
- Ubuntu/OpenSSH manpage for `sshd(8)` and `authorized_keys`: https://manpages.ubuntu.com/manpages/jammy/man8/sshd.8.html

## Issues Found
- The `useradd` multi-line example placed inline comments after line-continuation backslashes. In shell syntax, a backslash only continues the line when it is the final character before the newline, so the example would not run as pasted. Moved those explanations into a separate "Flags explained" block.
- The `useradd --system` multi-line example had the same line-continuation issue. Moved the comments below the command and kept the command pasteable.
- The `/etc/skel` example claimed Ubuntu shows `.bash_profile`; Ubuntu's default skeleton files commonly include `.bashrc`, `.bash_logout`, and `.profile`, not `.bash_profile`. Updated the example wording.
- The `deluser --remove-all-files` comment said it removes the user from all groups. According to `deluser(8)`, this option removes all files on the system owned by the user. Corrected the comment.
- The `usermod -L` comment described the command as locking the account entirely. According to `usermod(8)`, it locks the user's password; other login paths such as SSH keys may still require separate policy controls. Updated the comment to "Lock the password."
- The batch creation script used `adduser --gecos`, which is supported on older Ubuntu releases but superseded by `--comment` in current `adduser` documentation. Updated it to `--comment`.

## Review Notes
The post is technically relevant and generally accurate after the corrections above. Example UID/GID values remain illustrative; actual assigned IDs vary by system configuration and existing accounts.
