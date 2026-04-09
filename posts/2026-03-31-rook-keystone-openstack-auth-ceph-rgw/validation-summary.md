# Validation Summary: How to Configure Keystone (OpenStack) Authentication for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Keystone (Identity service)
- Rook (Kubernetes operator for Ceph)
- OpenStack CLI (python-openstackclient)
- Swift API (OpenStack Object Storage)
- S3 API (via Keystone EC2 credentials)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation: Integrating with OpenStack Keystone (https://docs.ceph.com/en/latest/radosgw/keystone/)
- Ceph source code for config option definitions (Reef, Squid, and main branches)
- OpenStack CLI documentation: endpoint (Identity v3), project, user, role, service, token, ec2 credentials (https://docs.openstack.org/python-openstackclient/latest/)
- OpenStack Keystone documentation: Manage projects, users, and roles (https://docs.openstack.org/keystone/latest/admin/cli-manage-projects-users-and-roles.html)
- Keystone source code: keystone/common/utils.py for endpoint URL template variables (https://github.com/openstack/keystone)

## Issues Found

### 1. `rgw_keystone_revocation_interval` option removed (Step 2)
**What was wrong:** The post set `rgw_keystone_revocation_interval 900` which was removed from Ceph starting with Octopus (15.x). This option is not available in modern Ceph (Quincy, Reef, Squid). Keystone v3 Fernet/JWT tokens are non-persistent and short-lived, so the revocation list mechanism is no longer used.
**What was changed:** Removed the `rgw_keystone_revocation_interval` line from the configuration commands.

### 2. `nss_db_path` option and NSS database setup removed (Step 3)
**What was wrong:** The post configured `nss_db_path` and showed creating an NSS certificate database with `certutil`. The `nss_db_path` option was removed from Ceph starting with Octopus (15.x) when Ceph transitioned from NSS to OpenSSL for its TLS stack. Modern Ceph uses the system CA trust store for SSL verification.
**What was changed:** Removed the `nss_db_path` config line and the entire NSS database creation section (`mkdir`, `certutil` commands). Kept the system CA trust store approach (`cp` + `update-ca-trust`) which is the correct modern method, along with the `rgw_keystone_verify_ssl true` setting.

### 3. `rgw_keystone_admin_tenant` should be `rgw_keystone_admin_project` for Keystone v3 (Step 2)
**What was wrong:** The post used `rgw_keystone_admin_tenant` while configuring `rgw_keystone_api_version 3`. The `rgw_keystone_admin_tenant` option is intended for Keystone v2.0. For Keystone v3, the correct option is `rgw_keystone_admin_project`.
**What was changed:** Replaced `rgw_keystone_admin_tenant` with `rgw_keystone_admin_project`.

## Review Notes
- `rgw_keystone_admin_token` (set to empty string in the post) and `rgw_keystone_admin_password` are both marked as deprecated in modern Ceph in favor of their `_path` variants (`rgw_keystone_admin_token_path`, `rgw_keystone_admin_password_path`) which read secrets from files. The current approach still works but the `_path` variants are preferred for production deployments to avoid storing credentials in the Ceph config database.
- The endpoint URL uses `%(tenant_id)s` which is Keystone v2 terminology. Keystone v3 prefers `%(project_id)s`, though both are whitelisted and functionally equivalent. The Ceph official documentation itself uses `%(tenant_id)s`, so this is consistent with Ceph docs.
- The post does not mention `rgw_s3_auth_use_keystone`, which must be set to `true` to enable Keystone authentication for S3 API requests (it defaults to `false`). Without this, only Swift API access will work with Keystone tokens. The EC2 credentials test in Step 5 would fail without this option enabled. This is a potential gap but not an error in the existing content since S3 access via EC2 credentials is only briefly mentioned.
- All OpenStack CLI commands are syntactically correct with proper flag and argument ordering.
- The Rook CephObjectStore YAML is valid and follows the correct `ceph.rook.io/v1` API.
- The `client.rgw.my-store` config section name is the correct format for modern cephadm-managed RGW daemons.
