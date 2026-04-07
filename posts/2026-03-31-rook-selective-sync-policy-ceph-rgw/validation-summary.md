# Validation Summary: How to Configure Selective Sync with Sync Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multisite sync policy
- radosgw-admin CLI
- AWS CLI (for S3-compatible object tagging)

## Sources Consulted
- Ceph official documentation: Multisite Sync Policy - https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/
- Ceph GitHub source: doc/radosgw/multisite-sync-policy.rst - https://github.com/ceph/ceph/blob/main/doc/radosgw/multisite-sync-policy.rst
- Ceph.io blog on RGW multisite replication (Parts 5 & 6) - https://ceph.io/en/news/blog/2025/rgw-multisite-replication_part5/

## Issues Found
1. **Incorrect version attribution**: The post stated sync policy was "introduced in Pacific (16.2)". It was actually introduced in Octopus (15.2). Fixed to "Octopus (15.2)".

2. **Invalid `--prefix-rm=""` flag usage**: The `--prefix-rm` flag is a bare flag that takes no value. Removed the `=""` assignment.

3. **Wrong command syntax for bucket-level sync policy**: Step 4 used `radosgw-admin sync policy group create` and `radosgw-admin sync policy group pipe create`, which are not valid commands. The correct syntax is `radosgw-admin sync group create --bucket=...` and `radosgw-admin sync group pipe create --bucket=...`. Fixed all three occurrences in Step 4.

4. **Non-existent `--tag-name` and `--tag-value` flags**: These flags do not exist in radosgw-admin. The correct flag for adding tag filters to a pipe is `--tags-add=<key>=<value>`. Fixed to use `--tags-add=sync-required=true`.

## Review Notes
- The overall architecture explanation (groups, flows, pipes) is accurate and well-structured.
- The `period update --commit` step is correctly included after zonegroup-level policy changes.
- The verification commands in Step 6 are all valid.
