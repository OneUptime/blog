# Validation Summary: How to Integrate Ceph RGW with OpenStack Keystone

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Keystone (Identity Service)
- OpenStack CLI
- AWS CLI (for S3 access)
- NSS/certutil (for certificate management)
- cURL (for Swift API verification)

## Sources Consulted
- Ceph official documentation on RGW Keystone integration: https://docs.ceph.com/en/latest/radosgw/keystone/
- OpenStack CLI reference for `user create`, `role add`, `token issue`, `ec2 credentials create`: https://docs.openstack.org/python-openstackclient/latest/cli/
- AWS CLI v2 reference for `s3` commands and global options: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Ceph configuration reference for `rgw_keystone_*` options: https://docs.ceph.com/en/latest/radosgw/config-ref/

## Issues Found

1. **Misleading intro text for config section**: The text said "Set the Keystone configuration in ceph.conf:" but the commands use `ceph config set`, which writes to the centralized monitor config store, not the `ceph.conf` file. Changed to "Set the Keystone configuration via the centralized config store:".

2. **Project mismatch between RGW config and Keystone setup**: `rgw_keystone_admin_project` was set to `admin`, but the Keystone service account was created in and granted a role on the `service` project. This mismatch would cause RGW to fail authentication against Keystone. Changed `rgw_keystone_admin_project` from `admin` to `service` to match the Keystone setup.

3. **Invalid AWS CLI flags**: The `aws s3 ls` command used `--access-key` and `--secret-key` flags, which do not exist in the AWS CLI. Credentials must be provided via environment variables, config files, or profiles. Changed the command to use `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables inline.

## Review Notes
- The HTTPS/SSL section uses NSS (`certutil`, `nss_db_path`) for certificate management. Modern Ceph versions (Quincy and later) have shifted to OpenSSL by default, where `rgw_keystone_verify_ssl` combined with the system CA store or a custom CA bundle via OpenSSL is the preferred approach. The NSS method still works but readers using recent Ceph releases may want to consult current documentation for the OpenSSL-based approach.
- The `rgw_keystone_revocation_interval` setting controls PKI token revocation list checks. With Keystone v3 Fernet/JWT tokens (which are not revocable via CRL), this setting has reduced relevance but does not cause errors.
