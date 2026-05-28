# Validation Summary: How to Deploy Firebase Extensions That Interact with GCP Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Firebase Extensions
- Cloud Firestore
- Cloud Functions for Firebase
- Cloud Storage for Firebase
- BigQuery
- Pub/Sub
- Firebase CLI
- Google Cloud CLI
- React and Firebase Web SDK

## Sources Consulted
- Firebase Extensions overview: https://firebase.google.com/docs/extensions
- Install Firebase Extensions: https://firebase.google.com/docs/extensions/install-extensions
- Manage installed Firebase Extensions: https://firebase.google.com/docs/extensions/manage-installed-extensions
- Stream Firestore to BigQuery extension source docs: https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/README.md
- Firestore to BigQuery import script guide: https://github.com/firebase/extensions/blob/master/firestore-bigquery-export/guides/IMPORT_EXISTING_DOCUMENTS.md
- `@firebaseextensions/fs-bq-import-collection --help` output from npm
- Resize Images extension docs: https://extensions.dev/extensions/firebase/storage-resize-images
- Trigger Email from Firestore extension docs: https://firebase.google.com/docs/extensions/official/firestore-send-email
- Trigger Email Handlebars templates docs: https://firebase.google.com/docs/extensions/official/firestore-send-email/templates
- Firebase CLI 15.19.0 `ext:*` command help from `npx firebase-tools`
- Google Cloud SDK `gcloud functions logs read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/logs/read

## Issues Found
- The Firestore to BigQuery section used `users_raw` as both the table ID and final table name. The official extension treats Table ID as a prefix and creates `<prefix>_raw_changelog` and `<prefix>_raw_latest`, so the post now uses `Table ID: users`, `users_raw_changelog`, and `--table-name-prefix users`.
- The React image example referenced React hooks and Firebase Storage APIs without imports, and its effect dependency list omitted `imagePath`. Added the required imports and dependency.
- The email template example did not show the required "Templates collection" configuration and called it a subcollection while using a top-level collection. Added `Templates collection: mail_templates` and corrected the wording.
- The Pub/Sub extension section referenced `firebase/firestore-pubsub`, which is not an official Firebase extension listed in Firebase's current Extensions Hub or official Firebase extensions repository. Replaced the invalid install command with a Firestore-triggered Cloud Function that publishes to Pub/Sub, plus the required Pub/Sub client dependency and topic creation command.
- The management section described `firebase ext:info INSTANCE_ID` as viewing an installed extension configuration, but current Firebase CLI help shows `ext:info` accepts an extension name, while installed instances are reconfigured with `ext:configure`. Updated the command and description.
- The log command used a generic `gcloud functions logs read` label filter that is brittle for current v2 extension functions. Replaced it with `firebase functions:log --only ext-firestore-bigquery-export-syncBigQuery`, matching Firebase's extension function naming convention.

## Review Notes
The post remains a high-level deployment guide. It does not cover all required production details for the replacement Pub/Sub Cloud Function, such as IAM role assignment for publishing to Pub/Sub, retry/dead-letter handling, and event payload size limits.
