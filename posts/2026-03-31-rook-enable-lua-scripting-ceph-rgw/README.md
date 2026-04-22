# How to Enable Lua Scripting in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Lua, Scripting

Description: Learn how to enable and configure Lua scripting in Ceph RGW to add custom request processing logic without modifying or recompiling the RGW source code.

---

## Overview

Ceph RGW includes an embedded Lua interpreter that allows operators to inject custom logic at various request processing stages. Lua scripts can inspect and modify S3 request and response attributes, implement custom authentication, add headers, log metrics, and enforce access policies. Scripts are uploaded to RADOS and executed in-process without the overhead of an external call.

## Step 1 - Verify Lua Support

```bash
# Check if RGW was built with Lua support
radosgw --version
strings $(which radosgw) | grep -i lua

# For Rook-managed RGW, check the container
kubectl -n rook-ceph exec deploy/rook-ceph-rgw-my-store-a -- \
  radosgw --version

# Ceph Pacific (16.2.x) and later include Lua support
# The feature is enabled by default when built with lua5.3 or luajit
```

## Step 2 - Upload a Lua Script

Lua scripting is available in RGW without any additional configuration. Scripts are managed via the `radosgw-admin script` CLI commands. No config option needs to be set to enable Lua support - it is available as soon as RGW is running with a Lua-enabled build.

## Step 3 - Write Your First Lua Script

Create a simple script that logs basic request information:

```lua
-- hello_rgw.lua
-- Log the request method and bucket name

-- RGW provides the 'Request' global object
local method = Request.HTTP.Method
local bucket = Request.Bucket.Name or "no-bucket"
local user = Request.User.Id or "anonymous"

-- Log to the RGW log
RGWDebugLog("Lua: method=" .. method ..
            " bucket=" .. bucket ..
            " user=" .. user)
```

## Step 4 - Upload and Activate the Script

```bash
# Upload the script via the Admin API
radosgw-admin script put --infile=hello_rgw.lua --context=preRequest

# Verify the script content
radosgw-admin script get --context=preRequest

# Available contexts:
# preRequest   - runs before the operation is processed
# postRequest  - runs after the response is prepared
#
# Note: Ceph Reef (18.x) and later use lowercase context names
# (prerequest, postrequest) and add additional contexts:
# background, getdata, putdata
```

For Rook-managed RGW, upload via the RGW Admin REST API:

```bash
# Get the admin access key
ADMIN_KEY=$(radosgw-admin user info --uid=admin | jq -r '.keys[0].access_key')
ADMIN_SECRET=$(radosgw-admin user info --uid=admin | jq -r '.keys[0].secret_key')

# Upload script via Admin API
curl -X PUT "http://rgw.example.com:7480/admin/script?context=preRequest" \
  --aws-sigv4 "aws:amz:us-east-1:s3" \
  --user "${ADMIN_KEY}:${ADMIN_SECRET}" \
  --data-binary @hello_rgw.lua \
  -H "Content-Type: application/lua"
```

## Step 5 - Explore the RGW Lua API

```lua
-- Available objects in RGW Lua scripts

-- Request object
Request.HTTP.Method       -- "GET", "PUT", "DELETE", etc.
Request.HTTP.URI          -- Full request URI
Request.HTTP.Host         -- Host header
Request.ContentLength      -- Content-Length value

-- Bucket and object
Request.Bucket.Name       -- Bucket name
Request.Object.Name       -- Object key
Request.Object.Size       -- Object size in bytes

-- User and authentication
Request.User.Id           -- RGW user ID
Request.User.Tenant       -- User tenant

-- Request metadata
Request.HTTP.Metadata     -- Iterator over custom x-amz-meta headers
for k, v in pairs(Request.HTTP.Metadata) do
  RGWDebugLog("Meta: " .. k .. "=" .. v)
end

-- Response fields (available in postRequest context)
Request.Response.HTTPStatusCode  -- HTTP status code (e.g. 200)
Request.Response.HTTPStatus      -- HTTP status string
Request.Response.Message         -- Response message
```

## Step 6 - Test and Troubleshoot

```bash
# Enable debug logging to see Lua output
# RGWDebugLog() writes at priority 20, so set debug_rgw to at least 20
ceph config set client.rgw.my-store debug_rgw 20

# Make a test request
aws --endpoint-url http://rgw.example.com:7480 \
  s3 ls

# Check RGW logs for Lua debug output
kubectl -n rook-ceph logs -l app=rook-ceph-rgw --tail=50 \
  | grep "Lua:"

# Remove a script
radosgw-admin script rm --context=preRequest
```

## Summary

Lua scripting in Ceph RGW enables custom request processing logic without code changes or recompilation. Scripts are uploaded to RADOS via `radosgw-admin script put` and activated for specific contexts - preRequest for incoming requests and postRequest for outgoing responses. The embedded Lua interpreter provides access to request attributes, HTTP headers, bucket information, and user identity, making it a powerful tool for policy enforcement and observability.
