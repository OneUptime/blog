# Validation Summary: How to Build a CI/CD Pipeline for Cloud Functions Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Build
- Google Cloud CLI
- Firebase Local Emulator Suite
- Cloud Firestore emulator
- Pub/Sub emulator
- Node.js
- Jest
- ESLint
- Python Cloud Functions runtime

## Sources Consulted
- Google Cloud CLI reference for `gcloud functions deploy`: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud CLI reference for `gcloud functions describe`: https://cloud.google.com/sdk/gcloud/reference/functions/describe
- Google Cloud CLI reference for `gcloud builds triggers create github`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build configuration schema and build step ordering: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build Firebase builder image documentation: https://docs.cloud.google.com/build/docs/deploying-builds/deploy-firebase
- Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/concepts/function-runtimes
- Firebase Local Emulator Suite installation and configuration: https://firebase.google.com/docs/emulator-suite/install_and_configure
- Firebase Cloud Firestore emulator connection documentation: https://firebase.google.com/docs/emulator-suite/connect_firestore
- Pub/Sub emulator documentation: https://cloud.google.com/pubsub/docs/emulator
- Pub/Sub Node.js publishing documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud CLI reference for `gcloud run revisions list`: https://cloud.google.com/sdk/gcloud/reference/run/revisions/list
- Google Cloud CLI reference for `gcloud run services update-traffic`: https://cloud.google.com/sdk/gcloud/reference/run/services/update-traffic
- Cloud Run functions traffic splitting and rollback documentation: https://cloud.google.com/functions/docs/configuring/traffic-splitting

## Issues Found
- The integration-test Cloud Build step used the generic `node:20` image and installed `firebase-tools` with npm. The Firestore emulator is Java-based, and Google Cloud provides a Firebase builder image for invoking Firebase commands in Cloud Build. Changed the step to use `us-docker.pkg.dev/firebase-cli/us/firebase`.
- The lint step used `npx eslint . --ext .js || true`, which allowed lint failures while deployment still waited on the lint step. Changed the step to collect failures and exit non-zero so deployment is blocked when linting fails.
- The rollback example used `--platform=managed` with `gcloud run revisions list`. The current `gcloud run revisions list` reference does not include that flag. Removed `--platform=managed`.

## Review Notes
- The examples use supported runtimes (`nodejs20` and `python311`) and current Cloud Functions Gen2 deployment flags.
- The Firestore and Pub/Sub emulator environment variables correctly omit URL schemes and use the documented default ports.
- The Pub/Sub client example uses the current `publishMessage` API.
