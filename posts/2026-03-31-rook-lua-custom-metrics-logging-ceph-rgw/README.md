# How to Log Custom Metrics with Lua in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Metric

Description: Learn how to emit custom metrics and structured log events from Ceph RGW using Lua scripts for detailed per-operation observability.

---

## Overview

Ceph RGW's built-in Prometheus metrics provide cluster-level data, but Lua scripts enable per-request, per-user, and per-bucket instrumentation that standard metrics do not capture. By writing structured log lines from Lua, you can feed them into log aggregation systems and build custom dashboards for S3 operation analytics.

## Step 1 - Structured Request Logging

```lua
-- structured_logging.lua (preRequest context)
-- Emit structured JSON-like log lines for each request

local function escape_json_string(s)
  if type(s) ~= "string" then return tostring(s or "") end
  s = string.gsub(s, '\\', '\\\\')
  s = string.gsub(s, '"', '\\"')
  return s
end

local function log_structured(fields)
  local parts = {}
  for k, v in pairs(fields) do
    table.insert(parts, '"' .. k .. '":"' .. escape_json_string(v) .. '"')
  end
  RGWDebugLog("{" .. table.concat(parts, ",") .. "}")
end

log_structured({
  event = "s3_request",
  method = Request.HTTP.Method or "",
  bucket = Request.Bucket.Name or "",
  object = Request.Object.Name or "",
  user = Request.User.Id or "anonymous",
  host = Request.HTTP.Host or "",
  timestamp = tostring(os.time()),
})
```

## Step 2 - Operation Counters by User and Bucket

```lua
-- operation_counters.lua (postRequest context)
-- Emit counter-style metrics for each completed operation

local method = Request.HTTP.Method or "UNKNOWN"
local bucket = Request.Bucket.Name or "__no_bucket__"
local user = Request.User.Id or "anonymous"

-- Determine operation type
local op_type = "other"
if method == "GET" and Request.Object.Name and Request.Object.Name ~= "" then
  op_type = "get_object"
elseif method == "GET" then
  op_type = "list_bucket"
elseif method == "PUT" and Request.Object.Name ~= "" then
  op_type = "put_object"
elseif method == "DELETE" then
  op_type = "delete_object"
elseif method == "HEAD" then
  op_type = "head_object"
end

-- Emit in Prometheus text format for log-based metric extraction
RGWDebugLog(string.format(
  "METRIC s3_operation_total{user=%q,bucket=%q,op=%q} 1",
  user, bucket, op_type))

-- Emit data volume metric for uploads
if method == "PUT" then
  local size = Request.ContentLength or 0
  RGWDebugLog(string.format(
    "METRIC s3_bytes_uploaded{user=%q,bucket=%q} %d",
    user, bucket, size))
end
```

## Step 3 - Latency Measurement Pattern

```lua
-- latency_tracking.lua (preRequest context)
-- Record request start time for latency measurement

-- Store start time in request metadata for access in postRequest
-- os.time() provides second-level precision (Lua standard library)
Request.HTTP.Metadata["lua-start-time"] = tostring(os.time())
```

```lua
-- latency_emit.lua (postRequest context)
-- Calculate and emit request latency

local start_s = tonumber(Request.HTTP.Metadata["lua-start-time"] or "0")
local end_s = os.time()
local latency_s = math.max(0, end_s - start_s)

local bucket = Request.Bucket.Name or ""
local method = Request.HTTP.Method or ""

RGWDebugLog(string.format(
  "METRIC s3_request_duration_s{method=%q,bucket=%q} %d",
  method, bucket, latency_s))
```

## Step 4 - Access Pattern Analytics

```lua
-- access_analytics.lua (preRequest context)
-- Detect and log unusual access patterns

local user = Request.User.Id or "anonymous"
local method = Request.HTTP.Method or ""
local bucket = Request.Bucket.Name or ""
local object = Request.Object.Name or ""

-- Detect bulk delete operations
if method == "POST" and string.find(Request.HTTP.URI or "", "delete", 1, true) then
  RGWDebugLog(string.format(
    "ANALYTICS bulk_delete_attempt user=%q bucket=%q",
    user, bucket))
end

-- Log multipart upload initiations
if method == "POST" and string.find(Request.HTTP.URI or "", "uploads", 1, true) then
  RGWDebugLog(string.format(
    "ANALYTICS multipart_upload_start user=%q bucket=%q object=%q",
    user, bucket, object))
end

-- Log large object access
local content_length = Request.ContentLength or 0
if content_length > 1073741824 then  -- > 1 GiB
  RGWDebugLog(string.format(
    "ANALYTICS large_object_access method=%q user=%q size_bytes=%d",
    method, user, content_length))
end
```

## Step 5 - Forward Metrics to an External System

```bash
# Parse the structured Lua log output and forward to StatsD
# RGWDebugLog lines are prefixed with "Lua INFO:" so extract the METRIC portion
kubectl -n rook-ceph logs -l app=rook-ceph-rgw -f \
  | grep "METRIC" \
  | sed -n 's/.*METRIC //p' \
  | while read -r metric value; do
      NAME=$(echo "$metric" | sed 's/{.*}//' | tr '.' '_')
      echo "${NAME}:${value}|c" | nc -u -w0 statsd.monitoring.svc 8125
    done &
```

```bash
# Or use a Fluent Bit filter to parse and forward metrics
# fluentbit-config.yaml
```

```yaml
[FILTER]
    Name    grep
    Match   ceph.rgw.*
    Regex   log METRIC

[FILTER]
    Name    parser
    Match   ceph.rgw.*
    Key_Name log
    Parser  rgw_metric

[OUTPUT]
    Name    prometheus_exporter
    Match   ceph.rgw.*
    Host    0.0.0.0
    Port    9201
```

## Step 6 - Deploy and Validate

```bash
# Upload the metrics scripts
radosgw-admin script put \
  --infile=operation_counters.lua \
  --context=postRequest

# Make test requests
aws --endpoint-url http://rgw.example.com:7480 s3 ls
aws --endpoint-url http://rgw.example.com:7480 \
  s3 cp /etc/hosts s3://mybucket/hosts.txt

# Check the structured log output
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=50 \
  | grep "METRIC\|event.*s3_request"
```

## Summary

Lua scripts in Ceph RGW enable rich per-request metric emission through structured log lines. By logging operation types, user identifiers, bucket names, and sizes in a consistent format, you can extract custom metrics using log parsers and forward them to time-series databases or StatsD. This provides S3 operation analytics at the granularity that built-in Prometheus metrics cannot achieve, without any RGW code changes.
