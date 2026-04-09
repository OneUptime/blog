# Validation Summary: How to Use Lua for Data Transformation in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway) Lua Scripting API
- Lua programming language
- Rook-Ceph (Kubernetes operator)
- radosgw-admin CLI
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Ceph official documentation: RGW Lua Scripting (https://docs.ceph.com/en/latest/radosgw/lua-scripting/)
- Ceph source code: `rgw_lua_request.cc` for Request/Response API field definitions
- Ceph source code: `rgw_lua_utils.cc` for global function registration (RGWDebugLog, RGW_ABORT_REQUEST)
- radosgw-admin CLI reference (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)

## Issues Found

1. **`Response.HTTP.AddHeader()` does not exist (Steps 1, 2, original Step 4):** The Ceph RGW Lua API does not expose a `Response` global object or an `AddHeader()` method. The response is accessed via `Request.Response` and only exposes `HTTPStatusCode`, `HTTPStatus`, `RGWCode`, and `Message`. There is no mechanism to add arbitrary HTTP response headers. **Fix:** In Steps 1 and 2 (prerequest context), replaced `Response.HTTP.AddHeader()` calls with `Request.HTTP.Metadata[key] = value` to inject metadata into the request, which gets stored with the object as `x-amz-meta-*` headers. In Step 4 (postrequest context), rewrote the script to use `RGWDebugLog` for response auditing and `Request.Response.HTTPStatusCode` for status inspection, since arbitrary response header manipulation is not supported.

2. **`Response.HTTP.Header["ETag"]` does not exist (original Step 4):** Same root cause as issue 1 -- there is no `Response.HTTP.Header` table in the API. **Fix:** Removed the ETag normalization code and replaced Step 4 with a response auditing script that uses the available `Request.Response` fields.

3. **`abort()` function does not exist (Steps 3, 5):** The RGW Lua API does not provide an `abort()` global function. The correct way to abort a request is to set `Request.Response.HTTPStatusCode`, `Request.Response.HTTPStatus`, and `Request.Response.Message`, then `return RGW_ABORT_REQUEST`. **Fix:** In Step 5, replaced `abort(400, "MissingRequiredMetadata", "...")` with the proper `Request.Response` field assignments and `return RGW_ABORT_REQUEST`. In Step 3, updated the commented-out abort example to use the same correct pattern.

4. **`Request.HTTP.Header["Content-Type"]` does not exist (Step 3):** The RGW Lua API does not expose a generic `Request.HTTP.Header` table for reading arbitrary request headers. The content type is accessed via the dedicated field `Request.HTTP.ContentType`. **Fix:** Changed `Request.HTTP.Header["Content-Type"]` to `Request.HTTP.ContentType`.

5. **Context name casing inconsistency (all steps, Step 6 CLI):** The Ceph documentation uses lowercase context names (`prerequest`, `postrequest`) for the `radosgw-admin script put --context=` flag. While the parser is case-insensitive, the canonical form in the docs is lowercase. **Fix:** Updated all code comments and the CLI command to use `prerequest` and `postrequest`.

6. **Summary text inaccuracy:** The summary referenced "response header enrichment" which is not supported by the API. **Fix:** Updated to accurately describe the capabilities: metadata enrichment, response auditing, and the `Request` object API.

## Review Notes
- The `Request.HTTP.Metadata` table keys omit the `x-amz-meta-` prefix (e.g., use `"classification"` not `"x-amz-meta-classification"`). The blog's prefix-stripping approach in Step 5 is correct for this behavior.
- `os.time()` is available in the RGW Lua sandbox. The `os` library is loaded with only `os.exit()` removed. All `string.*` and `table.*` functions are also available.
- The `Request.HTTP.ContentType` field is read-write in prerequest context, meaning scripts could potentially correct content types by assignment, not just log mismatches. The blog's conservative logging-only approach is reasonable for a tutorial.
- The `Request.Bucket.Name` field is writable in prerequest context (before bucket resolution), which could enable bucket routing use cases not covered in this post.
- The `radosgw-admin script put` command does not include `--bucket` flag usage, which would scope a script to a specific bucket. For production use, bucket-scoped scripts may be preferable to global scripts.
