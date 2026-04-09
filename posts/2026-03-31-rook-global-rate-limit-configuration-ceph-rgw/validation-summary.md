# Validation Summary: How to Enable Global Rate Limit Configuration in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- Kubernetes (kubectl)

## Sources Consulted
- Ceph RGW Admin Guide — https://docs.ceph.com/en/latest/radosgw/admin/
- radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph radosgw-admin help.t (command list) — https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph RGW Rate Limiting Blog Post — https://ceph.io/en/news/blog/2025/rgw-rate-limiting/
- Ceph Quincy v17.2.0 Release Notes — https://ceph.io/en/news/blog/2022/v17-2-0-quincy-released/
- Ceph RGW Config Reference — https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph RGW options source (rgw.yaml.in) — https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in

## Issues Found

1. **Section title "Setting Global Rate Limits" showed quota commands, not rate limit commands.** Renamed to "Setting Global Quotas" since the commands (`radosgw-admin global quota set`) configure quotas (storage size and object count limits), not rate limits (ops/bytes per time window).

2. **`rgw_max_listing_results` and `rgw_max_concurrent_requests` presented as rate limiting config options.** These are NOT rate limiting parameters — `rgw_max_listing_results` is a pagination control for bucket listing requests, and `rgw_max_concurrent_requests` controls HTTP concurrency in the beast frontend. Removed these misleading `ceph config set` commands and updated the section to only show the correct `radosgw-admin global ratelimit` commands.

3. **Priority order described as a hierarchy (bucket > user > global) was inaccurate.** In Ceph RGW, per-user and per-bucket rate limits override the global default for their respective scopes, but when both user-level and bucket-level limits are active, they are enforced simultaneously — a request is rejected if either limit is exceeded. Rewrote the section to accurately describe this behavior.

4. **Rook toolbox command had a shell escaping bug.** The `&&` in `kubectl exec ... -- radosgw-admin ... && radosgw-admin ...` would cause the second command to execute on the local machine instead of inside the container. Fixed by wrapping both commands in `bash -c '...'` so both run inside the toolbox pod.

## Review Notes
- The `radosgw-admin global ratelimit` commands omit `--max-list-ops` and `--max-delete-ops` parameters available in newer Ceph versions. This is acceptable for a Quincy-focused tutorial but could be noted in a future update.
- The JSON output example shows a flat object structure, but some Ceph versions may wrap the output under a `"user_ratelimit"` key. The fields shown are correct.
- The `global ratelimit get` command is shown with `--ratelimit-scope user`, which works but is not explicitly demonstrated in all official docs examples.
