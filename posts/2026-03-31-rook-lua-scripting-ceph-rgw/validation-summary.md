# Validation Summary: How to Use Lua Scripting with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Lua scripting engine in RGW
- radosgw-admin CLI
- S3 object storage operations
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation: Lua Scripting section (`doc/radosgw/lua-scripting.rst`)
- Ceph source code: `src/rgw/rgw_lua_request.cc` (Lua request/response field definitions)
- Ceph source code: `src/rgw/rgw_lua.h` and `src/rgw/rgw_lua.cc` (script context enum and management)
- radosgw-admin CLI help output (`radosgw-admin --help`, subcommand help for `script`)

## Issues Found

1. **`Response.RGWSetHeader()` does not exist** — The blog used `Response.RGWSetHeader("X-Custom-RGW", "processed-by-lua")` to set a custom response header. This function does not exist in the Ceph RGW Lua API. There is no mechanism to add arbitrary HTTP response headers. Changed the example to set object metadata via `Request.HTTP.Metadata["custom-rgw"] = "processed-by-lua"`, which is a real and useful capability.

2. **`RGWAbortRequest()` does not exist** — The blog used `RGWAbortRequest(status_code, error_code, message)` in three places to abort requests. This function is fabricated. The correct mechanism is to set `Request.Response.HTTPStatusCode` and `Request.Response.Message`, then `return RGW_ABORT_REQUEST`. Fixed all three occurrences (basic script, Content-Type policy, and the implicit pattern).

3. **`radosgw-admin script list` does not exist** — There is no `script list` subcommand. The only way to check deployed scripts is `script get --context <context>` for each context. Removed the nonexistent command and renamed the section from "Listing and Getting Scripts" to "Getting a Stored Script".

4. **`Request.BucketName` should be `Request.Bucket.Name`** — The bucket name is accessed via a nested Bucket table, not a direct field. Fixed in the basic script example.

5. **`Request.ObjectName` should be `Request.Object.Name`** — Same as above; the object name is accessed via a nested Object table. Fixed in the basic script example.

6. **`Request.HTTP.meta` should be `Request.HTTP.Metadata`** — Lua is case-sensitive and the canonical field name is `Metadata`. Fixed in the metadata enrichment example.

7. **`Request.User.id` should be `Request.User.Id`** — The canonical field name uses PascalCase (`Id`, not `id`). Fixed in the metadata enrichment example.

8. **`Response.HTTPStatusCode` should be `Request.Response.HTTPStatusCode`** — The Response object is not a standalone global; it is nested under `Request.Response`. Fixed in the variables reference section.

9. **Variables reference section was incomplete** — Added `Request.HTTP.ContentType`, `Request.HTTP.Metadata`, and `Request.Response.Message` to the reference table since these are used in the post's examples.

## Review Notes
- The post uses `preRequest`/`postRequest` casing for context names. The canonical documented form is lowercase (`prerequest`/`postrequest`), but the `radosgw-admin` CLI parser is case-insensitive, so the blog's casing works. Not changed since it's arguably more readable.
- The post only mentions two execution contexts (preRequest, postRequest). Ceph RGW actually supports five: `prerequest`, `postrequest`, `background`, `getdata`, and `putdata`. The additional contexts are out of scope for this post's focus but could be mentioned in a future update.
- The `script-package` subcommands (`add`, `rm`, `list`, `reload`) for managing allowed Lua packages are not covered. This is a reasonable omission for an introductory post.
- The `os.time()` usage in the metadata example assumes the `os` Lua standard library is available in the RGW Lua sandbox. This depends on Ceph build configuration and may not be available in all deployments.
