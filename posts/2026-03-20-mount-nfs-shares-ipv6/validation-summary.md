# Validation Summary: How to Mount NFS Shares over IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NFS (NFSv3 / NFSv4)
- IPv6 networking
- Linux `mount` / `/etc/fstab`
- systemd mount and automount units
- autofs / automounter maps
- Kerberos NFS security (krb5p)
- nfs-utils tooling (`showmount`, `rpcinfo`, `nfsstat`)
- Diagnostic tools (`ping6`, `ip -6`, `nc`, `iostat`, `journalctl`)

## Sources Consulted
- nfs(5) man page (Linux nfs-utils): https://man7.org/linux/man-pages/man5/nfs.5.html
- mount(8): https://man7.org/linux/man-pages/man8/mount.8.html
- showmount(8) and rpcinfo(8) from nfs-utils
- systemd.mount(5) and systemd.automount(5): https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- autofs(5) / auto.master(5)
- iostat(1) (sysstat)
- RFC 5661 (NFSv4.1) and RFC 5667 (NFS RDMA)
- nfs-utils source/documentation regarding IPv6 support

## Issues Found
- **`rpcinfo -p "[2001:db8::1]"`** — Replaced with `rpcinfo -s 2001:db8::1`. The legacy `-p` flag uses portmapper v2 protocol which is IPv4-oriented and does not work reliably with IPv6, and bracket notation is not a documented `rpcinfo` argument format. The TI-RPC `-s` (summary) form correctly accepts a bare IPv6 address.

## Review Notes
- **`intr` mount option is deprecated** (silently ignored since Linux kernel 2.6.25, ~2008). The post includes it in several examples. It still works (it's silently ignored, not an error), and is widespread in NFS documentation, so it was left in place. Modern best practice is to omit it; only SIGKILL can interrupt pending NFS operations on current kernels.
- **`nfs4` filesystem type is deprecated** per nfs(5). The post uses `mount -t nfs4 ...` and `nfs4` as the fstab fstype. Both still work on current kernels but the documented modern form is `mount -t nfs -o vers=4 ...` (or `nfsvers=4`). Left as-is because the deprecated form remains functional and widely used in the wild.
- **`showmount` and IPv6**: The post uses `showmount -e [2001:db8::1]`. IPv6 support in `showmount` has historically had bugs (e.g., Debian #809392) depending on nfs-utils version. Where possible, using a hostname with AAAA records is more reliable.
- **autofs colon escaping**: The post uses `[2001\:db8\:\:1]:/srv/data` which combines bracket notation *and* backslash-escaped colons. Either form alone is sufficient in modern autofs, so this is over-escaped but not incorrect — autofs accepts the redundant escapes.
- **`iostat -n` for NFS**: Works and is documented, but `nfsiostat` is the recommended tool for accurate NFS-specific I/O statistics (Red Hat KB 31964 notes accuracy issues with `iostat -n`).
- **Link-local IPv6 addresses**: The post does not cover link-local addresses, which require zone-id syntax (e.g. `[fe80::1%eth0]:/path`). Not an error — the post uses globally-routable documentation prefixes throughout — but worth noting for completeness.
