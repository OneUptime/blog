# How to Use fs swap for CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS

Description: Learn how to use ceph fs swap to atomically exchange two CephFS filesystems, enabling zero-downtime migrations and blue-green filesystem deployments.

---

## What Is fs swap

`ceph fs swap` is a Ceph command that exchanges the names of two CephFS filesystems in a single FSMap update, ensuring there is no intermediate epoch where either filesystem name is missing. This allows you to perform a blue-green style deployment where you prepare a new filesystem with all the correct data and configuration, then swap it into place with a single command.

Both filesystems must be taken offline before the swap, and clients must remount afterward. This command is available in Ceph Squid (19.x) and later.

## Use Cases for fs swap

- **Blue-green filesystem deployment** - prepare a new filesystem offline, then swap it to production
- **Rolling back a bad migration** - quickly revert by swapping back to the previous filesystem
- **A/B testing** - alternate between two filesystem configurations without downtime
- **Disaster recovery testing** - swap a restored backup filesystem into production for validation

## Syntax

```bash
ceph fs swap <fs1-name> <fs1-id> <fs2-name> <fs2-id> --swap-fscids=<yes|no> --yes-i-really-mean-it
```

The command requires both the name and the filesystem cluster ID (FSCID) for each filesystem. The `--swap-fscids` flag controls whether the FSCIDs are also exchanged along with the names. After the command, `fs1` takes the name of `fs2` and vice versa.

## Example: Blue-Green Filesystem Migration

Start with a production filesystem named `myfs` and a new filesystem named `myfs-new`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

```bash
# Verify both filesystems exist
ceph fs ls
```

Output:

```text
name: myfs, metadata pool: myfs-metadata, data pools: [myfs-data ]
name: myfs-new, metadata pool: myfs-new-metadata, data pools: [myfs-new-data ]
```

Prepare the new filesystem with all desired data and configuration. Before swapping, take both filesystems offline and refuse client sessions:

```bash
ceph fs set myfs refuse_client_sessions true
ceph fs fail myfs
ceph fs set myfs-new refuse_client_sessions true
ceph fs fail myfs-new
```

Get the FSCID for each filesystem from the `ceph fs ls` or `ceph fs dump` output, then perform the swap:

```bash
# Replace 1 and 2 with the actual FSCIDs of myfs and myfs-new
ceph fs swap myfs 1 myfs-new 2 --swap-fscids=yes --yes-i-really-mean-it
```

After the swap:

```bash
ceph fs ls
```

Output:

```text
name: myfs, metadata pool: myfs-new-metadata, data pools: [myfs-new-data ]
name: myfs-new, metadata pool: myfs-metadata, data pools: [myfs-data ]
```

The name `myfs` now points to the pools that were `myfs-new`, and vice versa.

After the swap, bring the filesystems back online and allow client sessions:

```bash
ceph fs set myfs joinable true
ceph fs set myfs refuse_client_sessions false
ceph fs set myfs-new joinable true
ceph fs set myfs-new refuse_client_sessions false
```

Clients that mount by name (`-o fs=myfs`) will connect to the new backing pools once they remount.

## Client Remount Required

Both filesystems must be offline during the swap. Existing client mounts must remount after the swap completes, and any unflushed operations will be lost. CephX credentials may also need to be reauthorized if existing mounts should follow the old filesystem to its new name.

## Rolling Back

If the swap reveals a problem, roll back by taking the filesystems offline again and swapping back:

```bash
ceph fs set myfs refuse_client_sessions true
ceph fs fail myfs
ceph fs set myfs-new refuse_client_sessions true
ceph fs fail myfs-new

# Use the current FSCIDs after the first swap
ceph fs swap myfs 1 myfs-new 2 --swap-fscids=yes --yes-i-really-mean-it

ceph fs set myfs joinable true
ceph fs set myfs refuse_client_sessions false
ceph fs set myfs-new joinable true
ceph fs set myfs-new refuse_client_sessions false
```

This reverts the filesystem name mapping back to the original state.

## Rook Considerations

In Rook, `fs swap` operates at the Ceph layer and is not natively represented in the `CephFilesystem` CRD. After performing a swap:

1. The `CephFilesystem` CRD named `myfs` will now point to different pools than Rook expects
2. Restart the Rook operator to force re-reconciliation:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

3. Consider updating the `CephFilesystem` CRD to reflect the new pool assignments, or manage the swap entirely outside Rook for staging environments.

## Verifying the Swap

Confirm MDS daemons are active on the swapped filesystems:

```bash
ceph fs status myfs
ceph mds stat
```

## Summary

`ceph fs swap` exchanges the names of two CephFS filesystems in a single FSMap update, enabling blue-green deployments and easy rollbacks. Both filesystems must be taken offline before the swap, and clients must remount afterward. This is ideal for planned migrations where you prepare a new filesystem offline and then swap it into place. In Rook environments, manage the swap at the Ceph layer and restart the operator after swapping to ensure proper reconciliation.
