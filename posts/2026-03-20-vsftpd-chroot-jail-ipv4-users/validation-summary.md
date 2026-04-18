# Validation Summary: How to Set Up vsftpd Chroot Jail for IPv4 Users

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- vsftpd (Very Secure FTP Daemon)
- FTP protocol
- Linux chroot mechanism
- systemd (for service management)
- Linux user/permission management (useradd, chmod, chown)
- PAM (implicitly, via vsftpd local authentication)

## Sources Consulted
- vsftpd man page and official configuration documentation (vsftpd.conf.5): https://security.appspot.com/vsftpd/vsftpd_conf.html
- vsftpd README and FAQ (Chris Evans' upstream): https://security.appspot.com/vsftpd.html
- Debian/Ubuntu vsftpd package documentation
- Linux `useradd(8)`, `chmod(1)`, `chown(1)` man pages
- Known vsftpd chroot behavior: "refusing to run with writable root inside chroot()" error condition

## Issues Found

1. **Writable home directory in chroot setup (technical error — fixed)**
   - **Issue:** The original snippet ran `useradd -m -s /usr/sbin/nologin ftpuser` followed by `chmod 755 /home/ftpuser` with the comment "Not writable by ftpuser". This is incorrect: `useradd -m` makes the home directory owned by `ftpuser`, and mode `755` grants the owner (`ftpuser`) write permission (`rwx`). vsftpd's chroot safety check requires the chroot root to be non-writable by the logged-in user; with this setup, vsftpd would fail at login with `500 OOPS: vsftpd: refusing to run with writable root inside chroot()`.
   - **Fix:** Added `chown root:root /home/ftpuser` before the `chmod 755` so the home directory is owned by root and therefore genuinely not writable by `ftpuser`, satisfying vsftpd's chroot check.

## Review Notes

- The inverted-logic semantics of `chroot_list_enable` combined with `chroot_local_user` are correctly described: with `chroot_local_user=YES`, listed users are exempt from chroot; with `chroot_local_user=NO`, only listed users are chrooted. This matches the vsftpd.conf documentation.
- `listen=YES` / `listen_ipv6=NO` correctly disables the IPv6 listener and binds to IPv4 only. Note that `listen` and `listen_ipv6` are mutually exclusive in vsftpd (you cannot enable both simultaneously); the post's settings are a valid IPv4-only pair.
- The user shell `/usr/sbin/nologin` can cause local-login failures via vsftpd because the default `/etc/pam.d/vsftpd` on Debian/Ubuntu includes `pam_shells.so`, which requires the user's shell to be listed in `/etc/shells`. `/usr/sbin/nologin` is typically not in `/etc/shells` on most distros. Readers may need to add it to `/etc/shells` or configure `/etc/pam.d/vsftpd` accordingly. This is tangential to the chroot focus of the article, so it was not changed, but it is worth noting for future updates.
- On RHEL/Rocky/Fedora, the configuration file is at `/etc/vsftpd/vsftpd.conf`, not `/etc/vsftpd.conf` as shown. The post's path is correct for Debian/Ubuntu; RHEL-family readers should adjust accordingly.
- The default `xferlog_file` is `/var/log/xferlog` and `vsftpd_log_file` defaults to `/var/log/vsftpd.log`. The post reuses `/var/log/vsftpd.log` for `xferlog_file`; this works but mixes conventions. If readers want the native vsftpd log format, they should also set `xferlog_std_format=NO` (or use `vsftpd_log_file` instead).
- The FTP error code `550 Failed to change directory` shown when `cd /etc` is attempted inside the chroot is accurate — the path resolves to `/home/ftpuser/etc` inside the chroot, which does not exist.
