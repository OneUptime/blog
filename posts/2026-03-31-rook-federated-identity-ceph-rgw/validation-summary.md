# Validation Summary: How to Set Up Federated Identity with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS STS (AssumeRoleWithWebIdentity)
- OIDC (OpenID Connect)
- AWS IAM (roles, trust policies, OIDC providers)
- Python boto3
- Okta (as example IdP)
- OpenSSL (for thumbprint extraction)

## Sources Consulted
- Ceph STS documentation: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph STS Lite documentation: https://docs.ceph.com/en/latest/radosgw/STSLite/
- Ceph OIDC provider documentation: https://docs.ceph.com/en/latest/radosgw/oidc/
- Ceph Admin Guide (admin capabilities): https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph Keycloak integration guide: https://docs.ceph.com/en/latest/radosgw/keycloak/
- AWS boto3 STS client documentation (assume_role_with_web_identity)
- AWS IAM OIDC provider API reference

## Issues Found

1. **Incorrect `rgw_sts_key` value format (Line 20):** The original value `"federated-sts-key-32chars!!!!!!!!"` was a plain text string. The Ceph documentation specifies that `rgw_sts_key` should be a hex string. Changed to `"$(openssl rand -hex 16)"` to generate a proper hex key.

2. **Invalid admin capability `policies` (Line 26):** The `--caps` flag included `policies=*`, which is not a valid Ceph RGW admin capability type. The valid capability types include `users`, `buckets`, `metadata`, `usage`, `zone`, `roles`, `user-policy`, `oidc-provider`, among others. Changed `policies=*` to `user-policy=*`, which is the correct capability for managing IAM policies.

## Review Notes
- The OIDC thumbprint extraction command gets the leaf certificate fingerprint. Depending on the IdP setup, the intermediate or root CA certificate thumbprint may be needed in production.
- The Python code passes empty strings for `aws_access_key_id` and `aws_secret_access_key` when creating the STS client. This works because `AssumeRoleWithWebIdentity` is an unsigned API call and Ceph RGW ignores the signature. An alternative is using `botocore.config.Config(signature_version=botocore.UNSIGNED)`.
- The `groups` claim condition in Step 5 depends on the IdP including a `groups` claim in the JWT token, which is common for Okta but not guaranteed for all OIDC providers.
