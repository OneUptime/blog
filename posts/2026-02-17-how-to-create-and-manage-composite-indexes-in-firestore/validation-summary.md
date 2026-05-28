# Validation Summary: How to Create and Manage Composite Indexes in Firestore

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud Firestore
- Firestore composite indexes
- Firestore single-field indexes and index exemptions
- Firebase CLI
- Google Cloud CLI (`gcloud firestore`)
- JavaScript / Firebase Admin SDK query examples

## Sources Consulted
- Cloud Firestore index types: https://firebase.google.com/docs/firestore/query-data/index-overview
- Manage indexes in Cloud Firestore: https://firebase.google.com/docs/firestore/query-data/indexing
- Cloud Firestore index definition reference: https://firebase.google.com/docs/reference/firestore/indexes
- Cloud Firestore usage and limits: https://firebase.google.com/docs/firestore/quotas
- Query with range and inequality filters on multiple fields: https://firebase.google.com/docs/firestore/query-data/multiple-range-fields
- Firebase CLI reference: https://firebase.google.com/docs/cli
- `gcloud firestore indexes composite create` reference: https://cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create
- `gcloud firestore indexes composite delete` reference: https://docs.cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/delete

## Issues Found
- The introduction implied every multi-field filter or sort requires a composite index. Firestore supports simple queries, `in` queries, and compound equality queries with automatic single-field indexes and index merging in some cases. Reworded the statement to focus on compound queries with range filters or sorting across multiple fields.
- The "When You Need a Composite Index" section said combining `array-contains` or `in` with additional filters always needs a composite index. Clarified this to additional range filters or sort orders, since some equality-only combinations can be handled by automatic indexes or index merging.
- The missing-index link flow said clicking the link creates the index. Firestore opens the Firebase console with the index pre-populated, and the user must review and click Create. Updated the wording.
- The `gcloud firestore indexes composite create` examples used uppercase enum values. The current `gcloud` reference documents lowercase values (`ascending`, `descending`, `contains`) for those flags. Updated the CLI examples.
- The Firebase deploy command used `firebase deploy --only firestore:indexes`. The current Firebase CLI docs document `firebase deploy --only firestore` for deploying Cloud Firestore rules and indexes. Updated the command and comment.
- The delete command described deleting by name only. The `gcloud` reference accepts an index ID or fully qualified identifier. Updated the placeholder to `INDEX_ID_OR_NAME`.
- The post said Firestore has a limit of 200 composite indexes per database. Current limits are 200 without billing enabled and 1000 with billing enabled. Updated the limit.
- The troubleshooting section suggested missing fields could explain an index stuck in `CREATING`. Firestore excludes documents that do not have values for all indexed fields; missing fields are not a build-stuck condition. Replaced that step with checking index operation status.

## Review Notes
The `gcloud` and Firebase CLIs were not installed in the local workspace, so CLI verification used the current official command references instead of local `--help` output. The JavaScript snippets use the Firebase Admin SDK chaining style and are syntactically valid as query construction examples.
