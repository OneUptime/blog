# Validation Summary: How to Set Up NFSv4 with Kerberos Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFSv4 (nfs-kernel-server, nfs-common)
- MIT Kerberos (krb5-kdc, krb5-admin-server, krb5-user)
- Ubuntu (apt, systemd)
- idmapd (NFSv4 ID mapping)
- rpc.gssd / rpc.svcgssd (GSS-API daemons)
- chrony (time synchronization)

## Sources Consulted
- Ubuntu package archive for `gssd` (does not exist) and `nfs-common` file list — https://packages.ubuntu.com/search?keywords=gssd&searchon=names and https://packages.ubuntu.com/jammy/amd64/nfs-common/filelist
- `nfs(5)` man page for mount options (intr deprecation) — https://man7.org/linux/man-pages/man5/nfs.5.html
- Kernel docs on RPC server GSS — https://docs.kernel.org/filesystems/nfs/rpc-server-gss.html
- gssproxy NFS documentation — https://github.com/gssapi/gssproxy/blob/main/docs/NFS.md
- MIT Kerberos `kadmin.local` reference — https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html

## Issues Found

1. **Non-existent `gssd` package.** The post instructed `sudo apt install gssd -y` on the NFS server. This package does not exist in Ubuntu repositories — `rpc.gssd` is shipped by `nfs-common` (already a dependency of `nfs-kernel-server`). Fixed by removing the install line.

2. **Wrong daemon enabled on the server.** The post enabled `rpc-gssd` on the server. `rpc.gssd` is the client-side GSS daemon; the server side needs `rpc-svcgssd` (or gssproxy). Fixed the server section to enable `rpc-svcgssd.service` instead and clarified that `rpc.gssd` is client-side only.

3. **Deprecated `intr` mount option in fstab example.** The `nfs(5)` man page states `intr` has been ignored since kernel 2.6.25. Removed `intr` from the example fstab line so it now reads `sec=krb5p,hard,noatime,_netdev`.

## Review Notes

- The post's description says "secure, encrypted NFS mounts," but encryption only applies to `krb5p`; the post itself clarifies the distinction between `krb5`, `krb5i`, and `krb5p` in the body, so the description is a mild overstatement rather than a technical error.
- `rpc.svcgssd` is being deprecated in favor of `gssproxy` upstream, but on Ubuntu 22.04 / 24.04 it is still shipped, supported, and the standard path. A future revision could mention gssproxy as an alternative.
- `ntpdate` is used in a check command in the troubleshooting section; it is deprecated but still available in Ubuntu's universe repository. Acceptable for a one-shot diagnostic.
- The cron-based renewal example (`0 */8 * * * kinit -k -t ...`) runs as the crontab owner; readers should be aware the resulting ticket cache belongs to that user, not to `serviceuser` unless the cron job runs as serviceuser.
- The `Domain` value in `/etc/idmapd.conf` must match between server and client; the comment in the post calling this "the Kerberos realm domain" is loose phrasing but the example value (`example.com`) is the correct convention (lowercase DNS domain).
