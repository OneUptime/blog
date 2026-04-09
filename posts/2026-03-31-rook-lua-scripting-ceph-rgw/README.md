# How to Use Lua Scripting with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Lua, Scripting, Object Storage, Customization, Middleware

Description: Use Lua scripting in Ceph RGW to add custom request processing logic, metadata enrichment, and policy enforcement without modifying RGW source code.

---

Ceph RGW supports Lua scripting as an extension point to run custom logic during request processing. You can attach Lua scripts to execute before or after S3 operations, enabling custom authentication checks, metadata manipulation, request filtering, and logging.

## Supported Script Execution Points

RGW supports Lua scripts at these hooks:
- `preRequest`: Runs before the S3 request is processed
- `postRequest`: Runs after the S3 request is processed

## Writing a Basic Lua Script

A script that logs request details and adds custom object metadata:

```lua
-- log request info
RGWDebugLog("Request: " .. Request.RGWOp .. " on " .. Request.Bucket.Name)

-- Add custom object metadata
Request.HTTP.Metadata["custom-rgw"] = "processed-by-lua"

-- Block access to a specific prefix
if Request.Object.Name ~= nil then
  if string.match(Request.Object.Name, "^restricted/") then
    Request.Response.HTTPStatusCode = 403
    Request.Response.Message = "Access to restricted prefix is not allowed"
    return RGW_ABORT_REQUEST
  end
end
```

## Uploading a Script to RGW

Scripts are stored as RADOS objects managed via `radosgw-admin`:

```bash
# Store a preRequest script
radosgw-admin script put \
  --infile my-script.lua \
  --context preRequest
```

## Getting a Stored Script

```bash
# Get the stored script for a context
radosgw-admin script get --context preRequest
```

## Deleting a Script

```bash
radosgw-admin script rm --context preRequest
```

## Example: Enforcing Content-Type Policy

Reject uploads without a proper Content-Type header:

```lua
if Request.RGWOp == "put_obj" then
  local ct = Request.HTTP.ContentType
  if ct == nil or ct == "" then
    Request.Response.HTTPStatusCode = 400
    Request.Response.Message = "Content-Type header is required"
    return RGW_ABORT_REQUEST
  end

  local allowed = {"image/jpeg", "image/png", "application/pdf"}
  local found = false
  for _, v in ipairs(allowed) do
    if ct == v then found = true; break end
  end

  if not found then
    Request.Response.HTTPStatusCode = 415
    Request.Response.Message = "Content-Type not allowed: " .. ct
    return RGW_ABORT_REQUEST
  end
end
```

## Example: Adding Object Metadata on Upload

Enrich object metadata automatically:

```lua
if Request.RGWOp == "put_obj" then
  -- Add upload timestamp metadata
  Request.HTTP.Metadata["upload-time"] = tostring(os.time())
  Request.HTTP.Metadata["uploaded-by"] = Request.User.Id
end
```

## Accessing Request Variables

Key variables available in Lua scripts:

```lua
Request.RGWOp                    -- Operation name (e.g., "put_obj", "get_obj")
Request.Bucket.Name              -- Target bucket name
Request.Object.Name              -- Target object key
Request.User.Id                  -- Authenticated user ID
Request.HTTP.Host                -- HTTP Host header
Request.HTTP.ContentType         -- Request content type
Request.HTTP.Metadata            -- Object metadata table (x-amz-meta-* headers)
Request.Response.HTTPStatusCode  -- Response status code (postRequest)
Request.Response.Message         -- Response message
```

## Summary

Ceph RGW's Lua scripting hooks let you inject custom logic into request processing without patching RGW itself. Use preRequest hooks for access control and input validation, and postRequest hooks for logging and response enrichment. Scripts are stored in RADOS and applied cluster-wide, making them a powerful tool for enforcing organizational policies.
