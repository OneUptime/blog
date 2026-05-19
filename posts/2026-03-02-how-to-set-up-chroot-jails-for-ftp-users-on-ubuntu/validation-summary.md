# Validation Summary: How to Set Up Chroot Jails for FTP Users on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Linux server)
- vsftpd (FTP server)
- ProFTPD (FTP server)
- `chroot()` system call
- Linux file permissions / ownership
- Bind mounts (`mount --bind`, `/etc/fstab`)
- lftp (FTP client)
- PAM (implicitly, via vsftpd auth)

## Sources Consulted
- vsftpd.conf(5) man page and upstream documentation (https://security.appspot.com/vsftpd.html) for `chroot_local_user`, `allow_writeable_chroot`, `chroot_list_enable`, `chroot_list_file`, `local_root`, and `user_sub_token` semantics
- ProFTPD documentation for `DefaultRoot` syntax (`~`, `%u`, group-negation `!group`), and the `<IfUser>` / `<IfGroup>` configuration contexts (http://www.proftpd.org/docs/directives/linked/config_ref_DefaultRoot.html)
- proftpd(8) man page for the `--configtest` / `-t` flag
- mount(8) and fstab(5) for bind-mount syntax (`none bind 0 0`)
- Linux chroot(2) man page for system-call semantics and known root-escape caveats
- find(1) for the `-perm -4000` setuid-search idiom

## Issues Found
1. **vsftpd `local_root=/srv/ftp/%n` would not substitute the username.**
   - The post claimed `%n = username` worked out-of-the-box for `local_root`. vsftpd does NOT have any built-in token substitution in `local_root`; substitution only happens if `user_sub_token` is explicitly set to the desired placeholder. Without `user_sub_token`, vsftpd would silently try to `chdir` into a literal directory called `/srv/ftp/%n` and fail.
   - **Fix:** Added `user_sub_token=%n` above the `local_root` line, with an inline comment explaining why the directive is required. The original intent of the example is preserved.

## Review Notes
- The post uses `/usr/sbin/nologin` as the FTP user's shell. On Ubuntu, vsftpd's default PAM stack (`/etc/pam.d/vsftpd`) includes `pam_shells.so`, which rejects users whose shell is not listed in `/etc/shells`. `/usr/sbin/nologin` is not in `/etc/shells` by default, so in practice the reader may also need to either add the shell to `/etc/shells` or remove `pam_shells.so` from the vsftpd PAM file. This is tangential to the chroot focus of the post and was left unchanged.
- The security claim that "a process running as root inside a chroot can break out" is accurate (e.g., via `mknod`/raw-device or `fchdir` techniques), so the recommendation to combine chroot with non-root, no-setuid, and a restricted shell is sound.
- vsftpd's `chroot_list_enable` semantics (list-as-exception when `chroot_local_user=YES`, list-as-inclusion when `chroot_local_user=NO`) are correctly described.
- ProFTPD's `DefaultRoot ~ !admin` group-negation syntax and `%u` username substitution are both valid and correctly demonstrated.
- The fstab bind-mount line format (`none bind 0 0`) is valid; some sources use `defaults,bind` instead, but the form in the post works.
- vsftpd's actual error string "500 OOPS: vsftpd: refusing to run with writable root inside chroot" matches the upstream source.
