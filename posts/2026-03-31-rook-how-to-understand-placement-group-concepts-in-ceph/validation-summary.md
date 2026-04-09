# Validation Summary: How to Understand Placement Group Concepts in Ceph

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph CRUSH algorithm
- Ceph Placement Groups (PGs)
- Ceph PG Autoscaler (Nautilus+)
- Ceph CLI (`ceph osd pool`, `ceph osd map`, `ceph pg stat`)

## Sources Consulted
- Ceph official documentation on Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on CRUSH: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on PG Autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found

1. **Incorrect label in object-to-PG mapping diagram**: The diagram labeled the first step as "CRUSH hash", but the object-to-PG mapping uses a standard hash function (e.g., xxHash) modulo `pg_num`, not CRUSH. CRUSH is only involved in the second step (PG-to-OSD mapping). Changed `(CRUSH hash)` to `(hash mod pg_num)`.

2. **Incorrect description of pool ID role in hashing**: The text stated Ceph uses "a hash of the object name (and optionally the pool ID)" to determine PG placement. The pool ID is not optional — it is always combined with the hash result to form the full PG identifier (e.g., `1.14` where `1` is the pool ID). Rewrote to clarify that the hash is of the object name modulo `pg_num`, and the pool ID is always combined with the result.

## Review Notes
- All CLI commands (`ceph osd pool create`, `ceph osd pool ls detail`, `ceph osd map`, `ceph osd pool get`, `ceph osd pool set`, `ceph osd pool autoscale-status`, `ceph -s`, `ceph pg stat`) are correct and current.
- The PG sizing formula (100-200 PGs per OSD / replication factor) matches the commonly cited Ceph community guidelines.
- The description of PG merging being available from Nautilus onward is correct.
- The `pg_autoscale_mode on` command is correct for enabling the autoscaler.
- The `target_size_bytes` value of 1099511627776 correctly equals 1 TiB (1024^4).
- The explanation of `pg_num` vs `pgp_num` is accurate — `pgp_num` controls when CRUSH actually remaps PGs to new OSDs after a split.
