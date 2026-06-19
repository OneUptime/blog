# Validation Summary: How to Fix 'Access Denied' OAuth2 Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OAuth2 / OpenID Connect (RFC 6749 authorization endpoint error responses)
- Python 3 (dataclasses, enums, type hints)
- Flask (callback route handling, templates)
- Microsoft Entra ID (Azure AD) admin consent flow
- Microsoft Graph API (`oauth2PermissionGrants`)
- Google-style incremental authorization (`include_granted_scopes`)

## Sources Consulted
- RFC 6749, The OAuth 2.0 Authorization Framework, §4.1.2.1 / §4.2.2.1 (authorization endpoint error codes including `access_denied`) — https://datatracker.ietf.org/doc/html/rfc6749
- Microsoft identity platform admin consent protocols (v2.0 admin consent endpoint, parameters, and `admin_consent=True` callback) — https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
- Microsoft Graph `oauth2PermissionGrants` reference (clientId filter) — https://learn.microsoft.com/en-us/graph/api/resources/oauth2permissiongrant
- Google Identity incremental authorization (`include_granted_scopes`) — https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth

## Issues Found
No technical issues found.

- The `access_denied` error code and its description ("The resource owner or authorization server denied the request") match RFC 6749 §4.1.2.1.
- The Microsoft Entra v2.0 admin consent URL (`https://login.microsoftonline.com/{tenant}/v2.0/adminconsent`), its required parameters (`client_id`, `scope`, `redirect_uri`, `state`), and the `admin_consent=True` callback value all match the current Microsoft documentation.
- The Microsoft Graph `oauth2PermissionGrants` endpoint and `$filter=clientId eq '...'` usage are valid.
- All Python code (Flask callback handling, `DenialReason`/`PolicyType` enums, `ScopeConfig` dataclass, scope validation, redirect URI normalization, comprehensive error dispatcher) is syntactically correct and uses non-deprecated APIs.
- Redirect URI normalization correctly lowercases only scheme/netloc and leaves the path case-sensitive, consistent with URI semantics.

## Review Notes
- The opening sequence diagram labels some causes as `access_denied (invalid_scope)` and `access_denied (unauthorized_client)`. Per RFC 6749, `invalid_scope` and `unauthorized_client` are distinct top-level authorization-endpoint error codes, not sub-codes returned under `access_denied`. The diagram reads as a conceptual grouping of denial causes (and the rest of the post correctly handles `invalid_scope`/`unauthorized_client` as separate top-level errors in `OAuth2ErrorHandler`), so this is a presentational simplification rather than a code error. Left as-is to avoid restructuring the author's diagram; worth tightening in a future revision.
- The error sub-codes shown in parentheses (`user_denied`, `policy_violation`) are illustrative — they are not standardized OAuth2 error codes. The post's own `classify_denial`/`parse_policy_error` functions derive these from free-text `error_description`, which is the correct approach since providers vary.
- The redirect URI validator performs normalization (trailing-slash and case folding) for diagnostic/UX purposes; real authorization servers perform exact string matching per RFC 6749 §3.1.2.3 and the OAuth 2.0 Security BCP. This is consistent with how the post frames it (a client-side helper), but readers should not assume servers normalize.
- Microsoft also returns `admin_consent=True` on the admin-consent *error* callback (alongside an `error` parameter); the post's `handle_admin_consent_callback` checks `error` first, so it handles this correctly.
