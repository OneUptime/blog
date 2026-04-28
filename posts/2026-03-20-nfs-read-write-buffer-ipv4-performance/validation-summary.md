# Validation Summary: How to Configure NFS Read/Write Buffer Sizes (rsize/wsize) for IPv4 Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System) v3 and v4
- Linux NFS client (`mount.nfs`)
- Linux NFS server (`nfsd` kernel module)
- `/etc/fstab` configuration
- `dd` for benchmarking
- `sysctl` (`net.core.rmem_max`, `net.core.wmem_max`)
- `/sys/module/nfsd/parameters/max_block_size`

## Sources Consulted
- `nfs(5)` man page (mount options: rsize, wsize, timeo, retrans, vers)
- `mount(8)` man page (filesystem types nfs / nfs4)
- `open(2)` man page (O_DSYNC vs O_DIRECT semantics)
- Linux kernel documentation on `nfsd` module parameters (Documentation/filesystems/nfs/)
- Linux NFS HOWTO and Linux NFS FAQ (nfs.sourceforge.net)
- `dd(1)` man page (`oflag=dsync` vs `oflag=direct`)
- `proc(5)` and sysctl reference for `net.core.rmem_max` / `net.core.wmem_max`

## Issues Found
1. **dd comment terminology error (Testing Performance section)**: The comment described `oflag=dsync` as "no caching: direct I/O", which is incorrect. `oflag=dsync` corresponds to `O_DSYNC` (synchronous I/O), while direct I/O is `O_DIRECT` (i.e., `oflag=direct`). They are distinct flags with different semantics: `O_DSYNC` forces each write to complete according to data integrity rules, while `O_DIRECT` minimizes cache effects on transfer. Updated the comment to "synchronous I/O: forces each write to commit to the server" to accurately reflect what `oflag=dsync` does and why it's useful for NFS write benchmarks.

## Review Notes
- The recommendation to *reduce* `rsize`/`wsize` for high-latency WAN links is a reasonable simplification but context-dependent. For high-bandwidth, high-latency links with low loss, larger sizes generally amortize round-trip latency better; smaller values are mainly beneficial on lossy/slow links where retransmit cost dominates. The post's recommendation table is reasonable for most typical scenarios.
- `mount -t nfs4` is still supported in the Linux kernel for backward compatibility, but the modern recommended form is `mount -t nfs -o vers=4` (or `nfsvers=4`). The post's syntax remains functional on current Linux distributions.
- The `sync` mount option in the `/etc/fstab` example is technically valid but contradicts the performance focus of the post (since it forces synchronous writes on the client side, defeating async write batching). It was left as-is since it is not technically incorrect — some operators deliberately use `sync` for data-safety reasons.
- The `/sys/module/nfsd/parameters/max_block_size` parameter typically must be set before the `nfsd` server starts; changing it on a running NFS server may be ineffective or require an `nfsd` restart. This caveat is not mentioned in the post but is not strictly an error.
- The mermaid diagram uses `\n` for line breaks within node labels, which is supported by current mermaid versions; some older renderers prefer `<br/>`. Left as-is since it renders correctly with modern mermaid.
- The NFSv3 default of 32KB applies to older Linux kernels; modern kernels (3.x+) and modern NFS servers can negotiate up to 1MB for NFSv3 as well. The post's wording ("typically") accommodates this.
