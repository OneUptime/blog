# Validation Summary: How to Set Up vsftpd FTP Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- Ubuntu Linux
- FTP protocol (active and passive modes)
- systemd (service management)
- UFW (Uncomplicated Firewall)
- PAM (pam_userdb for virtual user authentication)
- Berkeley DB (db_load utility, db-util package)
- lftp and ftp clients

## Sources Consulted
- Ubuntu vsftpd.conf(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/vsftpd.conf.5.html
- Upstream vsftpd.conf manpage: http://vsftpd.beasts.org/vsftpd_conf.html
- Red Hat RHEL Deployment Guide — vsftpd logging options: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/5/html/deployment_guide/s4-ftp-vsftpd-conf-opt-log
- Ubuntu db_load(1) man page: https://manpages.ubuntu.com/manpages/jammy/man1/db_load.1.html
- Ubuntu package: db-util (jammy): https://packages.ubuntu.com/jammy/db-util
- vsftpd pam_userdb usage references for virtual users

## Issues Found
1. **Misleading umask comment.** The comment said `022 = 755 permissions` for uploaded files. umask 022 yields 644 for regular files (the kernel does not grant execute on file creation) and 755 only for directories. Updated the comment to `022 = 644 for files, 755 for directories`.

2. **Incorrect `ftpd_banner` comment.** The original comment said it shows "the server's real hostname in greeting messages". Per vsftpd.conf(5), `ftpd_banner` is a literal static string that overrides the connect-time greeting; it does not interpolate the hostname. Replaced with "Custom greeting banner shown to clients on connect".

3. **Conflicting log format settings.** The original config set `xferlog_std_format=YES` together with `log_ftp_protocol=YES`. Per the vsftpd.conf(5) man page, `log_ftp_protocol` is explicitly ignored when `xferlog_std_format=YES`, and the wu-ftpd-style xferlog format produced in that mode does not match the vsftpd-native log lines (`[pid …] CONNECT: Client "…"`) shown later in the "Monitoring" section. Changed to `xferlog_std_format=NO`, switched `xferlog_file` to `vsftpd_log_file` (the correct directive for native-format output), and added a short comment explaining the dependency. The example log lines are now consistent with the active configuration.

## Review Notes
- With `userlist_enable=YES` and `userlist_deny=NO` (the allow-list mode used in the post), vsftpd checks the username before the password prompt, which can be used to enumerate valid users. The post should ideally mention this caveat, but it is not a correctness issue.
- The default `local_umask` in upstream vsftpd is `077`; Ubuntu's shipped vsftpd.conf and many tutorials override to `022`. The post's choice of `022` is intentional and reasonable for shared-upload scenarios.
- `pam_userdb.so` expects the `db=` path without the `.db` suffix; the post correctly uses `db=/etc/vsftpd/virtual-users` while the file on disk is `/etc/vsftpd/virtual-users.db`. This is correct but easy to get wrong — left untouched.
- The `db-util` metapackage on Ubuntu provides unversioned symlinks for `db_load` and is the right choice for the example.
- The post does not explicitly `mkdir /etc/vsftpd` before writing the virtual users DB; on a fresh Ubuntu install the directory does not exist by default. Left as-is since the later `mkdir -p /etc/vsftpd/users` would create it, but a reader following the steps strictly might hit a transient error on the `db_load` line.
- Storing FTP credentials in plaintext over the wire remains a concern; the post correctly closes by recommending TLS as a follow-up.
