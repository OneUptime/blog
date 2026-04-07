# Validation Summary: How to Configure SSL Verification for Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Beast frontend (Ceph RGW HTTP frontend)
- OpenSSL
- Kubernetes Secrets (TLS type)
- AWS CLI (S3-compatible client configuration)

## Sources Consulted
- Ceph documentation on RGW frontend configuration (beast SSL parameters: `ssl_port`, `ssl_certificate`, `ssl_private_key`)
- Ceph configuration reference for `rgw_verify_ssl` option
- Rook documentation on CephObjectStore CRD (`gateway.securePort`, `gateway.sslCertificateRef`)
- Kubernetes documentation on `kubectl create secret tls`
- OpenSSL CLI reference for self-signed certificate generation
- AWS CLI S3 documentation for `--ca-bundle` and `--endpoint-url` flags

## Issues Found
No technical issues found.

## Review Notes
- The `--ca-bundle` flag with a self-signed certificate works because the self-signed cert acts as its own CA. This is correct for testing but worth noting that in production a proper CA chain would be used.
- The post correctly warns that `rgw_verify_ssl false` should only be used in dev/test environments.
- RSA 2048-bit key size in the self-signed cert example is acceptable, though 4096-bit is increasingly recommended for new deployments.
