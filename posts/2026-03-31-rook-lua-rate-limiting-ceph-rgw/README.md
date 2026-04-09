# How to Implement Rate Limiting with Lua in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Rate Limiting

Description: Learn how to implement request rate limiting in Ceph RGW using Lua scripts to protect the cluster from API abuse and enforce per-user throttles.

---

## Overview

Ceph RGW has built-in rate limiting via `radosgw-admin ratelimit`, but Lua scripts enable more sophisticated rate limiting logic - sliding windows, per-operation limits, and shared state via RADOS objects. This guide demonstrates implementing rate limiting at the Lua script level for fine-grained control.

## Step 1 - Understand the Approach

Lua scripts in RGW run in-process but do not have persistent state between requests. To implement true rate limiting, you need external state storage. Options include:

1. RADOS objects (built-in, no extra infrastructure)
2. The RGW-provided rate limiting via admin API (simpler)
3. Redis via socket (requires extra setup)

```bash
# Option 1: Use the built-in RGW rate limiting (recommended for most cases)
radosgw-admin ratelimit set \
  --ratelimit-scope=user \
  --uid=heavy-user \
  --max-read-ops=1000 \
  --max-write-ops=100 \
  --max-read-bytes=1073741824 \
  --max-write-bytes=107374182400

# Enable the rate limit
radosgw-admin ratelimit enable \
  --ratelimit-scope=user \
  --uid=heavy-user
```

## Step 2 - Lua-Based Request Counting with RADOS

```lua
-- rate_limit_counter.lua (preRequest)
-- Count requests per user per minute using RADOS objects

-- Rate limit configuration
local LIMITS = {
  default = {read = 500, write = 100},
  premium = {read = 5000, write = 1000},
}

local function get_user_tier(user_id)
  -- Simplified: check user ID prefix
  if string.find(user_id, "premium-", 1, true) then
    return "premium"
  end
  return "default"
end

local function is_write_operation(method)
  return method == "PUT" or method == "POST" or method == "DELETE"
end

local user = Request.User.Id or "anonymous"
local method = Request.HTTP.Method
local tier = get_user_tier(user)
local limits = LIMITS[tier] or LIMITS.default

-- Log the request for rate tracking
-- In production, this would update a RADOS counter object
local op_type = is_write_operation(method) and "write" or "read"
RGWDebugLog(string.format("RATE: user=%s tier=%s op=%s method=%s",
  user, tier, op_type, method))
```

## Step 3 - Log Rate Limit Information in Post-Request Context

The RGW Lua API does not support adding custom HTTP response headers. The `Request.Response` table only exposes `HTTPStatusCode`, `HTTPStatus`, `RGWCode`, and `Message`. However, you can use the `postrequest` context to log rate limit information for monitoring and alerting.

```lua
-- rate_limit_log.lua (postrequest)
-- Log rate limit information after each request for monitoring

local RATE_LIMITS = {
  default = {reads_per_hour = 3600, writes_per_hour = 360},
  admin   = {reads_per_hour = 100000, writes_per_hour = 100000},
}

local user = Request.User.Id or "anonymous"
local tier = (user == "admin") and "admin" or "default"
local limits = RATE_LIMITS[tier]

local method = Request.HTTP.Method
local status = Request.Response.HTTPStatusCode

-- Log request details for external rate limit monitoring
RGWDebugLog(string.format(
  "RATE_LOG: user=%s tier=%s method=%s status=%d read_limit=%d write_limit=%d",
  user, tier, method, status,
  limits.reads_per_hour, limits.writes_per_hour))
```

## Step 4 - Bucket-Level Operation Rate Limiting

```lua
-- bucket_rate_limit.lua (preRequest)
-- Enforce limits on the number of list operations per bucket

-- Block excessive LIST operations to prevent bucket enumeration
local method = Request.HTTP.Method
local bucket = Request.Bucket.Name or ""
local object = Request.Object.Name or ""
local user = Request.User.Id or "anonymous"

-- Detect LIST bucket operations (GET on bucket without key)
local is_list = (method == "GET" and bucket ~= "" and object == "")

if is_list then
  -- Log list operation - in production, integrate with a counter store
  RGWDebugLog(string.format("LIST: user=%s bucket=%s", user, bucket))

  -- Block anonymous list operations on buckets not marked public
  if user == "anonymous" then
    RGWDebugLog("RATE: Blocking anonymous LIST on bucket=" .. bucket)
    Request.Response.HTTPStatusCode = 403
    Request.Response.HTTPStatus = "Forbidden"
    Request.Response.Message = "Anonymous bucket listing is not permitted on this gateway."
    return RGW_ABORT_REQUEST
  end
end
```

## Step 5 - Combine with Built-In Rate Limiting

```bash
# Set coarse-grained global default limits via the admin API
# These are enforced by RGW before Lua runs
radosgw-admin global ratelimit set \
  --ratelimit-scope=bucket \
  --max-read-ops=10000 \
  --max-write-ops=2000 \
  --max-read-bytes=10737418240 \
  --max-write-bytes=10737418240

radosgw-admin global ratelimit enable --ratelimit-scope=bucket

# Then use Lua for fine-grained per-user or per-bucket logic
radosgw-admin script put \
  --infile=rate_limit_log.lua \
  --context=postrequest

# Verify rate limit configuration
radosgw-admin global ratelimit get --ratelimit-scope=bucket
```

## Step 6 - Test and Monitor Rate Limiting

```bash
# Test with a loop to simulate high request volume
for i in $(seq 1 50); do
  aws --endpoint-url http://rgw.example.com:7480 \
    s3 ls s3://mybucket/ > /dev/null 2>&1
done

# Check RGW logs for rate limit events
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=100 \
  | grep -E "RATE:|ratelimit|throttle"

# Monitor rate limit metrics via Prometheus
curl -s http://rgw.example.com:9283/metrics | grep rgw_ratelimit
```

## Summary

Rate limiting in Ceph RGW combines the built-in `radosgw-admin ratelimit` feature for coarse-grained global and per-user throttles with Lua scripts for fine-grained logic such as blocking anonymous list operations and logging rate limit information for monitoring. The built-in rate limiting is more efficient for high-volume enforcement, while Lua provides flexibility for custom policies that the built-in feature cannot express.
