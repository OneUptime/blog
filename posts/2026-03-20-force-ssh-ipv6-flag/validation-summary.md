# Validation Summary: How to Force SSH to Use IPv6 with -6 Flag

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- OpenSSH client (`ssh`)
- OpenSSH utilities (`scp`, `sftp`, `ssh-keyscan`)
- `ssh-copy-id`
- `rsync`
- SSH client configuration (`~/.ssh/config`)

## Sources Consulted
- OpenBSD `ssh(1)`: https://man.openbsd.org/ssh
- OpenBSD `scp(1)`: https://man.openbsd.org/scp
- OpenBSD `sftp(1)`: https://man.openbsd.org/sftp
- OpenBSD `ssh-keyscan(1)`: https://man.openbsd.org/ssh-keyscan.1
- OpenBSD `ssh_config(5)`: https://man.openbsd.org/ssh_config
- Official `rsync(1)` man page: https://rsync.samba.org/ftp/rsync/rsync.1.html
- `ssh-copy-id(1)` manual page: https://man7.org/linux/man-pages/man1/ssh-copy-id.1.html
- Local CLI help and man pages on the review system: `ssh` usage output, `scp` usage output, `sftp` usage output, `ssh-keyscan` usage output, `ssh-copy-id -h`, `man ssh-copy-id`, and `rsync --help`

## Issues Found
- The post stated that `ssh-copy-id` supports a native `-6` flag. Current documentation and local help output show that `ssh-copy-id` does not provide `-6`; instead it accepts `-o ssh_option` and passes that through to `ssh`/`sftp`. I changed `ssh-copy-id -6 user@server.example.com` to `ssh-copy-id -o AddressFamily=inet6 user@server.example.com` and updated the summary to match.

## Review Notes
- The `rsync` examples that use `-e "ssh -6"` are valid. The official `rsync(1)` documentation also notes that `rsync -6` / `--ipv6` can prefer IPv6 and may forward `-6` to `ssh` when `ssh` is the remote shell.
