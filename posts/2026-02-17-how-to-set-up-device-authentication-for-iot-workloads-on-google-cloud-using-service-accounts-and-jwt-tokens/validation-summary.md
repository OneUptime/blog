# Validation Summary: How to Set Up Device Auth for IoT Workloads on Google Cloud Using Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud IAM service accounts
- IAM Service Account Credentials API
- Cloud Functions
- Pub/Sub
- Firestore
- JWT / ES256
- PyJWT
- Python Google Cloud client libraries
- OpenSSL
- VPC Service Controls

## Sources Consulted
- Google Cloud SDK documentation for `gcloud iam service-accounts create`: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud SDK documentation for `gcloud projects add-iam-policy-binding`: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK documentation for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud IAM authentication documentation: https://cloud.google.com/iam/docs/authentication
- Google Cloud IAMCredentialsClient Python reference: https://cloud.google.com/python/docs/reference/iam/latest/google.cloud.iam_credentials_v1.services.iam_credentials.IAMCredentialsClient
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- Google Cloud VPC Service Controls overview: https://cloud.google.com/vpc-service-controls/docs/overview
- Google Cloud VPC Service Controls supported products and limitations: https://cloud.google.com/vpc-service-controls/docs/supported-products
- Google Cloud Pub/Sub client library documentation: https://cloud.google.com/pubsub/docs/reference/libraries

## Issues Found
- The token service used `jwt.verify`, which is not a PyJWT API. Changed it to `jwt.decode(...)` with the registered public key, ES256 algorithm allowlist, required claims, and explicit audience validation.
- The token service included an `aud` claim in device JWTs but did not validate it. Added a `JWT_AUDIENCE` constant and `audience=JWT_AUDIENCE` during verification.
- The initial unverified JWT read was described as decoding the header, but the code decoded the payload. Corrected the comment and disabled audience verification for that unverified payload read.
- The Cloud Function generated an access token from a checked-in service account key file, while the text described devices assuming the target service account. Replaced this with IAM Service Account Credentials API impersonation and added setup commands for a separate token broker service account with `roles/iam.serviceAccountTokenCreator`.
- The prerequisites omitted the IAM Service Account Credentials API, which is required for `generate_access_token`. Added it to the prerequisite API list.
- The deploy command did not bind the Cloud Function to the token broker service account. Added the `--service-account` flag.
- The device-side code guessed token expiry with `time.time() + 3500` instead of using the expiry returned by the token service. Updated it to parse `expires_at`.
- The VPC Service Controls recommendation said it restricts Pub/Sub access to the project's network. Reworded it to describe a service perimeter, matching Google Cloud's terminology.

## Review Notes
The post is technically relevant and salvageable. The revised approach still leaves production hardening decisions to the reader, such as rate limiting the unauthenticated token endpoint, protecting Firestore writes, deciding whether per-device IAM is needed, and using secure hardware for private keys where available.
