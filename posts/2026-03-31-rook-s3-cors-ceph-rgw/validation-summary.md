# Validation Summary: How to Configure S3 Cross-Origin Resource Sharing (CORS) in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS S3 API (CORS operations)
- AWS CLI (`s3api` subcommands)
- Python boto3 SDK
- JavaScript Fetch API
- curl

## Sources Consulted
- AWS CLI s3api reference for `put-bucket-cors`, `get-bucket-cors`, `delete-bucket-cors`: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-cors.html
- boto3 S3 client `put_bucket_cors` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/put_bucket_cors.html
- Ceph RGW S3 API compatibility documentation: https://docs.ceph.com/en/latest/radosgw/s3/bucketops/#put-bucket-cors
- MDN Web Docs on CORS preflight requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Rook Ceph documentation on RGW service naming: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found
No technical issues found.

## Review Notes
- The CORS JSON configuration uses the correct AWS S3 format with `CORSRules` as the top-level key and proper field names (`AllowedHeaders`, `AllowedMethods`, `AllowedOrigins`, `ExposeHeaders`, `MaxAgeSeconds`).
- The boto3 example correctly uses path-style addressing (`Config(s3={"addressing_style": "path"})`), which is the recommended approach for Ceph RGW since virtual-hosted-style requires DNS configuration.
- The curl preflight test correctly demonstrates all three required CORS preflight headers (`Origin`, `Access-Control-Request-Method`, `Access-Control-Request-Headers`).
- The JavaScript example assumes `presignedUrl` and `file` are already defined, which is appropriate for a snippet showing the upload pattern rather than a complete application.
- The `AllowedMethods` in the first CORS rule includes `HEAD`, which is supported by Ceph RGW's S3 CORS implementation.
