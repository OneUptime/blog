# Validation Summary: How to Troubleshoot OAuth Login Issues in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Portainer (Enterprise Edition)
- OAuth 2.0 / OpenID Connect (OIDC)
- Docker / Docker CLI
- Portainer HTTP API (`/api/auth`, `/api/settings`)
- Bash / curl / python3

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer OAuth settings docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer `portainer.go` (OAuthSettings struct): https://github.com/portainer/portainer/blob/master/api/portainer.go
- Portainer troubleshooting/logs FAQ: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself
- Portainer issue #6376 (log level usage): https://github.com/portainer/portainer/issues/6376

## Issues Found
No technical issues found.

Verified:
- Docker run command for Portainer EE (ports 8000/9443, `-v /var/run/docker.sock`, `-v portainer_data:/data`) is correct.
- `--log-level DEBUG` is a valid Portainer CLI flag; accepted values include DEBUG/INFO/WARN/ERROR.
- `/api/auth` returns a JWT in a `jwt` field - correct.
- `/api/settings` supports GET and PUT - correct.
- `OAuthSettings` field names (`ClientID`, `ClientSecret`, `AccessTokenURI`, `AuthorizationURI`, `ResourceURI`, `RedirectURI`, `UserIdentifier`, `Scopes`, `OAuthAutoCreateUsers`, `DefaultTeamID`, `SSO`, `LogoutURI`) match the upstream struct in `api/portainer.go`.
- Common OAuth error strings (`redirect_uri_mismatch`, `invalid_client`) match RFC 6749 §5.2 and the OAuth 2.0 Authorization Framework.

## Review Notes
- The post uses `portainer/portainer-ee:latest`. Many readers run the community edition; the commands work identically with `portainer/portainer-ce:latest`. This is a stylistic choice of the author, not an error.
- Partial PUTs to `/api/settings` (e.g. sending only `{"OAuthSettings": {...}}`) are accepted by Portainer's API, which merges the payload with existing settings - this is the intended behaviour shown in the post.
- Using `--insecure`/`-k` with curl is acceptable for a local troubleshooting context against `https://localhost:9443`, but readers should avoid it against production instances.
- `DEBUG` log level is verbose; the implicit advice to revert to `INFO`/`WARN` after troubleshooting is worth remembering but is not strictly required for correctness.
