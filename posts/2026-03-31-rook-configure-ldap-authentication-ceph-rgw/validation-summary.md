# Validation Summary: How to Configure LDAP Authentication for Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- LDAP / Active Directory authentication
- S3 API
- radosgw-token utility
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation: LDAP Authentication for Ceph Object Gateway (`doc/radosgw/ldap-auth.rst` from the Ceph GitHub repository)
- Ceph RGW configuration options source: `src/common/options/rgw.yaml.in` from the Ceph GitHub repository
- Verified all LDAP-related config parameter names against the canonical option definitions in the Ceph source code

## Issues Found

### Issue 1: LDAP auth described as Swift API feature — actually S3 only
- **What was wrong:** The post stated LDAP auth is "primarily used with the Swift API" and all usage examples used Swift auth endpoints (X-Auth-User, X-Auth-Key headers, /auth/1.0 endpoint, swiftclient).
- **What was changed:** Corrected to describe LDAP auth as an S3 feature controlled by `rgw_s3_auth_use_ldap`. Replaced Swift examples with the correct token-based S3 workflow using `radosgw-token`.
- **Why:** The official Ceph docs and source code confirm LDAP auth is exclusively for S3 via the `rgw_s3_auth_use_ldap` parameter. The authentication mechanism uses base64-encoded tokens as S3 access keys, not Swift HTTP Basic Auth.

### Issue 2: Wrong parameter name `rgw_ldap_bindpw_path`
- **What was wrong:** The blog used `rgw_ldap_bindpw_path` to configure the bind password file path.
- **What was changed:** Corrected to `rgw_ldap_secret`, with the default path `/etc/openldap/secret` matching Ceph defaults.
- **Why:** `rgw_ldap_bindpw_path` does not exist in Ceph. The correct parameter is `rgw_ldap_secret` (verified in `rgw.yaml.in`).

### Issue 3: Missing critical `rgw_s3_auth_use_ldap` parameter
- **What was wrong:** The post never mentioned enabling LDAP auth with `rgw_s3_auth_use_ldap = true`.
- **What was changed:** Added `ceph config set client.rgw rgw_s3_auth_use_ldap true` as the first configuration step.
- **Why:** Without this parameter set to true, RGW will not use LDAP for authentication at all. It defaults to false.

### Issue 4: Wrong authentication flow description
- **What was wrong:** The post described the flow as "Client sends an HTTP request with an Authorization header containing an LDAP username and password" followed by a direct LDAP bind.
- **What was changed:** Corrected to describe the token-based flow: user generates a base64-encoded token with `radosgw-token`, uses it as the S3 access key, and RGW extracts credentials from the token to perform LDAP search and bind.
- **Why:** RGW LDAP auth uses a token mechanism, not direct credential passing. The `radosgw-token` utility encodes credentials into a JSON structure that is base64-encoded and used as the AWS access key.

### Issue 5: Non-existent TLS parameters `rgw_ldap_cacert` and `rgw_ldap_use_start_tls`
- **What was wrong:** The post referenced `rgw_ldap_cacert` for configuring a TLS CA certificate and `rgw_ldap_use_start_tls` for STARTTLS.
- **What was changed:** Removed these fabricated parameters. Simplified the TLS section to use `ldaps://` URI scheme and system trust store for CA certificates.
- **Why:** Neither `rgw_ldap_cacert` nor `rgw_ldap_use_start_tls` exist in Ceph's configuration options (verified in `rgw.yaml.in`). The official docs only recommend using `ldaps://` in the URI.

### Issue 6: Incorrect LDAP search filter syntax
- **What was wrong:** The search filter example used `(memberOf=...)` as a standalone filter.
- **What was changed:** Updated to use the complete filter format with `@USERNAME@` token: `(&(uid=@USERNAME@)(memberOf=...))`.
- **Why:** The official docs describe two filter modes. When using a complete filter (one that includes the username), the `@USERNAME@` token is dynamically substituted. This is the correct way to combine user matching with group membership filtering.

### Issue 7: Incorrect Active Directory bind DN format
- **What was wrong:** The AD bind DN was shown as `corp\\service-account` (NTLM-style).
- **What was changed:** Corrected to use a full Distinguished Name format: `CN=service-account,OU=services,DC=corp,DC=example,DC=com`.
- **Why:** The `rgw_ldap_binddn` parameter expects a proper LDAP Distinguished Name, not a Windows NTLM-style domain\user format.

## Review Notes
- The "Installing Required Packages" section references bare-metal package installation (apt-get/dnf), which may not be relevant for Rook-based deployments where Ceph runs in containers. The packages are typically pre-installed in official Ceph container images. This is not technically wrong but could be misleading given the Rook tag.
- The `radosgw-token` utility must be available on the client machine. In containerized environments, it can be run from within the Ceph toolbox container.
