# Validation Summary: How to Configure OAuth2 with Microsoft Azure AD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID / Azure Active Directory
- OAuth 2.0 authorization code flow
- OpenID Connect
- PKCE
- Microsoft Graph API
- Python
- Flask
- Requests

## Sources Consulted
- Microsoft identity platform OAuth 2.0 authorization code flow: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- Microsoft identity platform OpenID Connect protocol: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Microsoft Graph app registration guide: https://learn.microsoft.com/en-us/graph/auth-register-app-v2
- Microsoft Graph Get user API permissions: https://learn.microsoft.com/en-us/graph/api/user-get
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Entra redirect URI restrictions: https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- Microsoft Entra authentication and authorization error codes: https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes
- Flask Quickstart: https://flask.palletsprojects.com/en/stable/quickstart/
- Flask configuration documentation: https://flask.palletsprojects.com/en/stable/config/
- Requests Quickstart: https://requests.readthedocs.io/en/latest/user/quickstart/

## Issues Found
- The Flask code used `@app.route` but did not create a Flask application object. Added `app = Flask(__name__)`.
- The Flask code used `session` without configuring a secret key. Added an `AZURE_AD_FLASK_SECRET_KEY` environment variable and assigned it to `app.secret_key`, which Flask requires for signed session cookies.
- The logout snippet used `url_for` without importing it. Added `url_for` to the Flask imports.
- The authorization code sample did not include PKCE. Added `code_verifier`, `code_challenge`, and `code_challenge_method=S256` to align with Microsoft identity platform guidance for authorization code flow.
- The token exchange did not send the PKCE verifier. Added `code_verifier` to the token request.
- The authentication configuration said to enable ID tokens whenever using OpenID Connect. Updated the wording to clarify that the app registration's "ID tokens" checkbox is for implicit or hybrid OpenID Connect responses, not the plain authorization code flow shown in the sample.

## Review Notes
- Microsoft recommends using MSAL instead of hand-crafting raw protocol requests for production applications. The direct HTTP sample is now technically consistent, but a future revision could mention MSAL as the preferred production approach.
- Client secrets are acceptable for confidential web apps, but Microsoft recommends certificates or federated credentials over client secrets for production workloads.
