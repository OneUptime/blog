# Validation Summary: How to Use Dapr with AWS S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bindings API)
- AWS S3 (object storage)
- Python (requests library)
- AWS CLI (s3api commands)

## Sources Consulted
- Dapr AWS S3 binding spec: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr S3 binding source code: https://github.com/dapr/components-contrib/blob/main/bindings/aws/s3/s3.go

## Issues Found

1. **Description claimed input binding support**: The description stated "Use Dapr output and input bindings... event-triggered processing" but the AWS S3 binding is output-only. Fixed to "Use Dapr output bindings... listing".

2. **Upload used unnecessary base64 encoding without component support**: The upload function base64-encoded data before sending, but the component config did not set `decodeBase64: "true"`, meaning the base64-encoded string would be stored as-is in S3. Fixed by removing base64 encoding and passing data directly in the `data` field, which Dapr serializes and uploads correctly.

3. **Download assumed JSON-wrapped response with `resp.json()["data"]`**: The Dapr binding HTTP API returns the raw object content as the response body for the `get` operation, not a JSON object with a `"data"` field. Fixed to use `resp.content` to get raw bytes.

4. **List operation passed parameters in `metadata` instead of `data`**: Per official docs, the `list` operation expects `prefix`, `maxResults`, `marker`, and `delimiter` in the request `data` field, not `metadata`. Also `maxResults` should be an integer, not a string. Fixed accordingly.

5. **List response handling assumed flat list with lowercase fields**: The actual S3 list response is a structured object with a `Contents` array where each item uses capitalized field names (`Key`, `LastModified`, `ETag`, `Size`, `StorageClass`). Fixed to iterate over `result.get("Contents", [])` with `obj["Key"]` and `obj["LastModified"]`.

## Review Notes
- The `presign` operation code and response field name (`presignURL`) are correct per the official docs.
- The delete operation code is correct.
- The component YAML `secretKeyRef` syntax is correct for referencing Dapr secret stores.
- The AWS CLI commands for creating the bucket and enabling versioning are correct. Note that `--region us-east-1` with `create-bucket` does not require `--create-bucket-configuration` since us-east-1 is the default region.
