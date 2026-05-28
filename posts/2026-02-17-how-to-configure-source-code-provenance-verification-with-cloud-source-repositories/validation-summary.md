# Validation Summary: How to Configure Source Code Provenance Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Cloud Source Repositories
- Cloud Build
- Artifact Registry
- SLSA provenance
- slsa-verifier
- GKE / Kubernetes admission webhooks
- BigQuery
- Git commit signing

## Sources Consulted
- Google Cloud: Generate and validate build provenance: https://cloud.google.com/build/docs/securing-builds/generate-validate-build-provenance
- Google Cloud: Cloud Source Repositories resources and availability notice: https://cloud.google.com/source-repositories/docs/resources
- Google Cloud: Cloud Source Repositories audit logging: https://cloud.google.com/source-repositories/docs/audit-logging
- Google Cloud: Clone Cloud Source Repositories: https://cloud.google.com/source-repositories/docs/cloning-repositories
- Google Cloud SDK: gcloud artifacts docker images describe: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud: Configure BigQuery notifications for Cloud Build: https://cloud.google.com/build/docs/configuring-notifications/configure-bigquery
- SLSA: Build levels: https://slsa.dev/spec/v1.0/levels
- SLSA verifier: Google Cloud Build container verification: https://github.com/slsa-framework/slsa-verifier
- Kubernetes: Admission webhooks: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- Cloud Source Repositories was presented as generally available for new setups. Added the official June 17, 2024 availability caveat and pointed new Google Cloud customers toward supported source hosts.
- The post said SLSA defines four current levels ending at Level 4. Updated this to the current SLSA Build track levels, Level 0 through Level 3.
- The setup section referenced branch protection for Cloud Source Repositories, which is not a documented Cloud Source Repositories feature. Reworded this to repository access and audit logging.
- The audit logging text claimed every access event would be recorded. Narrowed the claim to read and write API activity covered by Data Access audit logs.
- The Cloud Build example used an explicit `docker push` step and then hand-created a provenance JSON file. Official Cloud Build documentation says provenance generation requires the `images` field and cannot be generated when the image is pushed with an explicit `docker push` step. Removed the push step and the misleading manual attestation generation.
- The deployment-time Python example used incomplete helper functions and checked Cloud Build fields that do not represent attached SLSA provenance for container images. Replaced it with the documented `gcloud artifacts docker images describe --show-provenance` and `slsa-verifier verify-image` flow.
- The builder ID in the admission policy was too broad. Updated it to the documented Google-hosted Cloud Build builder ID.
- The BigQuery monitoring query assumed a Cloud Build logs table and provenance fields that are not part of a documented default schema. Reframed it as a Cloud Build BigQuery notifier query and aligned field names with the documented notifier examples.

## Review Notes
The admission webhook remains illustrative: the helper functions `get_provenance` and `validate_against_policy` are policy-specific placeholders, and a production webhook should also handle workload kinds whose pod template is nested under `spec.template.spec`. The `SOURCE_URI` used with `slsa-verifier` must match the repository URI recorded in the actual provenance.
