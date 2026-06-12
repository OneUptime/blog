# Validation Summary: How to Debug Keycloak Authentication Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Keycloak
- OpenID Connect and OAuth 2.0
- SAML
- JWT
- CORS
- Keycloak Admin CLI
- Browser cookies and session handling

## Sources Consulted
- Keycloak logging documentation: https://www.keycloak.org/server/logging
- Keycloak all configuration reference: https://www.keycloak.org/server/all-config
- Keycloak server administration guide: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak JavaScript adapter documentation: https://www.keycloak.org/securing-apps/javascript-adapter
- Keycloak hostname documentation: https://www.keycloak.org/server/hostname
- Keycloak reverse proxy documentation: https://www.keycloak.org/server/reverseproxy
- Keycloak 25.0.0 release notes on SameSite cookie changes: https://www.keycloak.org/2024/06/keycloak-2500-released
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html
- OAuth 2.0 RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749

## Issues Found
- Keycloak log-level examples used uppercase `DEBUG` and repeated `--log-level` options for categories. Updated examples to use lowercase levels and the documented comma-separated category syntax.
- The "Key log categories" snippet looked like a properties file using `org.keycloak...=DEBUG`, which is not the current CLI category syntax. Changed it to category-level pairs such as `org.keycloak.protocol.oidc:debug`.
- The authorization URL example was marked as `bash` even though it was an illustrative URL, not a shell command. Changed the fence to `text`.
- The client secret command attempted to read `secret` from the client list response. Updated it to resolve the client UUID first and then call `clients/$CID/client-secret`, matching the documented Admin CLI endpoint.
- The client credentials curl test did not mention that the grant requires service accounts to be enabled. Clarified the example comment.
- The JWT shell decode command used plain base64 decoding for a JWT payload. Updated it to handle base64url characters and missing padding before decoding.
- The cookie debugging step implied JavaScript can inspect all Keycloak cookies. Clarified that HttpOnly cookies require browser developer tools and broadened the JavaScript filter to include `KEYCLOAK` cookies.
- The session/cookie resolution used `--spi-cookie-default-same-site-attribute=None`, which is not a documented current Keycloak server option. Replaced it with a valid HTTPS hostname startup example.
- The SAML debug logging command used uppercase `DEBUG` and category-only `--log-level` syntax. Updated it to use lowercase and include a root log level.
- The events query used `--first` and `--max`; changed it to the documented Admin CLI pagination options `--offset` and `--limit`.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Some troubleshooting examples are necessarily deployment-dependent, especially CORS, cookie behavior, reverse proxy hostname handling, and token audiences, so readers should still compare the examples against their Keycloak version and client type.
