# How to Implement Access Control Logic with Lua in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Lua, Access Control, Object Storage, RGW, Security

Description: Learn how to implement custom access control logic in Ceph RGW using Lua scripting to enforce fine-grained policies on S3 requests.

---

Ceph RGW supports Lua scripting at request processing stages, making it possible to implement custom access control logic without modifying RGW source code. This guide walks through writing Lua scripts that inspect and enforce access policies on incoming S3 operations.

## Prerequisites

- Ceph cluster running Pacific (16.2+) or newer
- Admin access to upload Lua scripts via `radosgw-admin`

## Understanding RGW Lua Hooks

RGW exposes several hook points for Lua scripts, including:

- **prerequest** - runs before the request is processed; can reject requests
- **postrequest** - runs after the response is generated; useful for logging
- **background** - runs at timed intervals (default every 5 seconds)
- **getdata** - runs on object data during downloads
- **putdata** - runs on object data during uploads

For access control, use the `prerequest` hook. Scripts can abort a request by returning `RGW_ABORT_REQUEST` after setting the desired HTTP status code and message on the response.

## Writing an Access Control Script

The following example restricts DELETE operations to requests coming from a specific IP range and denies access to a protected bucket prefix for all non-admin users:

```lua
-- acl_policy.lua
-- Block DELETE from non-admin users on protected buckets

local bucket = Request.Bucket.Name or ""
local op = Request.RGWOp or ""
local user = Request.User.Id or ""

-- Protect buckets with "prod-" prefix
if string.find(bucket, "^prod%-") then
  if op == "delete_obj" or op == "delete_bucket" then
    if user ~= "svc-admin" then
      Request.Response.HTTPStatusCode = 403
      Request.Response.Message = "Access denied: DELETE on production buckets requires admin account"
      return RGW_ABORT_REQUEST
    end
  end
end

-- Block anonymous access to any bucket starting with "internal-"
if string.find(bucket, "^internal%-") then
  if user == "" or user == "anonymous" then
    Request.Response.HTTPStatusCode = 401
    Request.Response.Message = "Authentication required for internal buckets"
    return RGW_ABORT_REQUEST
  end
end
```

## Uploading the Script to RGW

Scripts are stored in RADOS and uploaded via `radosgw-admin`:

```bash
# Upload the prerequest script
radosgw-admin script put --infile=acl_policy.lua --context=prerequest

# Verify it was stored
radosgw-admin script get --context=prerequest
```

## Testing Access Control

Use the AWS CLI to verify the policy is enforced:

```bash
# Attempt DELETE as non-admin user - should be rejected
AWS_ACCESS_KEY_ID=testuser AWS_SECRET_ACCESS_KEY=secret \
  aws --endpoint-url http://rgw.example.com:7480 \
  s3 rm s3://prod-data/file.txt

# Expected: An error occurred (403) when calling the DeleteObject operation
```

## Adding IP-Based Restrictions

You can also restrict access by source IP using the `Request.Env` table:

```lua
-- ip_restriction.lua
local remote_addr = Request.Environment["REMOTE_ADDR"] or ""
local bucket = Request.Bucket.Name or ""

-- Only allow writes to "finance-" buckets from internal network
if string.find(bucket, "^finance%-") then
  local op = Request.RGWOp or ""
  if op == "put_obj" or op == "copy_obj" then
    -- Check if IP starts with 10.0.
    if not string.find(remote_addr, "^10%.0%.") then
      Request.Response.HTTPStatusCode = 403
      Request.Response.Message = "Write access to finance buckets restricted to internal network"
      return RGW_ABORT_REQUEST
    end
  end
end
```

## Combining Multiple Scripts

RGW only supports one Lua script per hook context. Combine all your access control logic into a single script and use a modular approach:

```lua
-- combined_acl.lua
local function check_prod_policy()
  local bucket = Request.Bucket.Name or ""
  local op = Request.RGWOp or ""
  local user = Request.User.Id or ""
  if string.find(bucket, "^prod%-") and (op == "delete_obj") then
    if user ~= "svc-admin" then
      Request.Response.HTTPStatusCode = 403
      Request.Response.Message = "DELETE restricted on prod buckets"
      return true
    end
  end
  return false
end

local function check_ip_policy()
  local addr = Request.Environment["REMOTE_ADDR"] or ""
  local bucket = Request.Bucket.Name or ""
  if string.find(bucket, "^finance%-") then
    if not string.find(addr, "^10%.") then
      Request.Response.HTTPStatusCode = 403
      Request.Response.Message = "IP restricted bucket"
      return true
    end
  end
  return false
end

if check_prod_policy() or check_ip_policy() then
  return RGW_ABORT_REQUEST
end
```

## Summary

Lua scripting in Ceph RGW enables flexible, code-free access control without patching RGW. By uploading scripts to the `prerequest` hook, you can enforce bucket-level, operation-level, and IP-based policies. Combine all rules into a single script and test thoroughly with both allowed and denied scenarios before deploying to production.
