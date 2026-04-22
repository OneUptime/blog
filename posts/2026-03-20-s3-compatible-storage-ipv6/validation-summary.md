# Validation Summary: How to Configure S3-Compatible Storage with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 URL literals and dual-stack networking
- Amazon S3 dual-stack endpoints
- AWS CLI S3 and S3API commands
- Python boto3 / botocore S3 clients and presigned URLs
- Ceph RADOS Gateway (RGW)
- MinIO server and MinIO Client (`mc`)
- rclone S3 backend
- OpenSSL certificate generation
- curl, ss, and traceroute-style IPv6 checks

## Sources Consulted
- Amazon S3: Making requests to Amazon S3 over IPv6: https://docs.aws.amazon.com/AmazonS3/latest/API/ipv6-access.html
- Amazon S3: Using Amazon S3 dual-stack endpoints: https://docs.aws.amazon.com/AmazonS3/latest/API/dual-stack-endpoints.html
- AWS CLI v2 S3 configuration reference: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- AWS CLI command line options reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html
- boto3 configuration guide: https://docs.aws.amazon.com/boto3/latest/guide/configuration.html
- botocore Config reference: https://docs.aws.amazon.com/botocore/latest/reference/config.html
- boto3 S3 `generate_presigned_url` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/generate_presigned_url.html
- Ceph RGW HTTP Frontends documentation: https://docs.ceph.com/en/latest/radosgw/frontends/
- MinIO server reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO network encryption documentation: https://min.io/docs/minio/linux/operations/network-encryption.html
- rclone S3 backend documentation: https://rclone.org/s3/
- OpenSSL `req` command documentation: https://docs.openssl.org/3.0/man1/openssl-req/
- RFC 3986 URI generic syntax for IPv6 literals: https://www.rfc-editor.org/rfc/rfc3986
- curl manual for `--ipv6` / `-6`: https://curl.se/docs/manpage.html

## Issues Found
- The OpenSSL example used `-nodes`, which is deprecated in OpenSSL 3.0. Changed it to `-noenc`, the current equivalent for generating an unencrypted private key.
- The rclone MinIO configuration used `path_style = true`, which is not the current rclone S3 backend option name. Changed it to `force_path_style = true`.
- The rclone AWS dual-stack example set an explicit dual-stack endpoint URL. rclone has a dedicated `use_dual_stack = true` S3 backend option for AWS dual-stack endpoint selection, so the example now uses that option.
- The Ceph RGW AWS CLI example used `--no-verify-ssl` with an `http://` endpoint, where TLS certificate verification is not applicable. Removed the no-op flag from that HTTP example.
- The post said AWS SDK dual-stack configuration "prefers IPv6". Dual-stack endpoints make both IPv4 and IPv6 available, but address-family selection is made by the client/network stack. Updated the wording to avoid implying that the SDK itself forces IPv6 preference.

## Review Notes
The reviewed snippets are technically valid as examples, assuming the reader substitutes real routable IPv6 addresses and real credentials. AWS S3 dual-stack public endpoints do not cover S3 static website hosting over IPv6, but the post focuses on S3 API access, where dual-stack support is documented.
