# Validation Summary: How to Set Permission Levels (r, w, x, class-read, class-write) in Ceph

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Ceph (RADOS, OSD capabilities, CephX authentication)
- Rook (CSI driver, RBD provisioning)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation: ceph-authtool manpage (https://docs.ceph.com/en/latest/man/8/ceph-authtool/) — authoritative grammar for OSD capability strings
- Ceph User Management documentation (https://docs.ceph.com/en/latest/rados/operations/user-management/) — profile rbd, permission descriptions, and examples
- Ceph Basic Block Device Commands (https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/) — RBD-specific auth requirements

## Issues Found
1. **`r` permission description included "pool metadata"**: The table described `r` as "Read - can read objects and pool metadata." The official OSD capability documentation defines `r` as "read access to objects" only. Pool metadata reading is associated with monitor capabilities, not OSD capabilities. Fixed by removing "and pool metadata" from the table entry.

## Review Notes
- The `w` permission is described as allowing "write and delete objects." While the official docs only say "write access to objects," deletion is a write-class operation in RADOS, so this is technically correct in practice.
- The `x` permission description is accurate. The docs explicitly note that `x` is equivalent to `class-read class-write` combined, which aligns with the blog's later statement that `allow rwx` equals `allow rw class-read class-write`.
- The `profile rbd` description is slightly oversimplified. In addition to granting rwx on the specified pool, `profile rbd` also grants cross-pool class-read access for the `rbd_children` object (needed for RBD clone/snapshot tracking). This nuance is omitted but acceptable for the scope of this blog post.
- The `allow *` description ("includes all permissions including class calls") is correct but incomplete — `allow *` is actually `rwx` plus the ability to run OSD admin commands (`ceph osd tell ...`). This is a minor omission that doesn't affect the post's usefulness.
- All `ceph auth get-or-create` command examples use correct syntax per the OSD capability grammar.
- The capability combination examples (`rx`, `rwx`, comma-separated per-pool rules) are all syntactically valid.
