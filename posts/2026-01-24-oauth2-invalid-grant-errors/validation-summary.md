# Validation Summary: How to Fix 'Invalid Grant' OAuth2 Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OAuth 2.0 authorization code flow
- OAuth 2.0 refresh tokens
- OAuth 2.0 token endpoint errors
- Flask
- Python requests
- Redis locking
- Linux time synchronization with chrony/systemd
- Python datetime APIs

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework - https://datatracker.ietf.org/doc/html/rfc6749
- RFC 7521: Assertion Framework for OAuth 2.0 Client Authentication and Authorization Grants - https://www.rfc-editor.org/rfc/rfc7521.html
- Python datetime documentation - https://docs.python.org/3/library/datetime.html
- Ubuntu Server documentation: Synchronize time using chrony - https://ubuntu.com/server/docs/how-to/networking/chrony-client/
- chrony FAQ - https://chrony-project.org/faq.html

## Issues Found
- The Flask callback snippet used `time.time()` without importing `time`. Added the missing import so the snippet is self-contained.
- The authorization-code race-condition snippet imported `functools.wraps` without using it. Removed the unused import.
- The clock-skew section implied clock skew generally causes `invalid_grant` in the standard authorization-code and refresh-token flows. Clarified that it is most relevant for signed assertions such as JWT bearer grants or client assertions, while standard grant lifetimes are enforced by the authorization server.
- The NTP commands mixed the `ntp` package with chrony commands and used `ntpq -p` even though the RHEL example installed chrony. Updated the examples to use chrony consistently and verify with `timedatectl status`, `chronyc tracking`, and `chronyc sources`.
- The external time-check command used plain HTTP. Updated it to HTTPS.
- The redirect URI solution normalized the URI by lowercasing and removing trailing slashes. OAuth requires the redirect URI used at token exchange to match the authorization request and registered value exactly, so the example now validates without rewriting the URI.
- The invalid-client-credentials section implied bad `client_id` or `client_secret` normally produces `invalid_grant`. Clarified that OAuth specifies `invalid_client` for failed client authentication, while `invalid_grant` applies when the grant is invalid, expired, revoked, redirect-URI mismatched, or issued to another client.
- The diagnostic snippet used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The secure configuration snippet imported `cryptography.fernet.Fernet` without using it. Removed the unused dependency.

## Review Notes
The examples remain provider-agnostic. Exact authorization-code lifetimes, refresh-token rotation rules, redirect URI registration rules, and provider error descriptions can vary by authorization server, but the corrected guidance now matches the OAuth RFC behavior and current Python/Linux documentation.
