# Validation Summary: How to Set Up Automatic PG Rebalancing in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (placement groups, pg_autoscaler module)
- Rook (CephBlockPool CRD)
- Ceph CLI (ceph mgr, ceph osd pool, ceph config)

## Sources Consulted
- Ceph official documentation on Placement Groups (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph pg_autoscaler module documentation (https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups)
- Ceph pg_autoscaler source code (`src/pybind/mgr/pg_autoscaler/module.py`)
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph configuration reference for `mon_target_pg_per_osd`

## Issues Found

1. **Incorrect JSON field names in autoscale-status example output**: The field `actual_pg_num` does not exist in the autoscaler JSON output; the correct field name is `pg_num_target`. The field `would_benefit_from_increasing` does not exist; the correct field name is `would_adjust`. Fixed both field names.

2. **Wrong description for `mon_target_pg_per_osd`**: The comment described it as "Minimum ratio change before acting (default 3x)", which conflates two different concepts. `mon_target_pg_per_osd` sets the target number of PGs per OSD (default 100). The 3x threshold is a separate hardcoded behavior in the autoscaler. Fixed the comment to accurately describe the option.

3. **Incorrect pool parameter name `pg_num_bias`**: This parameter does not exist. The correct parameter name is `pg_autoscale_bias`. Fixed.

4. **Shell quoting bug in `watch` command**: `watch ceph -s | grep remapped` is parsed incorrectly by the shell -- the pipe is interpreted by the outer shell, not by `watch`. Fixed to `watch 'ceph -s | grep remapped'`.

5. **Redundant `python3 -m json.tool` with `--format json-pretty`**: The `--format json-pretty` flag already produces formatted output, making the pipe to `python3 -m json.tool` redundant. Changed to `--format json` so the pipe is useful.

## Review Notes
- The `target_size_bytes` example uses 1099511627776 and comments it as "1 TB". This is technically 1 TiB (tebibyte, 1024^4), not 1 TB (terabyte, 10^12). This is common shorthand and not changed, but readers should be aware of the distinction.
- Setting `pgp_num` manually (in the manual PG adjustment section) is unnecessary in Ceph Nautilus (14.2.x) and later, as `pgp_num` automatically follows `pg_num`. The commands are not wrong but are redundant for modern Ceph. Not changed since the post does not specify a Ceph version and the commands remain valid.
- The `pg_autoscaler` module is enabled by default starting in Ceph Octopus (15.2.x). The post's enable commands are still valid for older clusters or cases where it was disabled.
