# How to Write Request Processing Scripts with Lua in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Request Processing

Description: Learn how to write Lua scripts that process and inspect S3 API requests in Ceph RGW, enabling dynamic request validation and transformation.

---

## Overview

Lua request processing scripts in Ceph RGW run at two stages: before the request is handled (preRequest) and after the response is ready (postRequest). These hooks let you validate request parameters, block unauthorized operations, add response headers, and collect telemetry without modifying RGW source code.

## Step 1 - Request Inspection Basics

```lua
-- inspect_request.lua
-- Comprehensive request inspection example

local function log_request()
  local info = {
    method  = Request.HTTP.Method,
    bucket  = Request.Bucket.Name or "none",
    object  = Request.Object.Name or "none",
    user    = Request.User.Id or "anonymous",
    host    = Request.HTTP.Host,
    uri     = Request.HTTP.URI,
  }

  local log_line = "REQUEST"
  for k, v in pairs(info) do
    log_line = log_line .. " " .. k .. "=" .. tostring(v)
  end

  RGWDebugLog(log_line)
end

log_request()
```

## Step 2 - Validate Request Parameters

```lua
-- validate_upload.lua
-- Block uploads larger than 1 GiB from non-admin users

local MAX_SIZE_BYTES = 1073741824  -- 1 GiB
local method = Request.HTTP.Method
local user = Request.User.Id or ""
local content_length = Request.ContentLength or 0

-- Check if this is an upload operation
if method == "PUT" or method == "POST" then
  -- Allow admin users to bypass the limit
  if user ~= "admin" then
    if content_length > MAX_SIZE_BYTES then
      RGWDebugLog("BLOCKED: Upload too large for user=" .. user ..
                  " size=" .. tostring(content_length))
      -- Abort the request with a 403 response
      Request.Response.HTTPStatusCode = 403
      Request.Response.Message = "Upload size exceeds the maximum allowed for this account."
      return RGW_ABORT_REQUEST
    end
  end
end
```

Upload and test:

```bash
radosgw-admin script put --infile=validate_upload.lua --context=preRequest

# Test: try to upload a small file (should succeed)
aws --endpoint-url http://rgw.example.com:7480 \
  s3 cp /etc/hosts s3://mybucket/hosts.txt

# Check logs
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=20 | grep BLOCKED
```

## Step 3 - Enforce Naming Conventions

```lua
-- enforce_naming.lua
-- Require object keys to start with a date prefix (YYYY-MM-DD/)

local method = Request.HTTP.Method
local object_key = Request.Object.Name or ""

if method == "PUT" and object_key ~= "" then
  -- Check for date prefix pattern YYYY-MM-DD/
  local date_prefix = string.match(object_key, "^%d%d%d%d%-%d%d%-%d%d/")
  if not date_prefix then
    RGWDebugLog("BLOCKED: Object key missing date prefix: " .. object_key)
    Request.Response.HTTPStatusCode = 400
    Request.Response.Message = "Object key must start with a date prefix (YYYY-MM-DD/)."
    return RGW_ABORT_REQUEST
  end
end
```

## Step 4 - Inspect Request Metadata

```lua
-- metadata_inspector.lua
-- Log all custom metadata on PUT operations

local method = Request.HTTP.Method

if method == "PUT" then
  local metadata_found = false
  for k, v in pairs(Request.HTTP.Metadata) do
    RGWDebugLog("METADATA " .. k .. "=" .. v)
    metadata_found = true
  end

  if not metadata_found then
    RGWDebugLog("PUT with no custom metadata: key=" ..
                (Request.Object.Name or ""))
  end

  -- Require a mandatory metadata field
  local owner = Request.HTTP.Metadata["x-amz-meta-owner"]
  if not owner or owner == "" then
    Request.Response.HTTPStatusCode = 400
    Request.Response.Message = "Objects must include the x-amz-meta-owner metadata."
    return RGW_ABORT_REQUEST
  end
end
```

## Step 5 - Post-Request Response Inspection

```lua
-- inspect_response.lua
-- Log response details for observability (postRequest context)

local status_code = Request.Response.HTTPStatusCode
local status_text = Request.Response.HTTPStatus
local method = Request.HTTP.Method
local bucket = Request.Bucket.Name or "none"
local object = Request.Object.Name or "none"

-- Log every response for telemetry
RGWDebugLog("RESPONSE method=" .. method ..
            " bucket=" .. bucket ..
            " object=" .. object ..
            " status=" .. tostring(status_code) ..
            " status_text=" .. (status_text or ""))

-- Log error responses at higher detail
if status_code >= 400 then
  local message = Request.Response.Message or ""
  RGWDebugLog("ERROR_RESPONSE status=" .. tostring(status_code) ..
              " message=" .. message ..
              " user=" .. (Request.User.Id or "anonymous"))
end
```

```bash
# Upload the postRequest script
radosgw-admin script put \
  --infile=inspect_response.lua \
  --context=postRequest
```

## Step 6 - Error Handling in Lua Scripts

```lua
-- safe_script.lua
-- Best practice: wrap all logic in pcall for safety

local ok, result = pcall(function()
  local method = Request.HTTP.Method
  local bucket = Request.Bucket.Name

  if not bucket then return end

  -- Your processing logic here
  if method == "DELETE" and bucket == "protected-bucket" then
    Request.Response.HTTPStatusCode = 403
    Request.Response.Message = "This bucket is protected from deletion."
    return RGW_ABORT_REQUEST
  end
end)

if not ok then
  RGWDebugLog("Lua script error: " .. tostring(result))
  -- Do NOT abort here - log and continue to avoid blocking valid requests
elseif result == RGW_ABORT_REQUEST then
  return RGW_ABORT_REQUEST
end
```

## Summary

Lua request processing scripts in Ceph RGW provide a powerful, low-overhead in-process hook into the S3 request lifecycle. Using preRequest scripts you can validate object sizes, enforce naming conventions, check required metadata fields, and block unauthorized operations by returning `RGW_ABORT_REQUEST`. postRequest scripts inspect response details for observability and telemetry. Wrapping logic in `pcall` prevents script errors from impacting normal request processing.
