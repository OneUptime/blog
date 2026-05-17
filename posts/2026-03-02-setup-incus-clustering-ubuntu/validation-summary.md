# Validation Summary: How to Set Up Incus Clustering on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Incus (system container and virtual machine manager)
- Ubuntu Linux
- dqlite (distributed SQLite database used by Incus for cluster state)
- Ceph RBD (shared storage option)
- NFS (alternative shared storage option)
- BTRFS / ZFS / LVM (local storage backends)
- chrony (NTP time synchronization)

## Sources Consulted
- Incus official documentation: How to form a cluster — https://linuxcontainers.org/incus/docs/main/howto/cluster_form/
- Incus official documentation: How to manage a cluster — https://linuxcontainers.org/incus/docs/main/howto/cluster_manage/
- Incus official documentation: Initialize Incus — https://linuxcontainers.org/incus/docs/main/howto/initialize/
- Incus official documentation: Remote API authentication — https://linuxcontainers.org/incus/docs/main/authentication/
- Incus manpage: `incus cluster info` — https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/cluster/info/
- Incus manpage: `incus list` — https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/list/
- Incus manpage: `incus admin init` — https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/admin/init/
- Incus storage driver reference: Ceph — https://linuxcontainers.org/incus/docs/main/reference/storage_ceph/
- Incus GitHub issue #52: Eliminate `core.trust_password` — https://github.com/lxc/incus/issues/52

## Issues Found

1. **Trust password authentication prompts in bootstrap init are obsolete.** The post's interactive prompt sample for `incus admin init` on the bootstrap node included:
   ```
   Setup password authentication on the cluster? (yes/no) [default=no]: yes
   Trust password for new clients: <enter a strong password>
   Again: <repeat password>
   ```
   Incus deliberately removed `core.trust_password` early in its fork from LXD; new members and clients must now be added via one-time tokens (`incus cluster add <name>` / `incus config trust add`) or via OIDC. Those three prompt lines never appear in modern Incus, and the rest of the post already uses the correct token-based join workflow. I removed the three prompt lines so the example matches what `incus admin init` actually asks.

2. **`incus cluster info` was called without a required member argument.** Under "Monitor Cluster Health" the post had:
   ```
   # Check for any cluster issues
   incus cluster info
   ```
   The `incus cluster info` command's documented syntax is `incus cluster info [<remote>:]<member> [flags]` — the member name is required. Running it bare returns a usage error. I changed the example to `incus cluster info node1` and updated the comment to reflect that it returns state/resource usage for a specific member.

## Review Notes

- The post's NFS section creates a shared storage pool with `incus storage create shared dir source=/mnt/incus-nfs`. The `dir` driver on an NFS mount is technically functional as shared storage, but it is not an optimized or officially recommended live-migration backend (no copy-on-write, no native snapshots, and POSIX semantics over NFS can be problematic for some workloads). Ceph (Option B) is correctly flagged as the production-recommended path. No change required.
- The `incus admin init` size prompt sample shows `50GiB` as the answer to "Size in GiB of the new loop device". The prompt name implies a bare numeric value (e.g. `50`); Incus generally accepts unit suffixes here, so this is not strictly wrong, but readers copying verbatim should be aware that just typing `50` is the canonical answer. Left unchanged.
- For multi-member, member-specific storage pool creation in a cluster, Incus best practice is the two-step pattern (`incus storage create <pool> <driver> --target <member>` per node, then a final `incus storage create <pool> <driver>` to commit). The post sidesteps this by using `incus admin init` on each node for the local pool and a single command for Ceph (whose source is shared), which works for the scenarios shown. Worth highlighting in a future revision if member-specific pool creation outside `init` is added.
- Cluster minimum for HA quorum is correctly stated as 3. A 1- or 2-member cluster is technically supported (with reduced/no fault tolerance) but is out of scope for this guide.
- Package names (`incus`, `incus-tools`), the `incus admin init` entrypoint, `incus cluster add` / `evacuate` / `remove` / `remove --force`, column codes used in `incus list -c n,s,4,L` and `-c n,s,m,t,L`, the Ceph storage create syntax, and the `incus move --target` live-migration command are all correct against current Incus documentation.
