# Validation Summary: How to Understand Admin vs System Users in Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)
- S3/Swift object storage APIs
- jq (JSON processing)

## Sources Consulted
- Ceph RGW Admin API documentation: https://docs.ceph.com/en/latest/radosgw/adminops/
- Ceph RGW user management documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph RGW multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

1. **Incorrect jq output for boolean field (line 59):** The comment `# Output: "true"` showed a quoted string, but `jq '.system'` returns a bare boolean `true` (no quotes) since the `.system` field in the user info JSON is a boolean, not a string. Fixed to `# Output: true`.

2. **Comparison table: incorrect admin API access for system users (line 79):** The table claimed system users have "Full" admin API access. This is incorrect — the `--system` flag grants S3/Swift access to all buckets (bypassing ownership checks), but admin API access is still governed by caps. A system user without caps has no admin API access. Fixed to "Requires caps".

3. **Broken "find all system users" script (lines 103-104):** Two bugs:
   - `radosgw-admin user list` outputs a JSON array (e.g., `["user1", "user2"]`), not line-separated values. Piping directly to `xargs` doesn't work. Fixed by adding `jq -r '.[]'` to extract individual user IDs.
   - `select(.system=="true")` compares a boolean to a string, which never matches in jq. Fixed to `select(.system)` which correctly tests the boolean value.

## Review Notes
- The post correctly identifies the three user types and their general purposes. The security best practices section is sound advice.
- The claim that system users "bypass normal authorization checks" is accurate for S3/Swift data access but could be misread as applying to admin API access as well. The table fix helps clarify this distinction.
- The `radosgw-admin user list | grep "sync"` command on line 72 will work but the output is a JSON array, so the grep will match within the JSON string. This is functional but not the cleanest approach; however, it is not incorrect so it was left as-is.
