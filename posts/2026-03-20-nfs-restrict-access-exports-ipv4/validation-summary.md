# Validation Summary: How to Restrict NFS Access Using IPv4-Based Export Rules

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NFS (Network File System) v3 and v4
- `/etc/exports` configuration
- iptables (Linux firewall)
- rpcbind / portmapper (port 111)
- NFS RPC services: mountd, statd, lockd
- Debian/Ubuntu nfs-kernel-server / nfs-common config
- RHEL/CentOS sysconfig/nfs config
- nfsstat, exportfs, showmount auditing tools

## Sources Consulted
- `exports(5)` man page (https://linux.die.net/man/5/exports)
- `rpc.mountd(8)` man page
- `nfsstat(8)` man page
- `showmount(8)` man page
- nfs-utils upstream documentation (linux-nfs.org)
- Red Hat documentation for static NFS ports on RHEL 7/8/9
- Debian/Ubuntu nfs-kernel-server and nfs-common package docs

## Issues Found

1. **TCP wrappers mention was misleading.** The original description and introduction listed "TCP wrappers" as the third layer of defense, but the post body never covers TCP wrappers — Layer 3 is actually about static RPC port assignment. Additionally, libwrap/TCP-wrapper support has been removed from RHEL 8+ and Fedora (nfs-utils built `--without-tcp-wrappers`), so recommending it as a working control on modern distros is incorrect. Updated the description and introduction to refer to "static RPC port assignments" instead, matching the actual content of the post.

2. **`STATDOPTS` location was wrong on Debian/Ubuntu.** The post placed `STATDOPTS` in `/etc/default/nfs-kernel-server`, but on Debian/Ubuntu `STATDOPTS` is read from `/etc/default/nfs-common` (statd is part of the nfs-common package, not nfs-kernel-server). Split the example so `RPCMOUNTDOPTS` stays in `nfs-kernel-server` and `STATDOPTS` is correctly placed in `nfs-common`.

3. **`/etc/sysconfig/nfs` is legacy on RHEL 8+.** On RHEL 8 and later, the preferred mechanism is `/etc/nfs.conf`. The `/etc/sysconfig/nfs` variables still work on RHEL 7 / older CentOS but are deprecated. Added an inline note to flag this so readers on newer systems know to use `/etc/nfs.conf`.

4. **Conclusion said "two levels" but post structures three layers.** Changed "Restrict NFS access at two levels" to "Restrict NFS access at multiple layers" so the conclusion matches the body's three-layer structure (exports + iptables + static ports).

## Review Notes
- `showmount -a` reads from `/var/lib/nfs/rmtab`, which is unreliable — stale entries persist across crashes/unmounts and the man page itself warns about this. The command shown will work but readers should be aware that it does not strictly reflect "currently mounted" clients. For NFSv4, `/proc/fs/nfsd/clients/` is more authoritative.
- The iptables append-then-DROP pattern is correct for a fresh chain, but readers with existing INPUT chains should be aware that rule ordering matters with `-A`. Inserting with `-I` or using a dedicated chain is often safer in real deployments.
- AUTH_SYS (the default, IP-based "authentication") is the assumed model throughout the post. NFSv4 with Kerberos (sec=krb5/krb5i/krb5p) provides stronger authentication and is worth mentioning as a follow-up for readers who need real cryptographic identity, but that is out of scope for this IPv4-focused guide.
- All other commands (`exportfs -v`, `nfsstat -s`, `ss -tnp | grep 2049`, `iptables-save | tee /etc/iptables/rules.v4`, `grep "\*" /etc/exports`) verified correct.
