# How to Add Custom Headers with Lua in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Header

Description: Learn how to add, modify, and remove HTTP response headers in Ceph RGW using Lua postRequest scripts for CORS, security, and observability.

---

## Overview

Ceph RGW Lua scripts run at two stages: before the request is handled (preRequest) and after the response is ready (postRequest). In the preRequest context, scripts can attach custom object metadata via `Request.HTTP.Metadata`, which becomes `x-amz-meta-*` headers on stored objects. In the postRequest context, scripts can inspect response details and log them with `RGWDebugLog()`. This enables custom metadata tagging, request validation, origin enforcement, and observability logging without modifying RGW source code.

## Step 1 - Basic Metadata Addition

```lua
-- add_basic_metadata.lua (preRequest context)
-- Add custom object metadata for identification and tracing

-- Only tag objects during uploads
local method = Request.HTTP.Method
if method ~= "PUT" and method ~= "POST" then return end

-- Tag uploads with storage system info
Request.HTTP.Metadata["storage-system"] = "Ceph-RGW"
Request.HTTP.Metadata["cluster-region"] = "us-east-1"

-- Add a request trace ID as object metadata
local bucket = Request.Bucket.Name or "global"
local timestamp = tostring(os.time())
Request.HTTP.Metadata["request-id"] =
  method .. "-" .. bucket .. "-" .. timestamp

RGWDebugLog("Metadata tagged for " .. method .. " on " .. bucket)
```

## Step 2 - Security Request Auditing

```lua
-- security_audit.lua (postRequest context)
-- Log security-relevant request details for auditing

local method = Request.HTTP.Method or "?"
local bucket = Request.Bucket.Name or "none"
local object = Request.Object.Name or "none"
local user = Request.User.Id or "anonymous"
local status = Request.Response.HTTPStatusCode

-- Log all non-GET operations for security audit trail
if method ~= "GET" and method ~= "HEAD" then
  RGWDebugLog("SECURITY_AUDIT: user=" .. user
    .. " method=" .. method
    .. " bucket=" .. bucket
    .. " object=" .. object
    .. " status=" .. tostring(status))
end

-- Flag and log failed requests (4xx/5xx)
if status >= 400 then
  RGWDebugLog("SECURITY_ALERT: failed request"
    .. " user=" .. user
    .. " method=" .. method
    .. " bucket=" .. bucket
    .. " status=" .. tostring(status)
    .. " message=" .. (Request.Response.Message or ""))
end
```

## Step 3 - Origin Validation

```lua
-- origin_validation.lua (preRequest context)
-- Validate request origins and block unauthorized sources

local ALLOWED_ORIGINS = {
  ["https://app.example.com"] = true,
  ["https://admin.example.com"] = true,
  ["http://localhost:3000"] = true,
}

local origin = Request.HTTP.Header["Origin"] or ""

if origin ~= "" and not ALLOWED_ORIGINS[origin] then
  RGWDebugLog("ORIGIN_BLOCKED: rejected origin=" .. origin
    .. " user=" .. (Request.User.Id or "anonymous")
    .. " bucket=" .. (Request.Bucket.Name or "none"))
  Request.Response.HTTPStatusCode = 403
  Request.Response.Message = "Origin not allowed: " .. origin
  return RGW_ABORT_REQUEST
end

if origin ~= "" then
  RGWDebugLog("ORIGIN_ALLOWED: origin=" .. origin
    .. " user=" .. (Request.User.Id or "anonymous"))
end
```

## Step 4 - Metadata Tagging by Bucket Type

```lua
-- metadata_tagging.lua (preRequest context)
-- Tag uploaded objects with metadata based on bucket type

local bucket = Request.Bucket.Name or ""
local method = Request.HTTP.Method

-- Only tag objects during uploads
if method ~= "PUT" and method ~= "POST" then return end

-- Determine cache tier based on bucket naming convention
local cache_tier = "default"

if string.find(bucket, "static-", 1, true) then
  -- Static assets - long-lived
  cache_tier = "immutable"
elseif string.find(bucket, "media-", 1, true) then
  -- Media files - medium retention
  cache_tier = "media"
elseif string.find(bucket, "api-", 1, true) then
  -- API data - short-lived
  cache_tier = "volatile"
end

Request.HTTP.Metadata["cache-tier"] = cache_tier
Request.HTTP.Metadata["tagged-by"] = "lua-metadata-tagger"
Request.HTTP.Metadata["tagged-at"] = tostring(os.time())

RGWDebugLog("Tagged object in " .. bucket .. " with cache-tier=" .. cache_tier)
```

## Step 5 - Observability and Tracing Logging

```lua
-- tracing_log.lua (postRequest context)
-- Log distributed tracing information for observability pipelines

local method = Request.HTTP.Method
local bucket = Request.Bucket.Name or ""
local object = Request.Object.Name or ""
local user = Request.User.Id or "anonymous"
local status = Request.Response.HTTPStatusCode

-- Read or generate a trace ID from the incoming request
local trace_id = Request.HTTP.Header["X-Trace-ID"]
if not trace_id or trace_id == "" then
  -- Generate a simple trace ID from timestamp + user hash
  trace_id = string.format("%x-%x",
    os.time(),
    #user * 31 + #bucket * 17)
end

-- Emit structured log line for observability pipeline ingestion
local log_line = "TRACE"
  .. " trace_id=" .. trace_id
  .. " user=" .. user
  .. " method=" .. method
  .. " bucket=" .. bucket
  .. " status=" .. tostring(status)

if object ~= "" then
  log_line = log_line .. " object=" .. object
end

RGWDebugLog(log_line)
```

## Step 6 - Deploy and Validate

```bash
# Upload the preRequest script (for metadata tagging and origin validation)
radosgw-admin script put \
  --infile=metadata_tagging.lua \
  --context=preRequest

# Upload the postRequest script (for auditing and tracing)
radosgw-admin script put \
  --infile=tracing_log.lua \
  --context=postRequest

# Upload a test object and verify metadata was added
echo "test" | aws s3 cp - s3://static-assets/test.txt \
  --endpoint-url http://rgw.example.com:7480

# Check that custom metadata appears on the object
aws s3api head-object \
  --bucket static-assets --key test.txt \
  --endpoint-url http://rgw.example.com:7480
# Expected output includes x-amz-meta-cache-tier, x-amz-meta-tagged-by, etc.

# Check logs for Lua debug output
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=20 | grep -i "lua\|TRACE\|SECURITY"
```

## Summary

Lua scripts in Ceph RGW provide flexible request-time hooks for operational control. In the preRequest context, scripts can attach custom object metadata via `Request.HTTP.Metadata` (appearing as `x-amz-meta-*` headers on stored objects), validate request origins and block unauthorized access with `RGW_ABORT_REQUEST`. In the postRequest context, scripts can inspect response status and log structured audit and tracing data via `RGWDebugLog()`. These scripts require no RGW recompilation and can be updated live using `radosgw-admin script put`, making them ideal for operational policies that change frequently. Note that Lua scripts cannot add or modify HTTP response headers directly - for response headers like HSTS, CORS, or Cache-Control, use a reverse proxy (e.g., nginx or HAProxy) in front of RGW.
