# Validation Summary: How to Fix 'Invalid Redirect URI' OAuth2 Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OAuth 2.0 authorization code flow
- OpenID Connect redirect URI handling
- Google OAuth 2.0
- GitHub OAuth Apps and passport-github2
- Microsoft Entra ID / Azure AD
- Django django-allauth
- ASP.NET Core appsettings.json
- Node.js, Express, axios, express-session
- Python requests-oauthlib

## Sources Consulted
- RFC 6749, The OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749
- Google OAuth 2.0 for Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
- Google OpenID Connect documentation: https://developers.google.com/identity/openid-connect/openid-connect
- GitHub OAuth Apps authorization documentation: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Microsoft redirect URI best practices and limitations: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- Microsoft AADSTS50011 redirect URI mismatch documentation: https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50011-redirect-uri-mismatch
- Microsoft ASP.NET Core web app authentication tutorial: https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-app-dotnet-prepare-app
- django-allauth Google provider documentation: https://docs.allauth.org/en/dev/socialaccount/providers/google.html
- django-allauth provider configuration documentation: https://docs.allauth.org/en/dev/socialaccount/provider_configuration.html
- requests-oauthlib OAuth 2 workflow documentation: https://requests-oauthlib.readthedocs.io/en/latest/oauth2_workflow.html
- passport-github2 package documentation: https://www.passportjs.org/packages/passport-github2/

## Issues Found
- The django-allauth Google settings example used an `APP` key for client credentials. Current django-allauth documentation shows settings-based provider credentials under `APPS`, so the snippet was updated to use `APPS` while preserving the existing scope and auth parameter example.
- The Microsoft Azure AD `appsettings.json` sample was fenced as C# and contained JavaScript-style comments, which are not valid JSON for `appsettings.json`. The block was changed to valid JSON and the explanatory redirect URI text was moved outside the code block.
- The Node.js "complete working example" generated the redirect URI from the incoming request host and used a `verifyState()` placeholder that always returned `true`. This contradicted OAuth redirect URI registration guidance and did not actually verify CSRF state. The example now uses a registered environment redirect URI and stores/verifies state with `express-session`.
- The Node.js callback error redirect concatenated an unencoded provider error value into a URL. It now uses `encodeURIComponent()`.

## Review Notes
- GitHub OAuth Apps support one configured authorization callback URL per OAuth App, but GitHub's optional `redirect_uri` parameter has documented matching behavior for subdomains and subpaths. The post's advice to use separate OAuth Apps for substantially different environments remains a practical and technically valid approach.
- Microsoft Entra ID has special localhost handling, including cases where localhost ports are ignored for matching. The post's general port-mismatch advice is accurate for many providers and non-localhost redirects, but future revisions could mention provider-specific localhost exceptions.
- The full Node.js sample was syntax-checked with `node --check`.
