# Validation Summary: How to Set Up SSO for Ceph RGW S3 Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Kubernetes operator for Ceph)
- STS (Security Token Service) with AssumeRoleWithWebIdentity
- OIDC (OpenID Connect) federation
- Keycloak (as example IdP)
- SAML2 (for Ceph Dashboard SSO)
- Python Flask with boto3
- AWS CLI (used against RGW endpoint)

## Sources Consulted
- Ceph RGW STS documentation: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph RGW STS Lite documentation: https://docs.ceph.com/en/latest/radosgw/STSLite/
- Ceph RGW OIDC Provider documentation: https://docs.ceph.com/en/latest/radosgw/oidc/
- Ceph Dashboard SSO documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- OAuth 2.0 Client Credentials Grant specification: https://oauth.net/2/grant-types/client-credentials/
- AWS AssumeRoleWithWebIdentity API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html

## Issues Found

1. **`rgw_sts_key` value format was incorrect.** The post used a plain text string `"sso-sts-key-32chars-exactly!!!"` but `rgw_sts_key` requires a 16-character hex string. Changed to `"$(openssl rand -hex 16)"` to generate a proper key.

2. **Invalid radosgw-admin capability `policies=*`.** The correct capability name is `user-policy=*`. Changed `--caps="roles=*;oidc-provider=*;policies=*"` to `--caps="roles=*;oidc-provider=*;user-policy=*"`.

3. **`ceph dashboard sso setup saml2` had wrong parameters.** The command included `email` as a fourth argument, but the actual signature accepts `idp_entity_id` as the optional fourth parameter, not an email attribute. Also, the IdP metadata URL should point to the SAML descriptor endpoint. Removed the `email` parameter and corrected the metadata URL to include `/descriptor`.

4. **`client_credentials` grant type does not return `id_token`.** The OAuth 2.0 client credentials flow returns an `access_token` only, not an `id_token` (which requires a user authentication context). Changed `jq -r '.id_token'` to `jq -r '.access_token'` in the test command.

## Review Notes
- The Python Flask example passes empty strings for `aws_access_key_id` and `aws_secret_access_key` when creating the STS client. This is a common workaround since `AssumeRoleWithWebIdentity` does not require AWS credentials, but some boto3 versions may reject empty strings. Using `botocore.UNSIGNED` config or dummy placeholder values may be more robust, but the current approach works in practice.
- The `urllib.parse` import in the Flask code is unused but harmless.
- The redirect URI in Step 1 (Keycloak client) is `http://localhost:8080/callback` but the Flask app in Step 4 runs on port 5000 with `http://localhost:5000/callback`. Users would need to align these, though this is noted as example configuration.
- The post grants `s3:*` on `*` resources which is overly permissive for production use, but acceptable for a tutorial demonstration.
