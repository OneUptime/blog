# Validation Summary: How to Integrate Ceph RGW with OpenStack Barbican

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Barbican (Key Management Service)
- OpenStack Keystone (Identity Service)
- AWS CLI (S3-compatible commands)
- Python boto3 SDK
- Rook (mentioned in tags)

## Sources Consulted
- Ceph RGW Barbican Integration documentation: https://docs.ceph.com/en/latest/radosgw/barbican/
- Ceph RGW Encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph RGW Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- OpenStack Barbican CLI documentation (python-barbicanclient)
- AWS CLI S3 SSE-KMS documentation
- boto3 S3 put_object API reference

## Issues Found

### 1. Incorrect Barbican URL config option name
- **What was wrong:** The post used `rgw_crypt_barbican_url` as the Ceph config option for the Barbican endpoint.
- **What was changed:** Corrected to `rgw_barbican_url`, which is the actual option name per the official Ceph documentation.
- **Why:** Using the wrong option name would cause RGW to not connect to Barbican, silently ignoring the setting.

### 2. Wrong Keystone option names for Barbican authentication
- **What was wrong:** The post used general `rgw_keystone_admin_*` options (e.g., `rgw_keystone_admin_user`, `rgw_keystone_admin_password`) for Barbican access.
- **What was changed:** Corrected to the Barbican-specific Keystone options: `rgw_keystone_barbican_user`, `rgw_keystone_barbican_password`, `rgw_keystone_barbican_domain`, and `rgw_keystone_barbican_project`.
- **Why:** Ceph RGW has dedicated `rgw_keystone_barbican_*` options for authenticating to Barbican. The `rgw_keystone_admin_*` options serve a different purpose (general Keystone admin auth) and would not configure Barbican access correctly.

### 3. Incorrect Barbican CLI command for key generation
- **What was wrong:** The post used `openstack secret store` without a `--payload` flag to create encryption keys. This command only stores user-provided secrets; without a payload, it creates an empty secret metadata entry with no actual key material.
- **What was changed:** Corrected to `openstack secret order create key`, which instructs Barbican to generate the symmetric key material. Also removed the `--secret-type symmetric` flag (not valid for `order create key`) and added a note about retrieving the secret reference from the completed order.
- **Why:** Using `secret store` without a payload would create a secret with no key data, causing RGW SSE-KMS operations to fail when trying to retrieve the encryption key.

### 4. Same issue in Key Rotation section
- **What was wrong:** The key rotation section also used `openstack secret store` and the misleading comment "Create new key version" (Barbican doesn't have key versioning — it creates entirely new secrets).
- **What was changed:** Corrected to `openstack secret order create key` with appropriate comment. Added `--mode CBC` for consistency with the initial key creation.
- **Why:** Same reason as issue #3 — no key material would be generated.

## Review Notes
- The architecture diagram and SSE-KMS flow description are accurate.
- The AWS CLI commands (`--sse aws:kms`, `--sse-kms-key-id`) and boto3 code are correct for SSE-KMS uploads to Ceph RGW.
- The `rgw_crypt_require_ssl false` setting is appropriately flagged as testing-only.
- The `TOKEN=$(openstack token issue ...)` line in the "Creating a Secret" section is not actually used by the subsequent commands. It's harmless but unnecessary since `openstack secret order create key` handles authentication via the OS environment variables or clouds.yaml.
- The post could benefit from mentioning that `rgw_crypt_s3_kms_backend = barbican` is the default value in many Ceph versions, but this is not an error.
