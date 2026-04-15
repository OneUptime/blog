# Validation Summary: How to Use Dapr with Alibaba Cloud Object Storage (OSS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Alibaba Cloud Object Storage Service (OSS)
- Dapr output bindings (`bindings.alicloud.oss`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- ossutil CLI
- Kubernetes secrets

## Sources Consulted
- Dapr Alibaba Cloud OSS Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/alicloudoss/
- Dapr components-contrib OSS source code: https://github.com/dapr/components-contrib/blob/master/bindings/alicloud/oss/oss.go
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Go SDK Client Package: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Alibaba Cloud ossutil mb command reference: https://www.alibabacloud.com/help/en/oss/developer-reference/mb
- Alibaba Cloud ossutil set-acl command reference: https://www.alibabacloud.com/help/en/oss/developer-reference/set-acl

## Issues Found

### 1. Unsupported operations documented (HIGH severity)
**What was wrong:** The post included sections for "Downloading Objects" (`get`), "Deleting Objects" (`delete`), and "Listing Objects" (`list`) operations. The Dapr Alibaba Cloud OSS binding only supports the `create` operation. Calling `get`, `delete`, or `list` would fail at runtime with an unsupported operation error.
**What was changed:** Removed the three sections for unsupported operations. Updated the overview and summary to clarify that only the `create` operation is supported, and added a note about using the Alibaba Cloud OSS SDK directly for other operations.

### 2. `ossutil mb --region` flag does not exist (MEDIUM severity)
**What was wrong:** The command `ossutil mb oss://my-dapr-bucket --region=cn-hangzhou` used a non-existent `--region` flag. The `mb` command uses `-e` to specify a regional endpoint.
**What was changed:** Corrected to `ossutil mb oss://my-dapr-bucket -e oss-cn-hangzhou.aliyuncs.com`.

### 3. `ossutil set-acl` missing `-b` flag (MEDIUM severity)
**What was wrong:** The command `ossutil set-acl oss://my-dapr-bucket private` was missing the required `-b` flag for setting a bucket-level ACL. Without it, ossutil interprets the target as an object, not a bucket.
**What was changed:** Corrected to `ossutil set-acl oss://my-dapr-bucket private -b`.

### 4. `contentType` metadata is not functional (LOW severity)
**What was wrong:** The curl and Go examples passed `contentType` in the operation metadata. The Dapr OSS binding source code only reads the `key` metadata field and does not pass content type to the underlying OSS `PutObject` call. The field is silently ignored.
**What was changed:** Removed `contentType` from both the curl and Go code examples to avoid giving readers the false impression that it has any effect.

### 5. Description inaccuracy
**What was wrong:** The post description claimed the binding could "upload, download, and manage objects" when only upload (create) is supported.
**What was changed:** Updated to "upload objects to Alibaba Cloud Object Storage from microservices."

## Review Notes
- The component type `bindings.alicloud.oss`, metadata field names (`endpoint`, `accessKeyID`, `accessKey`, `bucket`), API version (`v1`), Dapr bindings API URL format, and Go SDK usage are all correct.
- The Dapr Go SDK `InvokeBindingRequest` struct and `InvokeBinding` method signature are used correctly.
- The Kubernetes secret creation command and `secretKeyRef` pattern in the component YAML are correct.
- If Dapr adds support for additional operations (get, delete, list) to the OSS binding in the future, this post could be updated to include those sections again.
