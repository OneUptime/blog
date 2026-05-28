# Validation Summary: How to Connect Firebase to Cloud SQL for Relational Database Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Firebase Cloud Functions v2
- Cloud Run
- Cloud SQL for PostgreSQL and MySQL
- Cloud SQL Auth Proxy
- Google Cloud CLI
- Secret Manager
- Node.js, TypeScript, and node-postgres
- Firebase Authentication
- Knex.js migrations

## Sources Consulted
- Firebase Cloud Functions environment configuration and secrets: https://firebase.google.com/docs/functions/config-env
- Firebase Functions v2 Node.js API reference: https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions
- Firebase Functions v2 HTTPS options reference: https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions.https
- Firebase Functions service account documentation: https://firebase.google.com/docs/functions/manage-functions
- Cloud SQL for PostgreSQL: connect from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Cloud SQL for PostgreSQL: connect from Cloud Run functions: https://cloud.google.com/sql/docs/postgres/connect-functions
- Cloud SQL Auth Proxy documentation: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Cloud SQL PostgreSQL flags and max_connections defaults: https://cloud.google.com/sql/docs/postgres/flags
- gcloud sql instances create reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- gcloud sql users create reference: https://cloud.google.com/sdk/gcloud/reference/sql/users/create
- gcloud sql connect reference: https://cloud.google.com/sdk/gcloud/reference/sql/connect
- node-postgres query documentation: https://node-postgres.com/features/queries
- Firebase Admin Auth verify ID tokens documentation: https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Issues Found
- The post implied that referencing `/cloudsql/` from Firebase Cloud Functions v2 automatically mounts the Cloud SQL proxy. I changed the explanation and setup steps to state that the generated Cloud Run service must be configured with the Cloud SQL instance, using `gcloud run services update --add-cloudsql-instances`.
- The initial Firebase Functions code created `DB_USER`, `DB_NAME`, and `CLOUD_SQL_CONNECTION_NAME` as Secret Manager secrets but only bound `DB_PASSWORD`, so most values would be unavailable at runtime. I updated the code to define and bind all four secrets and access them with `.value()`.
- The `firebase.json` section did not actually configure Cloud SQL and could mislead readers. I replaced it with the supported Cloud Run service attachment command, and clarified that VPC connectors are for private IP connections.
- The Cloud SQL connection limit table listed tier-based values that did not match current Cloud SQL for PostgreSQL defaults. I replaced it with the official memory-based default `max_connections` values.
- The Firebase Auth integration snippet imported a Firestore trigger but used `onRequest`, and accessed `req.user`, which is not present on the standard request object. I changed it to verify a Firebase ID token with the Firebase Admin SDK.
- The Unix socket troubleshooting section said the socket path should work automatically for Cloud Functions v2. I changed it to tell readers to verify the Cloud Run service's Cloud SQL attachment.
- The IAM example granted `roles/cloudsql.client` to the App Engine default service account. Current Firebase Functions v2 defaults to the Compute Engine default service account, so I updated the member placeholder.
- The cold-start prewarm snippet initialized the pool at module load, which can be unsafe with Firebase v2 secret parameters during deployment discovery. I changed it to use the Firebase v2 `onInit` runtime initialization hook.
- The performance tips said parameterized queries are automatically prepared. node-postgres parameterized queries are not automatically named prepared statements, so I changed the guidance to describe parameterized queries accurately.

## Review Notes
- The post remains focused on PostgreSQL for its runnable TypeScript examples, while briefly mentioning MySQL setup. A future improvement could add a parallel `mysql2` connection snippet.
- If teams need Cloud SQL configuration to survive every Firebase deployment without a manual `gcloud run services update`, they should manage the Cloud Run service configuration in their deployment workflow.
