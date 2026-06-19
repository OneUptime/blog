# Validation Summary: How to Configure OAuth2 with GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OAuth 2.0 authorization code flow
- GitHub OAuth Apps
- GitHub REST API
- GitHub OAuth scopes
- Python
- Flask
- Requests

## Sources Consulted
- GitHub Docs: Authorizing OAuth apps - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub Docs: Creating an OAuth app - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- GitHub Docs: Scopes for OAuth apps - https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub Docs: Authenticating to the REST API - https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api
- Flask Documentation: Sessions - https://flask.palletsprojects.com/en/stable/api/#sessions
- Flask Documentation: Configuration handling for session cookies - https://flask.palletsprojects.com/en/stable/config/

## Issues Found
- The post stored the GitHub access token directly in Flask's default `session` and described this as server-side session storage. Flask's default session is a signed client-side cookie, so the user can view the cookie contents even though they cannot modify them without the secret key. I changed the example to store the access token in a server-side demo token store and keep only an opaque session identifier in the Flask session cookie.
- The secure token storage guidance said to store tokens in a server-side session with secure cookies. I clarified that tokens should be stored server-side, such as in a server-side session store or database, and secure, HttpOnly cookies should hold the user's session identifier.
- The OAuth scope table described no scope as "Public user info only." GitHub documents no-scope OAuth access as read-only access to public information including user profile info, repository info, and gists. I updated the table entry to match GitHub's documentation.

## Review Notes
GitHub now strongly recommends PKCE parameters for the OAuth web application flow. The existing confidential-server example with `client_secret` remains valid, but adding PKCE would improve the guide in a future revision.
