# Validation Summary: How to Configure OpenID Connect Provider for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenID Connect (OIDC)
- AWS IAM / STS APIs (as implemented by Ceph RGW)
- AWS CLI
- radosgw-admin
- OpenSSL (for certificate thumbprint extraction)

## Sources Consulted
- Ceph OIDC Provider documentation: https://docs.ceph.com/en/latest/radosgw/oidc/
- Ceph OIDC doc source: https://github.com/ceph/ceph/blob/main/doc/radosgw/oidc.rst
- Ceph STS documentation: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph Role documentation: https://docs.ceph.com/en/latest/radosgw/role/
- radosgw-admin man page source: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- radosgw-admin help test file: https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- RGW REST OIDC Provider source: https://github.com/ceph/ceph/blob/main/src/rgw/rgw_rest_oidc_provider.cc
- Ceph HTTP Frontends documentation: https://docs.ceph.com/en/pacific/radosgw/frontends/

## Issues Found

### 1. Non-existent `radosgw-admin oidc-provider` CLI subcommands (Critical)
**What was wrong:** The post used `radosgw-admin oidc-provider create`, `list`, `get`, and `delete` subcommands with flags like `--provider-url`, `--client-id`, and `--thumbprint`. These subcommands do not exist in Ceph. OIDC provider management in Ceph RGW is done exclusively through the IAM-compatible REST API, not through radosgw-admin.

**What was changed:** Replaced all `radosgw-admin oidc-provider` commands with the correct AWS CLI equivalents:
- `radosgw-admin oidc-provider create --provider-url ... --client-id ... --thumbprint ...` replaced with `aws iam create-open-id-connect-provider --url ... --client-id-list ... --thumbprint-list ... --endpoint-url ...`
- `radosgw-admin oidc-provider list` replaced with `aws iam list-open-id-connect-providers --endpoint-url ...`
- `radosgw-admin oidc-provider get --provider-url ...` replaced with `aws iam get-open-id-connect-provider --open-id-connect-provider-arn ... --endpoint-url ...`
- `radosgw-admin oidc-provider delete --provider-url ...` replaced with `aws iam delete-open-id-connect-provider --open-id-connect-provider-arn ... --endpoint-url ...`

**Why:** The Ceph source code (radosgw-admin.cc, bash completion, man page) contains no OIDC provider subcommands. The official Ceph OIDC documentation exclusively documents REST API operations (CreateOpenIDConnectProvider, ListOpenIDConnectProviders, etc.) accessed via AWS-compatible clients.

## Review Notes
- The `radosgw-admin role create --assume-role-policy-doc` command is correct and well-documented in Ceph.
- The `AssumeRoleWithWebIdentity` STS operation is supported by Ceph RGW (requires `rgw_sts_key` and `rgw_s3_auth_use_sts = true` configuration).
- The OIDC provider ARN format `arn:aws:iam:::oidc-provider/...` with empty account field is correct for Ceph RGW.
- The thumbprint extraction script is technically correct.
- Port 7480 is the legacy Civetweb default; modern Ceph deployments using the Beast frontend default to port 80. The post uses it as a placeholder which is acceptable.
- The post could benefit from noting that `rgw_sts_key` and `rgw_s3_auth_use_sts = true` must be configured in ceph.conf for STS operations to work, but this omission is not an error per se.
