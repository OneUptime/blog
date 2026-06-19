# Validation Summary: How to Fix 'Insufficient Scope' OAuth2 Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OAuth 2.0
- OAuth 2.0 bearer tokens
- OAuth scopes
- Google OAuth incremental authorization
- GitHub OAuth scopes and API permission errors
- Python
- JSON
- Mermaid diagrams

## Sources Consulted
- RFC 6749: The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- Google Identity: Using OAuth 2.0 for Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- GitHub Docs: Scopes for OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub Docs: Troubleshooting the REST API: https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api
- GitHub Docs: Use GITHUB_TOKEN for authentication in workflows: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token

## Issues Found
- The post showed `insufficient_scope` as a standard JSON response body. RFC 6750 defines the interoperable signal for protected resource failures as a `WWW-Authenticate: Bearer` challenge, usually with HTTP 403 for insufficient scope. I changed the example to an HTTP response header and updated the detection function to inspect `WWW-Authenticate` headers while still tolerating JSON-style provider responses.
- The JSON example used comments and multiple objects in a `json` fence, which was not valid JSON. I split the examples so the HTTP response uses an `http` fence and the GitHub message remains valid JSON.
- Several GitHub-like scope examples (`write:user`, `read:repos`, `write:repos`) are not GitHub OAuth app scopes. I updated the sample scopes to GitHub-documented scopes such as `read:user`, `user`, `user:email`, and `repo`.
- The incremental authorization Python snippet used `urlencode` and OAuth constants without defining them. I added the missing import and changed the class to receive the OAuth configuration values explicitly.

## Review Notes
GitHub's `Resource not accessible by integration` message can indicate missing GitHub App, fine-grained token, or `GITHUB_TOKEN` permissions rather than a literal OAuth `insufficient_scope` response. The post now treats it as a provider-specific permission error pattern, not the OAuth standard format.
