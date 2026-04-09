# Validation Summary: How to Write Request Processing Scripts with Lua in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Lua scripting in Ceph RGW
- S3 API request processing
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI

## Sources Consulted
- Ceph Lua Scripting documentation (https://docs.ceph.com/en/latest/radosgw/lua-scripting/)
- Ceph Lua Scripting documentation - Quincy (https://docs.ceph.com/en/quincy/radosgw/lua-scripting/)
- Ceph auto-tiering blog post with Lua examples (https://ceph.io/en/news/blog/2024/auto-tiering-ceph-object-storage-part-2/)
- Ceph source code: rgw_lua_request.cc (https://github.com/ceph/ceph/blob/main/src/rgw/rgw_lua_request.cc)
- radosgw-admin man page (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)

## Issues Found

1. **`Request.HTTP.ContentLength` does not exist (Step 2)**: The `ContentLength` field is a top-level field on the `Request` object, not nested under `Request.HTTP`. Fixed to `Request.ContentLength`.

2. **`abort()` function does not exist (Steps 2, 3, 4, 6)**: The Ceph RGW Lua API has no `abort()` global function. The correct way to abort a request is to set `Request.Response.HTTPStatusCode` and `Request.Response.Message`, then `return RGW_ABORT_REQUEST`. Fixed all four occurrences across the post.

3. **`Response.HTTP.AddHeader()` does not exist (Step 5)**: There is no standalone `Response` global object, and the RGW Lua API does not provide a mechanism to add arbitrary HTTP response headers. The actual `Request.Response` object only exposes `HTTPStatusCode`, `HTTPStatus`, `RGWCode`, and `Message`. Rewrote Step 5 entirely to demonstrate post-request response inspection and logging, which is the actual use case for postRequest scripts.

4. **"zero-overhead" claim in Summary is inaccurate**: Lua scripts run in-process (avoiding external IPC), but there is real overhead from Lua state initialization and execution. Ceph provides configurable limits (`rgw_lua_max_memory_per_state` at 128KB, `rgw_lua_max_runtime_per_state` at 1000ms) precisely because of this overhead. Changed to "low-overhead in-process hook".

5. **Step 6 pcall pattern needed restructuring**: Since `abort()` was replaced with `return RGW_ABORT_REQUEST`, the pcall pattern needed adjustment to propagate the return value from the inner function to the script's top-level return. Updated to capture and re-return `RGW_ABORT_REQUEST` after pcall.

## Review Notes
- The `preRequest`/`postRequest` context names use camelCase while the official documentation canonical form is lowercase (`prerequest`/`postrequest`). Both forms work because `radosgw-admin` does a case-insensitive comparison on the context string. Left as-is since the blog's form is functionally correct and matches common community usage.
- The Lua code is syntactically valid Lua 5.3/5.4 throughout.
- The `radosgw-admin script put` command syntax is correct.
- The kubectl log-checking command uses the correct label selector for Rook-managed RGW pods.
