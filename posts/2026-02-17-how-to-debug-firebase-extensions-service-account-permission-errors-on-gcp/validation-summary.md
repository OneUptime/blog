# Validation Summary: How to Debug Firebase Extensions Service Account Permission Errors on GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Firebase Extensions
- Cloud Functions for Firebase
- Google Cloud IAM
- Google Cloud service accounts
- Google Cloud CLI
- Firebase CLI
- Google Cloud organization policies

## Sources Consulted
- Firebase Extensions permissions documentation: https://firebase.google.com/docs/extensions/permissions-granted-to-extension
- Firebase Extensions overview and install/manage role requirements: https://firebase.google.com/docs/extensions/overview-use-extensions
- Firebase Extensions `extension.yaml` reference: https://firebase.google.com/docs/extensions/reference/extension-yaml
- Firebase Extensions access setup documentation: https://firebase.google.com/docs/extensions/publishers/access
- Firebase Extensions management documentation: https://firebase.google.com/docs/extensions/manage-installed-extensions
- Firebase CLI reference: https://firebase.google.com/docs/cli
- Cloud Functions for Firebase service account documentation: https://firebase.google.com/docs/functions/manage-functions
- Google Cloud IAM service account roles documentation: https://cloud.google.com/iam/docs/service-account-permissions
- Google Cloud IAM service account policy binding documentation: https://cloud.google.com/iam/docs/manage-access-service-accounts
- Google Cloud SDK `gcloud functions logs read` reference: https://cloud.google.com/sdk/gcloud/reference/functions/logs/read
- Google Cloud SDK organization policy command reference: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- Google Cloud organization policy constraints reference: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Official Firebase Extensions GitHub source for Firestore BigQuery Export: https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/extension.yaml
- Official Firebase Extensions GitHub source for Resize Images: https://github.com/firebase/extensions/blob/next/storage-resize-images/extension.yaml

## Issues Found
- Corrected the service account explanation. Firebase documentation says each installed extension instance gets its own `ext-...@...iam.gserviceaccount.com` service account, while Cloud Functions default service accounts differ for 1st gen and 2nd gen functions.
- Corrected install/manage role guidance to match Firebase documentation: Owner, Editor, or Firebase Admin.
- Tightened the IAM policy filter example to include the `serviceAccount:` member prefix.
- Updated example extension roles to include the current Firestore BigQuery Export `roles/bigquery.user` role and the Resize Images `roles/aiplatform.user` role for AI content filtering.
- Clarified that missing extension-declared roles should be restored, not that arbitrary extra roles should be added to the extension service account.
- Fixed the Cloud Functions logs command wording and command example. `gcloud functions logs read` reads recent logs rather than tailing, and extension function names use the documented `ext-EXTENSION_INSTANCE_ID-FUNCTION_NAME` pattern.
- Updated organization policy examples to distinguish 1st gen `constraints/cloudfunctions.allowedIngressSettings`, 2nd gen `constraints/run.allowedIngress`, and resource location restrictions.
- Clarified that uninstalling removes the service account created for the extension instance.

## Review Notes
Firebase CLI and Google Cloud CLI were not installed in the local environment, so CLI syntax was verified against official command references rather than local `--help` output.
