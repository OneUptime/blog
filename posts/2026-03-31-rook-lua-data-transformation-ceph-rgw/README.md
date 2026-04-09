# How to Use Lua for Data Transformation in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Data Transformation

Description: Learn how to use Lua scripts in Ceph RGW to transform request and response metadata, normalize object keys, and enrich objects with computed attributes on upload.

---

## Overview

Ceph RGW Lua scripts can transform request and response attributes at the gateway layer, acting as a transparent middleware for your S3 API. Transformations include normalizing object key formats, stripping or adding metadata, enforcing content-type policies, and enriching uploads with computed metadata before they are stored in RADOS.

## Step 1 - Normalize Object Key Formats

```lua
-- normalize_keys.lua (prerequest context)
-- Normalize object keys to lowercase with hyphens instead of spaces

local method = Request.HTTP.Method or ""
local object = Request.Object.Name or ""

if (method == "PUT" or method == "GET") and object ~= "" then
  -- Normalize: lowercase and replace spaces with hyphens
  local normalized = string.lower(object)
  normalized = string.gsub(normalized, "%s+", "-")

  -- Remove double slashes
  normalized = string.gsub(normalized, "//+", "/")

  if normalized ~= object then
    RGWDebugLog(string.format(
      "TRANSFORM: Key normalized from '%s' to '%s'",
      object, normalized))
    -- Note: modifying the object key directly is not supported
    -- Store the original and normalized names as object metadata for audit
    Request.HTTP.Metadata["original-key"] = object
    Request.HTTP.Metadata["normalized-key"] = normalized
  end
end
```

## Step 2 - Enrich Uploads with Computed Metadata

```lua
-- enrich_metadata.lua (prerequest context)
-- Add computed metadata to incoming PUT requests

local method = Request.HTTP.Method or ""
local object = Request.Object.Name or ""
local bucket = Request.Bucket.Name or ""

if method == "PUT" and object ~= "" then
  local user = Request.User.Id or "anonymous"
  local timestamp = tostring(os.time())

  RGWDebugLog(string.format(
    "ENRICH: bucket=%s object=%s user=%s ts=%s",
    bucket, object, user, timestamp))

  -- Inject computed metadata into the request so it is stored with the object
  -- These become x-amz-meta- headers on the stored object
  Request.HTTP.Metadata["upload-user"] = user
  Request.HTTP.Metadata["upload-timestamp"] = timestamp
  Request.HTTP.Metadata["upload-bucket"] = bucket
end
```

## Step 3 - Content-Type Enforcement and Correction

```lua
-- content_type_policy.lua (prerequest context)
-- Enforce content-type policies for specific bucket prefixes

local method = Request.HTTP.Method or ""
local object = Request.Object.Name or ""
local content_type = Request.HTTP.ContentType or ""

if method == "PUT" and object ~= "" then
  -- Derive expected content type from file extension
  local ext_map = {
    jpg = "image/jpeg",
    jpeg = "image/jpeg",
    png = "image/png",
    gif = "image/gif",
    pdf = "application/pdf",
    json = "application/json",
    txt = "text/plain",
    html = "text/html",
    xml = "application/xml",
    csv = "text/csv",
  }

  -- Extract extension
  local ext = string.match(object, "%.(%w+)$")
  if ext then
    ext = string.lower(ext)
    local expected_ct = ext_map[ext]

    if expected_ct then
      if content_type == "" then
        RGWDebugLog("CONTENT_TYPE: Missing for " .. ext ..
                    " object, expected " .. expected_ct)
        -- Log for monitoring; to enforce, uncomment the following:
        -- Request.Response.HTTPStatusCode = 400
        -- Request.Response.HTTPStatus = "MissingContentType"
        -- Request.Response.Message = "Content-Type header is required."
        -- return RGW_ABORT_REQUEST
      elseif content_type ~= expected_ct and
             not string.find(content_type, expected_ct, 1, true) then
        RGWDebugLog(string.format(
          "CONTENT_TYPE: Mismatch for %s: got '%s', expected '%s'",
          object, content_type, expected_ct))
      end
    end
  end
end
```

## Step 4 - Response Metadata Transformation

```lua
-- transform_response.lua (postrequest context)
-- Audit response metadata for S3 clients

local object = Request.Object.Name or ""
local status = Request.Response.HTTPStatusCode or 0

-- Log response status for monitoring
RGWDebugLog(string.format(
  "TRANSFORM: object=%s status=%d", object, status))

-- Flag failed uploads for alerting
if status >= 400 then
  RGWDebugLog(string.format(
    "TRANSFORM: Request failed for '%s' with status %d: %s",
    object, status, Request.Response.Message or ""))
end

-- Log downloadable file types for access auditing
local ext = string.match(object, "%.(%w+)$")
if ext then
  local download_exts = {exe=true, zip=true, tar=true, gz=true, pdf=true}
  if download_exts[string.lower(ext)] then
    RGWDebugLog(string.format(
      "TRANSFORM: Downloadable file accessed: %s (type: %s)",
      object, ext))
  end
end
```

## Step 5 - Metadata Schema Validation

```lua
-- metadata_schema.lua (prerequest context)
-- Validate required metadata fields on upload

local method = Request.HTTP.Method or ""
local bucket = Request.Bucket.Name or ""

-- Only enforce metadata schema on specific buckets
local SCHEMA_BUCKETS = {["compliance-data"] = true, ["audit-logs"] = true}

if method == "PUT" and SCHEMA_BUCKETS[bucket] then
  local required_fields = {
    "x-amz-meta-classification",
    "x-amz-meta-data-owner",
    "x-amz-meta-retention-days",
  }

  local missing = {}
  for _, field in ipairs(required_fields) do
    local val = Request.HTTP.Metadata[string.gsub(field, "x%-amz%-meta%-", "")]
    if not val or val == "" then
      table.insert(missing, field)
    end
  end

  if #missing > 0 then
    local missing_str = table.concat(missing, ", ")
    RGWDebugLog("SCHEMA: Missing required metadata: " .. missing_str)
    Request.Response.HTTPStatusCode = 400
    Request.Response.HTTPStatus = "MissingRequiredMetadata"
    Request.Response.Message = "Required metadata fields are missing: " .. missing_str
    return RGW_ABORT_REQUEST
  end
end
```

## Step 6 - Deploy and Test Transformations

```bash
# Deploy the metadata schema validation
radosgw-admin script put \
  --infile=metadata_schema.lua \
  --context=prerequest

# Test: upload without required metadata (should fail)
aws --endpoint-url http://rgw.example.com:7480 \
  s3 cp /tmp/report.pdf s3://compliance-data/report.pdf
# Expected: 400 MissingRequiredMetadata

# Test: upload with required metadata (should succeed)
aws --endpoint-url http://rgw.example.com:7480 \
  s3 cp /tmp/report.pdf s3://compliance-data/report.pdf \
  --metadata "classification=confidential,data-owner=finance,retention-days=2555"

# Check transformation log output
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=30 \
  | grep -E "TRANSFORM:|SCHEMA:|ENRICH:|CONTENT_TYPE:"
```

## Summary

Lua data transformation scripts in Ceph RGW act as a transparent middleware layer for the S3 API, enabling key normalization, metadata enrichment, content-type validation, metadata schema enforcement, and response auditing. These transformations run at request time using the `Request` object API, making them suitable for enforcing data governance policies, enriching stored objects with computed metadata, and maintaining metadata standards across large-scale object storage deployments.
