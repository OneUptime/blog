# Validation Summary: How to Use Dapr with Huawei Cloud OBS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- Huawei Cloud Object Storage Service (OBS)
- Python (Dapr SDK)
- Kubernetes (secrets management)
- obsutil CLI (Huawei OBS CLI tool)

## Sources Consulted
- Dapr Huawei OBS binding specification: https://docs.dapr.io/reference/components-reference/supported-bindings/huawei-obs/
- Dapr components-contrib repository (bindings/huawei/obs): https://github.com/dapr/components-contrib
- Dapr Python SDK `invoke_binding` documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Bindings HTTP API reference: https://docs.dapr.io/reference/api/bindings_api/
- Huawei Cloud OBS obsutil documentation: https://support.huaweicloud.com/utiltg-obs/obs_11_0001.html

## Issues Found
1. **Unnecessary base64 encoding in Python SDK example**: The Python code manually base64-encoded data before passing it to `DaprClient.invoke_binding()`. The Dapr Python SDK communicates with the sidecar via gRPC, sending data as raw bytes — the SDK handles transport encoding internally. Manually base64-encoding the data would cause the base64 string itself to be stored in OBS rather than the decoded JSON content. This is different from the HTTP/curl API where the `data` field in the JSON request body is expected to be base64-encoded (and the sidecar decodes it). Removed `import base64`, the `encoded = base64.b64encode(...)` line, and changed the `data` parameter from `encoded` to `content`.

## Review Notes
- The `bindings.huawei.obs` component is in **Alpha** status as of the latest Dapr documentation. The API surface may change in future Dapr releases.
- The binding also supports `upload` and `list` operations beyond the `create`, `get`, and `delete` operations shown in the post. The post is not incorrect for omitting these — it covers the most common operations — but readers may benefit from knowing the full set.
- An optional `region` metadata field is supported but not mentioned. This is not an error since the `endpoint` field implicitly encodes the region.
