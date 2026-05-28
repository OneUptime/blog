# Validation Summary: Fix Firebase Deploy Failures Caused by Workload Identity Federation Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Firebase CLI and Firebase Hosting
- Google Cloud IAM
- Workload Identity Federation
- GitHub Actions OIDC authentication
- Cloud Functions for Firebase
- Cloud Build

## Sources Consulted
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines: https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Google Cloud IAM: Workload Identity Federation overview and principal identifier formats: https://cloud.google.com/iam/docs/workload-identity-federation
- google-github-actions/auth documentation: https://github.com/google-github-actions/auth
- Firebase IAM predefined product roles: https://firebase.google.com/docs/projects/iam/roles-predefined-product
- Firebase IAM permissions, including Cloud Functions deployment requirements: https://firebase.google.com/docs/projects/iam/permissions
- Firebase Cloud Functions deployment documentation: https://firebase.google.com/docs/functions/manage-functions
- Google Cloud SDK gcloud projects reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects
- Google Cloud SDK service account IAM binding reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding
- Google Cloud Cloud Build IAM roles: https://docs.cloud.google.com/build/docs/iam-roles-permissions

## Issues Found
- The project IAM examples used `gcloud projects add-iam-binding`, which is not a valid gcloud projects command. Changed each instance to `gcloud projects add-iam-policy-binding`.
- The provider command comment said "Create or update" while the command shown is `create-oidc`. Changed the comment to "Create" to avoid implying the command updates existing providers.
- The Cloud Functions deployment role used `roles/cloudfunctions.developer`. Firebase documentation states function deployment requires Cloud Functions Admin plus Service Account User. Changed it to `roles/cloudfunctions.admin`.
- The Cloud Build role used `roles/cloudbuild.builds.builder`, which is documented as the Cloud Build Service Account role. Changed it to `roles/cloudbuild.builds.editor` for a deployer identity that may need to create and inspect builds.
- The GitHub Actions workflow used `google-github-actions/auth@v2`. Current documentation uses `auth@v3`, so both workflow examples were updated.
- The token expiration section said Workload Identity Federation tokens are typically 1 hour. Current `google-github-actions/auth` documentation warns that GitHub OIDC tokens expire quickly and derived credentials can also be short-lived, so the wording was corrected.
- The debug step labeled a check of `GOOGLE_APPLICATION_CREDENTIALS` as "Access token present" even though it checks the credentials file path. Updated the label.
- The local impersonation test did not mention that the local user must have permission to impersonate the service account. Updated the comment.

## Review Notes
The post remains technically relevant and useful. The IAM role list is still intentionally broad for troubleshooting; a future least-privilege version could split Hosting-only, Functions 1st gen, and Functions 2nd gen deployments into separate role sets.
