# Validation Summary: How to Configure Multiple LDAP Servers for Failover in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer Business Edition (LDAP authentication)
- LDAP / LDAPS protocol
- OpenLDAP `ldapsearch` CLI utility
- curl (REST API client usage)
- Python (used as a one-line JSON parser)
- Bash shell scripting

## Sources Consulted
- Portainer source code, `LDAPSettings` struct in `api/portainer.go`: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer LDAP authentication docs: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer API examples (auth/JWT): https://docs.portainer.io/api/examples
- Portainer HTTP API by example: https://gist.github.com/deviantony/77026d402366b4b43fa5918d41bc42f8
- Portainer GitHub issue referencing `LDAPSettings.URLS` field: https://github.com/portainer/portainer/issues/12465
- OpenLDAP `ldapsearch(1)` man page: https://www.openldap.org/software/man.cgi?query=ldapsearch

## Issues Found
No technical issues found.

The following items were verified against official Portainer documentation and source code:

- `POST /api/auth` with JSON body `{"username":"...","password":"..."}` returning `{"jwt":"..."}` — correct.
- `PUT /api/settings` with `AuthenticationMethod` and `LDAPSettings` payload — correct.
- `AuthenticationMethod: 2` for LDAP (1=Internal, 2=LDAP, 3=OAuth) — correct, matches the iota-based enum in upstream source.
- LDAPSettings fields used in the post (`AnonymousMode`, `ReaderDN`, `Password`, `TLSConfig` with `TLS`/`TLSSkipVerify`, `SearchSettings` with `BaseDN`/`Filter`/`UserNameAttribute`, `AutoCreateUsers`) — all match the upstream `LDAPSettings` and `TLSConfiguration` structs.
- The `URLs` array (plural) is a Portainer Business Edition extension to LDAPSettings; this field name is referenced in upstream issues (e.g., #12465) and is consistent with the BE multi-server feature scoped in the post.
- `ldapsearch` flags (`-H`, `-D`, `-w`, `-b`) and command structure — match the OpenLDAP `ldapsearch` man page.
- The Python one-liner for extracting `jwt` from the auth response is syntactically correct.

## Review Notes
- The exact JSON shape for multi-server LDAP in Portainer Business Edition is not fully documented in public sources (BE is closed source). The `URLs` array field used in the post is plausible and consistent with public references, but readers on different BE versions should verify against their Portainer instance's `/api/settings` GET response if the API call is rejected.
- The "5–10 seconds" failover timeout is a reasonable approximation but is not a documented hard guarantee — it depends on the underlying Go LDAP client's connection timeout and any TLS handshake delay. The post hedges this correctly with "typically".
- The post correctly notes that multi-server LDAP is a Business Edition feature; this distinction is important since Portainer Community Edition's `LDAPSettings` struct only exposes a singular `URL` field.
- The Load Balancer Approach section is a sound architectural recommendation and is not a Portainer-specific configuration claim, so no version-specific verification is required there.
