# Validation Summary: How to Configure NFS Server with IPv6 on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NFS (Network File System), NFSv3 and NFSv4
- IPv6
- Linux (Debian/Ubuntu, RHEL/CentOS/Rocky)
- `nfs-kernel-server`, `nfs-utils`
- `/etc/exports`, `exportfs`
- `rpcbind`, `rpcinfo`
- `/etc/nfs.conf`
- `ip6tables`, `iptables-persistent`
- `showmount`, `mount`

## Sources Consulted
- exports(5) — https://man7.org/linux/man-pages/man5/exports.5.html
- nfs(5) — https://man7.org/linux/man-pages/man5/nfs.5.html
- nfs.conf(5) — https://man7.org/linux/man-pages/man5/nfs.conf.5.html
- rpcbind(8) — https://man7.org/linux/man-pages/man8/rpcbind.8.html
- rpcinfo(8) — https://man7.org/linux/man-pages/man8/rpcinfo.8.html
- showmount(8) — https://man7.org/linux/man-pages/man8/showmount.8.html
- nfs-utils upstream source (`utils/exportfs/exports.man`)
- linux-nfs.org wiki — Server IPv6 support page
- kernelnewbies.org — Linux 2.6.37 changelog (NFS-over-IPv6 support)
- Debian `iptables-persistent` package documentation

## Issues Found

1. **IPv6 addresses bracketed in `/etc/exports` (multiple lines).**
   exports(5) explicitly states: "IPv6 addresses must not be inside square brackets in /etc/exports lest they be confused with character-class wildcard matches." The original post wrapped every IPv6 host and subnet in `[ ]`. Removed brackets from all `/etc/exports` examples and the matching `exportfs -v` expected output.

2. **`mount -t nfs6` is not a valid filesystem type.**
   Per nfs(5), valid types are `nfs` and `nfs4`; there is no `nfs6` type. IPv6 vs IPv4 is selected by the address literal (and optionally `proto=tcp6`). Changed to `mount -t nfs` (and added a `mount -t nfs4` example for the v4 pseudo-root).

3. **`/etc/ip6tables/rules.v6` is the wrong path.**
   `iptables-persistent` on Debian/Ubuntu writes to `/etc/iptables/rules.v6` (a single `iptables` directory holding both `rules.v4` and `rules.v6`). Corrected the path.

4. **`RPCBIND_ARGS="-l"` / `OPTIONS="-l"` does not enable IPv6.**
   Per rpcbind(8), `-l` enables libwrap connection logging — it has nothing to do with IPv6 binding. rpcbind on modern Linux already binds to all interfaces (including IPv6) by default; restriction is done with `-h <addr>`. Replaced with correct verification (`rpcinfo -T tcp6 ::1` / `rpcinfo -s ::1`) and a correct `-h` example for restricting binds.

5. **`rpcinfo -p "[::1]"` is incorrect for IPv6.**
   The `-p` flag uses portmapper protocol v2 which is IPv4-only. For IPv6 use `rpcinfo -T tcp6 <host>` or `rpcinfo -s <host>`. Also, rpcinfo host arguments are not bracketed. Corrected both occurrences.

6. **`showmount -e` shown unconditionally despite the post recommending NFSv4-only.**
   `showmount` uses the MOUNT protocol (NFSv3). NFSv4-only servers do not advertise MNT, so `showmount` will not work there. Added a clarifying comment and an alternative (`mount -t nfs4 [host]:/ /mnt/...`) for browsing the v4 pseudo-root.

7. **"Supports IPv6 starting with NFSv4" is misleading.**
   NFSv3 over IPv6 is also supported in Linux. The accurate statement is that comprehensive client+server NFS-over-IPv6 support landed in kernel 2.6.37. Reworded the introduction.

8. **Conclusion contradicted the corrected exports syntax.**
   Original conclusion said configuration "requires bracketing IPv6 addresses in `/etc/exports`" — the opposite of what exports(5) requires. Updated to reflect the no-brackets rule.

## Review Notes
- The `fd00::/8` example uses an unusual prefix length (the full ULA range is `fc00::/7`; `fd00::/8` is the locally-assigned half). Technically valid, left as-is since intent is plausible.
- `exportfs -v` output formatting can vary slightly across nfs-utils versions; the example is representative rather than byte-exact.
- For NFSv4-only deployments, the rpcbind/port-111 firewall rules in the post are unnecessary; the post does call this out, but readers planning v4-only setups should skip the rpcbind section entirely.
- The `ss -tlnp` filter pipes through grep with `-E '(nfsd|rpcbind|2049|111)'`; `nfsd` is a kernel thread and won't show as a process owner of the listening socket, but matching on `2049`/`111` will still find the relevant lines.
