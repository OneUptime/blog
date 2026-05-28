# Validation Summary: How to Integrate Firebase Authentication with Google Cloud IAM

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Firebase Authentication
- Firebase Admin SDK for Node.js and Python
- Firebase custom claims
- Cloud Run
- Cloud Functions for Firebase callable functions
- Google Cloud API Gateway
- Google Cloud CLI
- Express.js
- express-rate-limit
- Flask
- OpenAPI 2.0 / Swagger

## Sources Consulted
- Firebase Authentication: Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Authentication: Custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
- Firebase Admin SDK setup: https://firebase.google.com/docs/admin/setup
- Firebase JavaScript Auth API reference: https://firebase.google.com/docs/reference/js/auth
- Cloud Functions for Firebase callable reference: https://firebase.google.com/docs/functions/callable-reference
- Cloud Run public access documentation: https://cloud.google.com/run/docs/authenticating/public
- API Gateway with Cloud Run guide: https://cloud.google.com/api-gateway/docs/get-started-cloud-run
- API Gateway OpenAPI 2.0 extensions: https://cloud.google.com/api-gateway/docs/oasv2-extensions
- API Gateway deployment model: https://cloud.google.com/api-gateway/docs/deployment-model
- gcloud API Gateway api-configs create reference: https://cloud.google.com/sdk/gcloud/reference/api-gateway/api-configs/create
- gcloud API Gateway gateways create reference: https://cloud.google.com/sdk/gcloud/reference/api-gateway/gateways/create
- express-rate-limit documentation: https://express-rate-limit.mintlify.app/reference/helpers

## Issues Found
- The API Gateway `x-google-backend` examples were defined at the operation level without `path_translation`. API Gateway defaults operation-level backends to `CONSTANT_ADDRESS`, which would route `/api/profile` and `/api/public` to the Cloud Run root URL instead of preserving the path. Added `path_translation: APPEND_PATH_TO_ADDRESS` to both backend blocks.
- The API Gateway backend config did not preserve the client `Authorization` header expected by the Firebase token verification middleware. API Gateway can replace `Authorization` with its own backend identity token unless backend auth is disabled or the backend reads `X-Forwarded-Authorization`. Added `disable_auth: true` because the article deploys Cloud Run publicly and verifies Firebase tokens in the application.
- The API Gateway `host` placeholder used a non-current/incorrect gateway hostname pattern. Removed it, matching the current Google Cloud API Gateway Cloud Run OpenAPI 2.0 example, which omits `host`.
- The `express-rate-limit` example used the older default import style and returned `req.ip` directly in a custom `keyGenerator`. Current documentation recommends named import usage and `ipKeyGenerator()` when falling back to IP addresses, especially for IPv6 handling. Updated the snippet to import `rateLimit` and `ipKeyGenerator`, use `limit`, and register the middleware before API routes.

## Review Notes
The Firebase Admin SDK verification examples, custom claims usage, Firebase client token retrieval, Cloud Run public deployment approach, callable function auth context, and API Gateway CLI commands are consistent with the official documentation reviewed. The local environment did not have `gcloud` installed, so CLI flags were verified against the official Google Cloud SDK reference instead of local `--help` output.
