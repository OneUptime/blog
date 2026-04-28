# Validation Summary: How to Tune NFS over IPv4 for Low-Latency Networks

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- NFS (Network File System), specifically NFSv4
- Linux kernel networking and tuning (sysctl, sunrpc, nfsd)
- TCP socket buffer tuning
- Linux mount options (`mount -t nfs4`, fstab)
- `/etc/exports` server configuration
- Jumbo frames / MTU configuration
- Performance measurement tools (`dd`, `nfsstat`, `mountstats`)

## Sources Consulted
- nfs(5) man page — https://man7.org/linux/man-pages/man5/nfs.5.html
- nfsd(7) man page — https://www.man7.org/linux/man-pages/man7/nfsd.7.html
- rpc.nfsd(8) man page — https://man7.org/linux/man-pages/man8/rpc.nfsd.8.html
- exports(5) man page
- Linux kernel admin guide: NFS Client — https://docs.kernel.org/admin-guide/nfs/nfs-client.html
- RFC 7530 / RFC 8881 (NFSv4 / NFSv4.1)
- Linux kernel `fs/nfs/client.c` (volumes seq_file ops) — confirms `/proc/fs/nfsfs/volumes` columns
- Red Hat KB on `/proc/fs/nfsfs/volumes` and sunrpc slot tuning

## Issues Found
1. **`intr` mount option is deprecated/ignored** (since kernel 2.6.25). The original post listed `intr` in the mount command, fstab, and the options table with the description "Allow interrupt of hung mount". Per nfs(5), this option is silently ignored on modern kernels. **Fix:** removed `intr` from the mount command, fstab line, and options table.

2. **`cat /proc/fs/nfsfs/volumes` does not show NFSv4 delegations.** That file's columns are `NV SERVER PORT DEV FSID FSC` — purely volume metadata. The original "Check delegation is working" snippet was misleading. **Fix:** replaced with `nfsstat -c` and `grep -i delegation /proc/self/mountstats`, which actually surface delegation counters.

3. **`fs.nfs.nlm_timeout` does not control NFS server threads.** It sets the NLM/lockd RPC timeout (in seconds). The original post placed `sudo sysctl -w fs.nfs.nlm_timeout=10` under the comment "Increase number of NFS server threads", which is incorrect. **Fix:** removed the `nlm_timeout` line and kept the correct method (`echo 32 | sudo tee /proc/fs/nfsd/threads`), with a note that the default is 8.

## Review Notes
- All other technical claims verified correct: `nconnect` available since Linux 5.3 (max 16); `timeo` is in deciseconds (so `timeo=14` = 1.4 s); NFSv4 max rsize/wsize is 1,048,576 bytes; NFSv4 uses single port 2049 with no portmapper; `/proc/fs/nfsd/threads` is the correct interface for thread count; modprobe.d syntax `options sunrpc tcp_slot_table_entries=128` is valid.
- The `mount -t nfs4` form still works but is older style; modern systems prefer `mount -t nfs -o vers=4`. Left as-is since both are valid.
- Default `tcp_slot_table_entries` on modern kernels is 2 (slot tables became dynamic, capped by `sunrpc.tcp_max_slot_table_entries`). The post's recommendation to raise to 128 is reasonable for high-concurrency workloads.
- The jumbo-frame ICMP payload size calculation (8972 + 28 = 9000) correctly accounts for the 20-byte IPv4 header + 8-byte ICMP echo header.
- The TCP buffer values (16 MiB max) are appropriate for sub-millisecond LAN with 1 MiB rsize/wsize and `nconnect=4`.
