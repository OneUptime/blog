# Validation Summary: How to Implement Rate Limiting with Lua in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- Lua scripting in RGW
- radosgw-admin CLI
- S3-compatible API rate limiting
- Prometheus metrics monitoring

## Sources Consulted
- Ceph RGW Lua Scripting documentation (https://docs.ceph.com/en/latest/radosgw/lua-scripting/ via GitHub raw source at https://raw.githubusercontent.com/ceph/ceph/main/doc/radosgw/lua-scripting.rst)
- Ceph RGW Admin documentation for rate limiting (https://raw.githubusercontent.com/ceph/ceph/main/doc/radosgw/admin.rst)
- Ceph RGW Lua source code (https://raw.githubusercontent.com/ceph/ceph/main/src/rgw/rgw_lua_request.cc and rgw_lua.cc) for API verification

## Issues Found

### Issue 1: `Response.HTTP.AddHeader()` does not exist (Step 3)
- **What was wrong:** The original Step 3 used `Response.HTTP.AddHeader()` to add custom HTTP response headers (X-RateLimit-Limit-Reads, X-RateLimit-Limit-Writes, X-RateLimit-User-Tier, X-RateLimit-Reset). This function does not exist in the RGW Lua API. The Response object (accessed via `Request.Response`) only exposes `HTTPStatusCode`, `HTTPStatus`, `RGWCode`, and `Message`. There is no mechanism to add custom HTTP response headers from Lua scripts.
- **What was changed:** Rewrote Step 3 to use `RGWDebugLog()` for logging rate limit information in the postrequest context, which is what the API actually supports. Added a note explaining the limitation. Renamed the script from `rate_limit_headers.lua` to `rate_limit_log.lua`.
- **Why:** The original code would fail at runtime since `Response` is not a global object and `AddHeader` is not a method on any RGW Lua table.

### Issue 2: `abort()` function does not exist (Step 4)
- **What was wrong:** The code used `abort(403, "AnonymousListNotAllowed", "Anonymous bucket listing is not permitted on this gateway.")`. There is no `abort()` function in the RGW Lua scripting API.
- **What was changed:** Replaced with the correct approach: setting `Request.Response.HTTPStatusCode = 403`, `Request.Response.HTTPStatus = "Forbidden"`, `Request.Response.Message = "..."`, and returning `RGW_ABORT_REQUEST`.
- **Why:** The only way to block a request in RGW Lua scripts is to return the `RGW_ABORT_REQUEST` global value. Response fields must be set before returning the abort signal.

### Issue 3: Incorrect global rate limiting CLI syntax (Step 5)
- **What was wrong:** The commands used `radosgw-admin ratelimit set --ratelimit-scope=global` and `radosgw-admin ratelimit enable --ratelimit-scope=global`. There is no `--ratelimit-scope=global` value. The valid scopes for the `ratelimit` subcommand are `user` and `bucket`.
- **What was changed:** Corrected to `radosgw-admin global ratelimit set --ratelimit-scope=bucket` and `radosgw-admin global ratelimit enable --ratelimit-scope=bucket`. Global rate limits are set using the `global ratelimit` subcommand and apply default limits to all entities of the specified scope (bucket or user).
- **Why:** Using `--ratelimit-scope=global` would produce an error. The `global` keyword is a subcommand modifier, not a scope value.

### Issue 4: Incorrect context name casing (Step 5)
- **What was wrong:** The `radosgw-admin script put` command used `--context=postRequest` (camelCase).
- **What was changed:** Corrected to `--context=postrequest` (lowercase) to match official documentation conventions.
- **Why:** While the RGW code uses case-insensitive comparison (so both forms work at runtime), the official documentation consistently uses lowercase (`prerequest`, `postrequest`, `background`, `getdata`, `putdata`). Using the canonical form avoids confusion.

### Issue 5: Script filename reference updated (Step 5)
- **What was wrong:** The `radosgw-admin script put` command referenced `rate_limit_headers.lua`.
- **What was changed:** Updated to `rate_limit_log.lua` to match the renamed script in Step 3.
- **Why:** Consistency with the corrected Step 3 script name.

## Review Notes
- The Lua comments in Steps 2 and 4 reference context names as `(preRequest)` in camelCase. While these are just code comments and not functional parameters, readers might copy this casing into actual commands. However, since these are just inline comments, they were left as-is to minimize changes.
- Step 2's Lua script is conceptual (logs but doesn't actually enforce rate limits). The post acknowledges this with the comment "In production, this would update a RADOS counter object." This is accurate since Lua scripts don't have persistent state between requests.
- The `os.time()` usage in the original Step 3 was valid - RGW opens standard Lua libraries including `os`. This was removed along with the rest of the header-based approach, but it was not itself an error.
- The `radosgw-admin ratelimit` commands in Step 1 for per-user rate limiting are correct.
- The Prometheus metrics endpoint port 9283 is the standard RGW Prometheus exporter port, which is correct.
