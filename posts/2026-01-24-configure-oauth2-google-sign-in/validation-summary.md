# Validation Summary: How to Configure OAuth2 with Google Sign-In

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google OAuth 2.0 / OpenID Connect
- Google Cloud Console OAuth clients and consent screen
- Google Cloud CLI (`gcloud services enable`)
- Node.js, Express, Axios, JSON Web Tokens, Google Auth Library
- Python, Flask, Requests, Google Auth Library for Python
- JavaScript and React frontend authentication patterns
- Nginx HTTPS reverse proxy configuration

## Sources Consulted
- Google Identity: OpenID Connect, https://developers.google.com/identity/openid-connect/openid-connect
- Google Identity: OAuth 2.0 for Web Server Applications, https://developers.google.com/identity/protocols/oauth2/web-server
- Google Identity: Verify the Google ID token on your server side, https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Google Sign-In backend authentication guide, https://developers.google.com/identity/sign-in/web/backend-auth
- Google OAuth 2.0 scopes for Google APIs, https://developers.google.com/identity/protocols/oauth2/scopes
- Google+ API shutdown notice, https://developers.google.com/+/api-shutdown
- Google Cloud SDK `gcloud services enable` reference, https://docs.cloud.google.com/sdk/gcloud/reference/services/enable
- Python `urllib.parse` documentation, https://docs.python.org/3/library/urllib.parse.html
- Google People API REST reference, https://developers.google.com/people/api/rest
- Google Calendar API overview / Cloud Marketplace service listing, https://developers.google.com/workspace/calendar/api/guides/overview and https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
- Google Drive API reference, https://developers.google.com/workspace/drive/api/reference/rest/v3

## Issues Found
- The post described enabling `oauth2.googleapis.com`, `people.googleapis.com`, and the retired `plus.googleapis.com` as required APIs. Basic OpenID Connect sign-in does not require a separate product API, and Google+ APIs were shut down in 2019. I changed the section to say product APIs should be enabled only when the app calls them and replaced the retired Google+ API with current optional People, Calendar, and Drive API examples.
- The sign-in scopes used full `userinfo.email` and `userinfo.profile` scope URLs in one snippet while the implementation used `email` and `profile`. Google’s OpenID Connect docs document `openid profile email` for this flow, so I changed the scope snippet to `openid`, `email`, and `profile`.
- The Node.js example decoded the ID token with `jwt.decode`, which does not verify the token signature, audience, issuer, or expiry. I changed it to use `google-auth-library` `OAuth2Client.verifyIdToken()` before trusting identity claims.
- The examples used the older Google OAuth userinfo endpoint. I changed them to the OpenID Connect discovery userinfo endpoint, `https://openidconnect.googleapis.com/v1/userinfo`.
- The Flask authorization URL was built by manually concatenating query parameters, which fails to correctly URL-encode values such as redirect URIs and scopes. I changed it to use `urllib.parse.urlencode`.
- The Node.js and Flask examples accepted caller-provided post-login redirect paths without constraining them to same-app paths. I added local-path normalization to avoid open redirect behavior.
- The refresh token example posted a refresh token from browser JavaScript. Google’s OAuth guidance says refresh tokens should be stored securely, and refresh tokens are not typically used in client-side JavaScript web apps. I changed the example so the server stores the refresh token and the browser calls `/auth/refresh` without sending the token.

## Review Notes
The React usage example still assumes surrounding app components and router imports exist, so it is illustrative rather than a complete standalone file. The OAuth guidance would be stronger in the future if it used Google client libraries end-to-end for the authorization code exchange instead of manual HTTP calls, but the corrected manual flow is technically valid.
