# Validation Summary: How to Use External Secrets Operator with GCP Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Google Kubernetes Engine (GKE)
- GKE Workload Identity
- Google Cloud Secret Manager
- External Secrets Operator
- Helm
- gcloud CLI
- Stakater Reloader

## Sources Consulted
- External Secrets Operator Google Cloud Secret Manager provider documentation: https://external-secrets.io/main/provider/google-secrets-manager/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Google Cloud Secret Manager create and access secrets documentation: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud Secret Manager add secret version documentation: https://docs.cloud.google.com/secret-manager/docs/add-secret-version
- Google Cloud Secret Manager assign version alias documentation: https://docs.cloud.google.com/secret-manager/docs/assign-alias-to-secret-version
- Google Cloud Secret Manager audit logging documentation: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Secret Manager rotation schedules documentation: https://cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud IAM Conditions overview and attribute reference: https://docs.cloud.google.com/iam/docs/conditions-overview and https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/latest/reference/annotations.html

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to `external-secrets.io/v1` to match the current stable API shown in the ESO documentation.
- Corrected the Workload Identity `SecretStore` and `ClusterSecretStore` examples. The post grants GCP access to the ESO controller service account, so the store should use controller credentials and does not need an `auth.workloadIdentity.serviceAccountRef` block.
- Replaced the invalid `gcloud secrets add-version-alias` command with the documented `gcloud secrets update database-password --update-version-aliases=stable=2` command.
- Changed the service-account-key fallback to create the Kubernetes credentials Secret in the same namespace as the namespaced `SecretStore`, and removed the cross-namespace selector from the `SecretStore` example.
- Corrected the Secret Manager audit log query to filter by `protoPayload.serviceName="secretmanager.googleapis.com"`.
- Adjusted rotation wording so the post describes versioned rotation workflows rather than implying that adding a version is Secret Manager automatic rotation.
- Updated IAM Conditions wording to align with the time-based condition example and avoid implying an unsupported generic IP condition in that snippet.

## Review Notes
- The examples grant `roles/secretmanager.secretAccessor` at the project level for simplicity. In production, secret-level IAM bindings or narrower project organization are preferable when teams share a project.
- Secret Manager Data Access audit logs may need to be explicitly enabled before secret access reads appear in Cloud Logging.
