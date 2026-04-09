# Validation Summary: How to Integrate Ceph RGW with Keycloak

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Keycloak (OpenID Connect provider)
- AWS STS (AssumeRoleWithWebIdentity)
- AWS CLI (IAM and STS operations against RGW)
- radosgw-admin (role and policy management)

## Sources Consulted
- Ceph OIDC Provider documentation: https://docs.ceph.com/en/latest/radosgw/oidc/
- Ceph STS documentation: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph Role documentation: https://docs.ceph.com/en/latest/radosgw/role/
- Ceph Keycloak integration guide: https://github.com/ceph/ceph/blob/main/doc/radosgw/keycloak.rst
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- radosgw-admin help.t (canonical help output): https://github.com/ceph/ceph/blob/main/src/test/cli/radosgw-admin/help.t
- Ceph blog on RGW STS: https://ceph.io/en/news/blog/2025/rgw-modernizing-sts/
- Keycloak Quarkus migration guide: https://www.keycloak.org/migration/migrating-to-quarkus

## Issues Found

### 1. Fabricated `radosgw-admin oidc-provider` commands (HIGH severity)
**What was wrong:** The post used `radosgw-admin oidc-provider create` and `radosgw-admin oidc-provider list` commands, which do not exist in any version of radosgw-admin. OIDC provider management in Ceph RGW is done exclusively through the AWS IAM-compatible REST API.
**What was changed:** Replaced both commands with the correct AWS CLI equivalents: `aws iam create-open-id-connect-provider` and `aws iam list-open-id-connect-providers` (with `--endpoint` pointed at the RGW). Added prerequisite step to create an RGW user with `oidc-provider=*` capabilities.

### 2. Incorrect thumbprint format (MEDIUM severity)
**What was wrong:** The thumbprint was shown in colon-separated hex format (`AA:BB:CC:DD:...`). The AWS CLI and Ceph expect a plain 40-character hex string without colons.
**What was changed:** Changed to plain hex format (`AABBCCDDEEFF00112233445566778899AABBCCDD`) and added a note clarifying it is the SHA-1 fingerprint of the server's TLS certificate.

### 3. Missing STS prerequisites (MEDIUM severity)
**What was wrong:** The post did not mention that `rgw_s3_auth_use_sts` and `rgw_sts_key` must be configured in the Ceph config for STS to work. Without these, the entire AssumeRoleWithWebIdentity flow will fail.
**What was changed:** Added a "Prerequisites" section before the architecture overview explaining these required config settings and how to generate the STS key.

## Review Notes
- The Keycloak URLs in the post use the `/auth/realms/` path format, which was the default prior to Keycloak 17 (WildFly-based). Starting with Keycloak 17+ (Quarkus-based, 2022), the default changed to `/realms/` without the `/auth` prefix. The old path can be restored via `KC_HTTP_RELATIVE_PATH=/auth`. Since this is an example URL and both formats are in common use, no change was made, but readers on newer Keycloak versions should be aware.
- The trust policy uses `"Federated": "arn:..."` as a string. Official Ceph documentation examples sometimes use the array form `"Federated": ["arn:..."]`. Both forms work, but the array form is more consistent with documented examples.
- The trust policy condition uses `:sub` as the claim key. The more commonly documented condition key in Ceph examples is `:app_id` (mapping to the `aud` claim). Using `:sub` is valid for restricting by subject, but readers may want to consider `:app_id` for audience-based restrictions depending on their use case.
