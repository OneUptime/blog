# Validation Summary: How to Configure Default and Global Quotas in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Ceph configuration system (`ceph config`)
- Rook Ceph operator (Kubernetes)
- kubectl

## Sources Consulted
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- radosgw-admin man page (ManKier): https://www.mankier.com/8/radosgw-admin
- Ceph RGW Admin Guide (quota section): https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph RGW Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph source: radosgw-admin help.t test file (https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t)
- Ceph PR #6400 (default quota config options): https://github.com/ceph/ceph/pull/6400
- Ceph PR #14252 (global quota commands): https://github.com/ceph/ceph/pull/14252
- Ceph commit 5c92d1d (default quota implementation): https://github.com/ceph/ceph/commit/5c92d1d2f11d59651eaa9c4ba6476b9f71990f1c

## Issues Found

### 1. Non-existent `radosgw-admin zone modify` quota flags
**What was wrong:** The post used `radosgw-admin zone modify --default-quota-max-size`, `--default-quota-max-objects`, `--default-bucket-quota-max-size`, and `--default-bucket-quota-max-objects`. These flags do not exist in any version of radosgw-admin.
**What was changed:** Replaced with `ceph config set client.rgw rgw_user_default_quota_max_size` and `rgw_user_default_quota_max_objects` (and the bucket equivalents), which are the documented way to configure default quotas.
**Why:** The radosgw-admin man page and Ceph source code confirm `zone modify` does not accept quota-related flags. Default quotas are set via Ceph config options.

### 2. Incorrect zone JSON field name in verification command
**What was wrong:** `jq '.default_user_quota'` — the field `default_user_quota` does not exist in the zone JSON.
**What was changed:** Replaced the verification approach with `ceph config get client.rgw rgw_user_default_quota_max_size` to match the new config-based approach.
**Why:** The zone JSON uses `user_quota` and `bucket_quota` for zone-level quotas. Default quotas are config options, not zone JSON fields.

### 3. Non-existent config option names in Global Quotas section
**What was wrong:** `rgw_user_quota_max_size`, `rgw_bucket_quota_max_size`, and `rgw_quota_check_threads` do not exist as Ceph config options.
**What was changed:** Replaced with `radosgw-admin global quota set/enable` commands, which are the correct way to set zone-level global quota hard caps.
**Why:** Global quotas are managed through `radosgw-admin global quota` subcommands (introduced in Ceph PR #14252), not through `ceph config set`. The option `rgw_quota_check_threads` does not exist at all; the related option is `rgw_enable_quota_threads` (a boolean to enable/disable the quota maintenance thread).

### 4. Rook kubectl command structure bug
**What was wrong:** The `&&` operator was outside the `kubectl exec -- ...` boundary, causing `radosgw-admin period update --commit` to run on the local machine instead of inside the toolbox container.
**What was changed:** Wrapped the commands in `bash -c '...'` and updated to use the correct `ceph config set` commands.
**Why:** In `kubectl exec ... -- command`, `&&` is interpreted by the local shell, not the container shell, unless the entire command is wrapped in a shell invocation.

### 5. Typo in Summary section
**What was wrong:** "per-object configuration" should be "per-user configuration".
**What was changed:** Fixed to "per-user configuration".
**Why:** The post is about user and bucket quotas, not object-level configuration.

### 6. Summary section outdated references
**What was wrong:** Summary referenced `zone modify` and period commits as the mechanism for default quotas.
**What was changed:** Updated to reference `ceph config set` with `rgw_user_default_quota_*` / `rgw_bucket_default_quota_*` options and `radosgw-admin global quota` for hard caps.
**Why:** Aligns the summary with the corrected commands in the body of the post.

## Review Notes
- The bulk script for applying quotas to existing users (the `while read` loop) is correct and uses valid `radosgw-admin quota set/enable` commands.
- The `radosgw-admin user create` and `radosgw-admin quota get` commands in the Testing section are correct.
- In multisite deployments, `radosgw-admin period update --commit` is needed after global quota changes. In single-site deployments, RGW daemons may need to be restarted for global quota changes to take effect.
- Default quota values use -1 to mean disabled/unlimited (not 0). The post's bulk script correctly checks for `-1` as the "no quota" sentinel value.
