# Validation Summary: How to Set Up Secret Versioning and Rollback Strategies in GCP Secret Manager

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud CLI
- Cloud Run
- Cloud Logging
- Python Secret Manager client library
- Bash scripting

## Sources Consulted
- Google Cloud Secret Manager REST API: SecretVersion resource and states: https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets.versions
- Google Cloud Secret Manager REST API: AccessSecretVersion and `latest` alias behavior: https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets.versions/access
- Google Cloud CLI reference: `gcloud secrets versions add`: https://cloud.google.com/sdk/gcloud/reference/secrets/versions/add
- Google Cloud CLI reference: `gcloud secrets versions access`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/versions/access
- Google Cloud CLI reference: `gcloud secrets versions describe`: https://cloud.google.com/sdk/gcloud/reference/secrets/versions/describe
- Google Cloud CLI reference: `gcloud secrets versions disable`: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/versions/disable
- Cloud Run documentation for configuring Secret Manager secrets: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Secret Manager audit logging documentation: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Python Secret Manager sample for listing versions with a filter: https://cloud.google.com/secret-manager/docs/samples/secretmanager-list-secret-versions-with-filter

## Issues Found
- The post incorrectly stated that `latest` points to the most recent enabled version. Google documents `latest` as an alias for the most recently created secret version, so I corrected that explanation.
- The rollback strategy based on disabling the newest version was incorrect because disabling the newest version does not make `latest` fall back to the previous enabled version. I changed the strategy to create a new rollback version from the last known good value, then optionally disable the bad version to prevent direct access.
- One rollback example implied that creating a new version with an old value would help systems pinned to the bad version number. I adjusted the rationale because pinned consumers must still be updated to a different version; creating a new version mainly helps consumers of `latest` or updated deployments.
- The Cloud Run examples used `--set-secrets` with `gcloud run deploy`. The Cloud Run documentation uses `--update-secrets` for `gcloud run deploy`; `--set-secrets` is documented for `gcloud run services update` when clearing existing secrets. I updated the deploy examples to use `--update-secrets`.
- The rollback script derived the newest version with `gcloud secrets versions list --sort-by="~name"`, which sorts version names as strings and can select the wrong version after version 9. I changed it to describe `latest` after creating the rollback version.
- The Cloud Logging query used an unsupported-looking Secret Manager monitored resource type filter. I changed it to filter Secret Manager audit logs by `protoPayload.serviceName`, `AccessSecretVersion` method name, and non-zero status code, matching the audit logging documentation.

## Review Notes
The examples assume text secrets. Google Cloud CLI formats `gcloud secrets versions access` output as UTF-8 unless `--out-file` or payload base64 decoding is used, so binary secret values would need a different handling pattern.
