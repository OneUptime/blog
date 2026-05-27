# Validation Summary: How to Use Firebase Hosting Rewrites to Route Traffic to Cloud Run Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Firebase Hosting
- Firebase Hosting rewrites
- Google Cloud Run
- Google Cloud CLI
- Firebase CLI
- Firebase Authentication
- Firebase Admin SDK for Node.js
- Express.js
- Docker
- npm

## Sources Consulted
- Firebase Hosting: Serve dynamic content and host microservices with Cloud Run: https://firebase.google.com/docs/hosting/cloud-run
- Firebase Hosting: Configure Hosting behavior and rewrites: https://firebase.google.com/docs/hosting/full-config
- Firebase Hosting: Manage cache behavior: https://firebase.google.com/docs/hosting/manage-cache
- Firebase Hosting: Connect a custom domain: https://firebase.google.com/docs/hosting/custom-domain
- Cloud Run: Map a custom domain using Firebase Hosting: https://docs.cloud.google.com/run/docs/mapping-custom-domains#firebase
- Cloud Run: Restrict network ingress: https://docs.cloud.google.com/run/docs/securing/ingress
- Google Cloud SDK: gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud SDK: gcloud run services logs read reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/services/logs/read
- Firebase CLI: auth:import and auth:export reference: https://firebase.google.com/docs/cli/auth
- Firebase Authentication: Verify ID tokens with the Admin SDK: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- npm CLI: npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci

## Issues Found
- The Dockerfile used `npm ci --only=production`. Updated it to `npm ci --omit=dev`, which is the current npm option for omitting development dependencies during install.
- The authentication section said Firebase Hosting passes through cookies and headers to Cloud Run. Updated it to clarify that request headers can be used, but cookies are generally stripped except for the specially named `__session` cookie.
- The custom domain section used `firebase hosting:channel:deploy production` as the command to add a custom domain and implied custom domains can be configured in `firebase.json`. Replaced this with the Firebase Hosting console/DNS workflow, which is how custom domains are connected.
- The custom domain section claimed the Cloud Run service does not need its own public URL and can be configured to only accept internal traffic. Updated this to say it does not need a separate custom domain or SSL certificate through Firebase Hosting, and added a cautious note about using Cloud Run ingress controls for direct `run.app` access.
- The monitoring section attempted to create an auth bearer token with `firebase auth:export --format=json` and `localId`. `auth:export` requires an output file and exports user records, not Firebase ID tokens. Replaced the example with a placeholder for a real Firebase ID token from a signed-in client.

## Review Notes
The remaining Firebase Hosting rewrite configuration, Cloud Run deployment command, cache-control examples, Firebase Admin SDK token verification flow, and Cloud Run log command are consistent with current official documentation. The example helper functions such as `getUsers()` and `createUser()` are intentionally placeholders and would need real implementations in a complete app.
