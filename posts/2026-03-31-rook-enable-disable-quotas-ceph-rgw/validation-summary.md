# Validation Summary: How to Enable and Disable Quotas in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Ceph official admin guide: https://docs.ceph.com/en/latest/radosgw/admin/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph admin.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/radosgw/admin.rst
- radosgw-admin.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst

## Issues Found

### 1. `radosgw-admin quota get` is not a valid subcommand
- **What was wrong:** The post used `radosgw-admin quota get --uid alice --quota-scope user` to retrieve quota information. The `quota get` subcommand does not exist in radosgw-admin. Only `quota set`, `quota enable`, and `quota disable` are valid quota subcommands.
- **What was changed:** Replaced with `radosgw-admin user info --uid alice | jq '.user_quota'`, which is the documented way to retrieve user quota information.
- **Why:** The official Ceph documentation specifies that quota settings are retrieved via the user information API (`user info`), not a `quota get` subcommand.

### 2. Bucket quota commands used incorrect syntax
- **What was wrong:** The bucket quota sections combined `--uid alice`, `--bucket mybucket`, and `--quota-scope bucket` in the same command. Per the Ceph docs, `--uid` and `--bucket` are mutually exclusive options with `--quota-scope bucket`: `--uid` sets a default quota for all buckets owned by a user, while `--bucket` sets a quota on a specific individual bucket.
- **What was changed:** Split the bucket quota sections into two examples each: one for a specific bucket (`--bucket mybucket`) and one for all buckets owned by a user (`--uid alice`), using the correct syntax for each.
- **Why:** The Ceph docs define the syntax as `{--bucket=<bucket name> | --uid=<uid>}`, making them mutually exclusive alternatives.

### 3. Quota output example was incomplete
- **What was wrong:** The JSON output example for quota verification only showed `enabled`, `max_size`, and `max_objects` fields.
- **What was changed:** Added `check_on_raw` and `max_size_kb` fields to match the actual output of `radosgw-admin user info`.
- **Why:** The real `user_quota` object in user info output includes these additional fields.

### 4. Quota status checking script used invalid command
- **What was wrong:** The "Checking Quota Status Across Users" script used `radosgw-admin quota get --uid "$UID" --quota-scope user` which is not a valid command.
- **What was changed:** Replaced with `radosgw-admin user info --uid "$UID" | jq -r '.user_quota.enabled'`.
- **Why:** Same reason as issue #1 — `quota get` does not exist; `user info` with jq extraction is the correct approach.

## Review Notes
- The two-step quota model explanation (set vs enable/disable) is accurate and well-explained.
- The bulk scripting examples are useful and the bash patterns are correct.
- The "When to Use Disable vs Remove" section is accurate — setting values to -1 does effectively remove limits while keeping tracking active.
- The `radosgw-admin user list | jq -r '.[]'` pattern for iterating users is correct.
