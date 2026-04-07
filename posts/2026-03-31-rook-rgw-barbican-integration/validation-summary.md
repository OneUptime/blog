# Validation Summary: How to Set Up Barbican Integration Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Barbican (Key Management Service)
- OpenStack Keystone (Identity Service)
- Rook (Ceph operator for Kubernetes)
- AWS CLI (S3-compatible operations)
- Kubernetes (ConfigMap, kubectl)

## Sources Consulted
- Ceph RGW SSE-KMS documentation: https://docs.ceph.com/en/latest/radosgw/encryption/#sse-kms
- Ceph RGW Barbican integration config options: https://docs.ceph.com/en/latest/radosgw/barbican/
- OpenStack Barbican CLI reference: https://docs.openstack.org/python-barbicanclient/latest/cli/index.html
- Rook Ceph configuration override documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- OpenStack `secret order create` vs `secret store` semantics

## Issues Found
- **Incorrect Barbican secret creation command**: The post used `openstack secret store` with `--algorithm`, `--bit-length`, and `--secret-type` flags but without a `--payload` flag. The `openstack secret store` command requires actual secret data via `--payload` or `--file`. To have Barbican generate a symmetric key, the correct command is `openstack secret order create key --name <name> --algorithm AES --bit-length 256`. Fixed the command to use `openstack secret order create key` and added an intermediate step to list orders before retrieving the secret href.

## Review Notes
- The Ceph RGW config option names (`rgw_crypt_s3_kms_backend`, `rgw_crypt_barbican_url`, `rgw_keystone_*`) are all correct and current.
- The Barbican default port (9311) and Keystone default port (5000) are correct.
- The Rook `rook-config-override` ConfigMap approach is the documented method for injecting custom Ceph configuration.
- The `--sse aws:kms` and `--sse-kms-key-id` AWS CLI flags are correct for SSE-KMS uploads against Ceph RGW.
- The password is not included in the Rook ConfigMap section, which is noted but not called out as an issue since it's a security best practice — in production, credentials should be managed via Kubernetes Secrets rather than ConfigMaps.
