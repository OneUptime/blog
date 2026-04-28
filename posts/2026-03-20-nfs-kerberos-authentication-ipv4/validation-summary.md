# Validation Summary: How to Secure NFS Exports with Kerberos Authentication on IPv4

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NFS (Network File System, primarily NFSv4)
- Kerberos (MIT krb5)
- RPCSEC_GSS (GSS-API for RPC)
- `nfs-utils` / `nfs-kernel-server`
- `krb5-workstation` / `krb5-user`
- `kadmin.local` (KDC administration)
- `rpc-gssd` (RPC GSS daemon)
- `exportfs`, `mount`, systemd unit management
- IPv4 networking / CIDR-based export access

## Sources Consulted
- exports(5) man page — https://man7.org/linux/man-pages/man5/exports.5.html
- nfs(5) man page (sec= options) — https://man7.org/linux/man-pages/man5/nfs.5.html
- rpc.gssd(8) man page — https://man7.org/linux/man-pages/man8/rpc.gssd.8.html
- kadmin(1) man page (addprinc, ktadd) — https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- Red Hat documentation on Securing NFS with Kerberos
- RFC 7530 (NFS v4) and RFC 2203 (RPCSEC_GSS)

## Issues Found
No technical issues found.

The post is technically accurate:
- The `kadmin.local` syntax for `addprinc -randkey` and `ktadd -k <keytab>` is correct.
- The `/etc/exports` syntax `/data  192.168.1.0/24(rw,sync,sec=krb5p,fsid=0)` is valid; `fsid=0` correctly designates the NFSv4 pseudo-root, which makes `server:/` mountable on the client.
- The descriptions of `krb5` (auth only), `krb5i` (auth + integrity/checksums), and `krb5p` (auth + integrity + privacy/encryption) align with RFC 2203 and the nfs(5) man page.
- The `mount -t nfs4 -o sec=krb5p` and fstab entries use valid options.
- The verification flow with `kinit` / `kdestroy` correctly demonstrates the auth dependency.

## Review Notes
- Minor caveat (not corrected because the post still works as written): On modern Linux distros, server-side GSS verification is largely handled by the kernel and/or `gssproxy`, so enabling `rpc-gssd` on the server is mostly a no-op for inbound NFS auth (it serves outbound GSS contexts). The instruction is harmless and remains common in tutorials, so it was left as-is.
- Cached credentials caveat: After `kdestroy`, the kernel may briefly allow access from cached GSS contexts before they expire; the "permission denied" check may not be instantaneous in all environments. The conceptual point in the post is correct.
- The client host principal uses `host/...` which is the conventional format; some setups prefer `nfs/...` but both are accepted.
