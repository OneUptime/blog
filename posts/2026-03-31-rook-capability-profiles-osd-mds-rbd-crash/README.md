# How to Use Capability Profiles (profile osd, mds, rbd, crash) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how Ceph capability profiles simplify user creation by bundling required permissions for common roles like OSD, MDS, RBD, and crash collection.

---

## What Are Capability Profiles

Capability profiles are pre-defined shorthand strings in Ceph that bundle the correct permissions for well-known roles. Instead of manually specifying every individual permission, you use a profile name and Ceph expands it to the appropriate capability set. This reduces errors and ensures daemon users get exactly the permissions they need.

Profiles are used in the `mon`, `osd`, and `mgr` subsystem caps when creating users.

## profile osd

Used for OSD daemons. Grants the permissions needed for an OSD to operate - bootstrapping, heartbeats, recovering data, and communicating with monitors:

```bash
ceph auth get-or-create osd.99 \
  mon 'allow profile osd' \
  osd 'allow *' \
  mgr 'allow profile osd'
```

When Rook provisions OSD pods, they use a key with these capabilities. Manually created OSDs must use `profile osd` in mon and mgr caps.

## profile mds

Used for MDS (CephFS metadata server) daemons:

```bash
ceph auth get-or-create mds.0 \
  mon 'allow profile mds' \
  osd 'allow rwx' \
  mds 'allow'
```

The `profile mds` mon cap allows MDS-specific monitor communications like reporting state and receiving cluster maps.

## profile rbd

Used for RBD clients. Grants the appropriate permissions for block device operations including image creation, snapshots, and clones:

```bash
# RBD client with profile
ceph auth get-or-create client.rbd-app \
  mon 'profile rbd' \
  osd 'profile rbd pool=rbd'
```

The `profile rbd` in OSD caps is equivalent to `allow rwx` plus the necessary class-read and class-write permissions for the specified pool.

For read-only RBD access:

```bash
ceph auth get-or-create client.rbd-readonly \
  mon 'profile rbd' \
  osd 'profile rbd-read-only pool=rbd'
```

## profile rbd-mirror

Used for the RBD mirroring daemon:

```bash
ceph auth get-or-create client.rbd-mirror \
  mon 'profile rbd-mirror' \
  osd 'profile rbd pool=rbd'
```

## profile crash

Used for the crash collector daemon. The crash module collects crash reports from Ceph daemons and stores them in the cluster:

```bash
ceph auth get-or-create client.crash \
  mon 'allow profile crash' \
  mgr 'allow profile crash'
```

Rook automatically creates a `client.rook-ceph-crash` user with these capabilities when the crash collector is enabled in the `CephCluster` CR.

## profile bootstrap-osd and bootstrap-mds

Bootstrap profiles are used during the initialization of new daemons. They grant limited one-time permissions to create daemon-specific keyrings:

```bash
ceph auth get-or-create client.bootstrap-osd \
  mon 'profile bootstrap-osd'

ceph auth get-or-create client.bootstrap-mds \
  mon 'profile bootstrap-mds'
```

## Verifying Profile Expansion

After creating a user with a profile, inspect the actual expanded caps:

```bash
ceph auth get client.rbd-app
```

Sample output:

```text
[client.rbd-app]
    key = AQD...==
    caps mon = "profile rbd"
    caps osd = "profile rbd pool=rbd"
```

Note: Ceph stores the profile string, not the expanded permissions. The actual permission check is done at the server side.

## Profiles in Rook CephCluster

Rook uses profiles internally when creating its service users. You can verify this:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth ls --format json | jq -r '.auth_dump[] | "\(.entity): mon=\(.caps.mon // "none")"'
```

Typical output showing Rook's use of profiles:

```text
client.csi-rbd-node: mon=profile rbd
client.csi-cephfs-node: mon=allow r
osd.0: mon=allow profile osd
```

## Summary

Ceph capability profiles (`profile osd`, `profile mds`, `profile rbd`, `profile rbd-read-only`, `profile crash`, `profile bootstrap-*`) bundle the correct permission sets for well-known daemon and client roles. Using profiles instead of manually specifying capabilities reduces errors and ensures compatibility across Ceph versions. Rook relies heavily on these profiles for its internal service users.
