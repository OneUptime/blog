# Validation Summary: How to Implement Access Control Logic with Lua in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Lua scripting in Ceph RGW
- S3-compatible object storage access control
- radosgw-admin CLI
- AWS CLI (for testing)

## Sources Consulted
- Ceph official documentation - Lua Scripting: https://docs.ceph.com/en/latest/radosgw/lua-scripting/
- Ceph Quincy documentation - Lua Scripting: https://docs.ceph.com/en/quincy/radosgw/lua-scripting/
- Ceph Pacific v16.2.0 Release Notes: https://ceph.io/en/news/blog/2021/v16-2-0-pacific-released/
- Ceph RGW Lua source code (rgw_lua_request.cc): https://github.com/ceph/ceph/blob/main/src/rgw/rgw_lua_request.cc
- Ceph RGW operation names (rgw_op.h): https://github.com/ceph/ceph/blob/main/src/rgw/rgw_op.h

## Issues Found

1. **Incorrect version requirement**: Post stated "Octopus (15.2+)". Lua scripting was introduced in **Pacific (16.2+)**, not Octopus. Fixed to "Pacific (16.2+)".

2. **Non-existent configuration option**: Post listed `rgw_lua_scripting = true` as a prerequisite. This config option does not exist. Lua scripting is enabled by default in Pacific+ and is managed entirely through `radosgw-admin` commands. Removed the incorrect prerequisite.

3. **Incomplete hook point documentation**: Post stated RGW exposes only two hook points (`preRequest` and `postRequest`). There are actually five: `prerequest`, `postrequest`, `background`, `getdata`, and `putdata`. Updated to list all five.

4. **Incorrect hook point casing**: Post used camelCase (`preRequest`, `postRequest`) but the correct context names are lowercase (`prerequest`, `postrequest`). Fixed throughout the post including in `radosgw-admin` commands.

5. **Incorrect user ID field**: Post used `Request.UserId`. The correct field is `Request.User.Id` (User is a sub-table). Fixed in all three Lua code examples.

6. **Incorrect environment field**: Post used `Request.Env["REMOTE_ADDR"]`. The correct field is `Request.Environment["REMOTE_ADDR"]`. Fixed in both IP-related code examples.

7. **Non-existent error function**: Post used `RGWError(status_code, message)` to abort requests. This function does not exist in the RGW Lua API. The correct approach is to set `Request.Response.HTTPStatusCode` and `Request.Response.Message`, then `return RGW_ABORT_REQUEST`. Fixed in all three Lua code examples.

## Review Notes
- The Lua pattern matching syntax (e.g., `^prod%-`, `^10%.0%.`) is correct -- `%` is the escape character in Lua patterns.
- The operation string values used (`delete_obj`, `delete_bucket`, `put_obj`, `copy_obj`) are all valid RGW operation names.
- The `Request.Bucket.Name` and `Request.RGWOp` field paths are correct.
- The combined script example was restructured to properly use `return RGW_ABORT_REQUEST` at the top level (since `return` from within a function only returns from that function, not the script).
- The claim that RGW supports only one script per hook context is correct.
