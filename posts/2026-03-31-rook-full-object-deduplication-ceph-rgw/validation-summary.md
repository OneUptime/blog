# Validation Summary: How to Set Up Full Object Deduplication in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RADOS
- radosgw-admin CLI
- Object deduplication

## Sources Consulted
- Ceph official documentation: RGW S3 Objects Dedup (https://docs.ceph.com/en/latest/radosgw/s3_objects_dedup/)
- Ceph source: radosgw-admin help test showing all subcommands (https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t)
- Ceph source: RGW config options (https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in)
- Ceph official documentation: RADOS-level deduplication (https://docs.ceph.com/en/latest/dev/deduplication/)
- Ceph source: radosgw-admin man page (https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst)

## Issues Found

1. **Fabricated config options `rgw_dedup_chunk_algo` and `rgw_dedup_index_type`**: These Ceph config options do not exist. The only real dedup-related RGW config option is `rgw_dedup_min_obj_size_for_dedup` (default 64 KB). Replaced the fabricated options with the correct one.

2. **Wrong claim that dedup happens at upload time**: The post stated "RGW dedup computes a fingerprint (hash) of object content at upload time." This is incorrect. RGW dedup is an offline batch process run by an administrator using `radosgw-admin dedup`. Rewrote the explanation to accurately describe the offline scanning process.

3. **Zone placement modify for dedup is incorrect**: The command `radosgw-admin zone placement modify --data-extra-pool default.rgw.buckets.data.dedup` was presented as enabling dedup. The `--data-extra-pool` flag exists but is for non-EC data (multipart uploads), not dedup. Removed this command entirely.

4. **`radosgw-admin dedup` used with invented flags**: The post used `radosgw-admin dedup --pool ... --num-shards ... --chunk-pool ...`. These flags do not exist for the `radosgw-admin dedup` subcommand. Replaced with the correct commands: `radosgw-admin dedup estimate` for estimation and `radosgw-admin dedup exec --yes-i-really-mean-it` for execution.

5. **`radosgw-admin dedup status` does not exist**: The correct command is `radosgw-admin dedup stats`. Fixed.

6. **`radosgw-admin dedup estimate --pool` uses invented flag**: The `dedup estimate` subcommand does not take a `--pool` argument; it operates across all RGW buckets. Fixed to just `radosgw-admin dedup estimate`.

7. **Added missing dedup lifecycle commands**: Added the `pause`, `resume`, and `abort` subcommands which are part of the actual `radosgw-admin dedup` tooling and useful for operators.

## Review Notes
- The "Verifying Deduplication with RADOS" section uses a plausible but simplified approach to checking RADOS objects. The actual internal object naming in RGW is more complex than `${MARKER}_file.txt`, but the general concept is illustrative and acceptable for a blog post.
- The "Important Considerations" section is accurate: encryption does prevent dedup, minimum size thresholds apply, and versioned objects add complexity.
- The blog post conflates RGW-level dedup (`radosgw-admin dedup`) with RADOS-level dedup (`ceph-dedup-tool`). These are separate systems. The corrected post now focuses correctly on the RGW-level dedup mechanism.
- RGW dedup is a relatively new feature and may still be considered experimental in some Ceph releases. Users should test in non-production environments first.
