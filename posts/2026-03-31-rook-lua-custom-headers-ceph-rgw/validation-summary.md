# Validation Summary: How to Add Custom Headers with Lua in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Lua scripting in Ceph RGW (preRequest and postRequest contexts)
- S3 object metadata (`x-amz-meta-*`)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI

## Sources Consulted
- Ceph Lua Scripting documentation (https://docs.ceph.com/en/latest/radosgw/lua-scripting/)
- Ceph Lua Scripting documentation - Quincy (https://docs.ceph.com/en/quincy/radosgw/lua-scripting/)
- Ceph source code: `src/rgw/rgw_lua_request.cc` (https://github.com/ceph/ceph/blob/main/src/rgw/rgw_lua_request.cc)
- radosgw-admin man page (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Previously validated blog posts in this repository that corrected the same API misuse (rook-lua-scripting-ceph-rgw, rook-lua-request-processing-ceph-rgw, rook-lua-data-transformation-ceph-rgw, rook-lua-rate-limiting-ceph-rgw)

## Issues Found

1. **`Response.HTTP.AddHeader()` does not exist — entire post premise was wrong (all 6 steps)**: The Ceph RGW Lua API does not have a standalone `Response` global object, and there is no `AddHeader()` method anywhere in the API. The actual `Request.Response` object (available in postRequest context) only exposes `HTTPStatusCode`, `HTTPStatus`, `RGWCode`, and `Message` — all for inspection, not for adding arbitrary HTTP response headers. Every code example in the original post (Steps 1-5) called `Response.HTTP.AddHeader()`, which would fail at runtime. This is the same error found and corrected in at least four other blog posts in this repository.

2. **Title and description claimed Lua can add HTTP response headers**: Changed the title from "How to Add Custom Headers with Lua in Ceph RGW" to "How to Add Custom Object Metadata and Log Requests with Lua in Ceph RGW" and updated the description to accurately reflect what Lua scripts can do.

3. **All code examples rewrote to use correct APIs**:
   - **Step 1** (Basic Header Addition → Basic Metadata Addition): Changed from `Response.HTTP.AddHeader()` to `Request.HTTP.Metadata["key"] = "value"` in preRequest context, which adds custom `x-amz-meta-*` metadata to stored objects.
   - **Step 2** (Add Security Headers → Security Request Auditing): Security response headers (HSTS, CSP, X-Frame-Options, etc.) cannot be set via Lua. Rewrote to demonstrate security auditing by logging request details and failed requests via `RGWDebugLog()` in postRequest context.
   - **Step 3** (Dynamic CORS Headers → Origin Validation): CORS response headers cannot be set via Lua. Rewrote to validate request origins in preRequest context and block unauthorized origins using `Request.Response.HTTPStatusCode = 403` and `return RGW_ABORT_REQUEST`.
   - **Step 4** (Cache Control Headers → Metadata Tagging by Bucket Type): Cache-Control response headers cannot be set via Lua. Rewrote to tag uploaded objects with cache-tier metadata using `Request.HTTP.Metadata` in preRequest context, enabling downstream systems to apply caching policies.
   - **Step 5** (Observability and Tracing Headers → Observability and Tracing Logging): Rewrote to emit structured log lines via `RGWDebugLog()` in postRequest context instead of attempting to add response headers.
   - **Step 6** (Deploy and Validate): Updated deployment commands to show uploading scripts to both preRequest and postRequest contexts, and changed validation to check object metadata via `aws s3api head-object` and Lua debug logs instead of checking for non-existent response headers.

4. **Summary section incorrectly claimed "full control over HTTP response headers"**: Rewrote to accurately describe what Lua scripts can do (metadata tagging, origin validation, audit logging) and added a note that response headers like HSTS, CORS, and Cache-Control require a reverse proxy in front of RGW.

## Review Notes
- The `preRequest`/`postRequest` context names use camelCase while the official documentation canonical form is lowercase (`prerequest`/`postrequest`). Both forms work because `radosgw-admin` does a case-insensitive comparison on the context string. Left as-is since the camelCase form is functionally correct and matches common community usage.
- `Request.HTTP.Metadata` writes in preRequest context only affect PUT/POST operations (object uploads). The corrected examples in Steps 1 and 4 correctly guard against non-upload methods with an early return.
- The Lua code throughout is syntactically valid Lua 5.3/5.4.
- The `radosgw-admin script put` command syntax is correct.
- The kubectl log-checking command uses the correct label selector (`app=rook-ceph-rgw`) for Rook-managed RGW pods.
- For production CORS, HSTS, and Cache-Control response headers, a reverse proxy (nginx, HAProxy, or envoy) in front of RGW is the correct approach — this is noted in the corrected summary.
