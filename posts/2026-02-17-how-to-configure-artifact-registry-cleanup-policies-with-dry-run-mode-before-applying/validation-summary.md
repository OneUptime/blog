# Validation Summary: Configure Artifact Registry Cleanup Policies with Dry Run Mode Before Applying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Artifact Registry cleanup policies
- Google Cloud CLI (`gcloud`)
- Cloud Audit Logs / Cloud Logging
- Cloud Monitoring alerting policies
- Terraform Google provider

## Sources Consulted
- Google Cloud Artifact Registry cleanup policies: https://docs.cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Cloud SDK `gcloud artifacts repositories set-cleanup-policies`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/set-cleanup-policies
- Google Cloud SDK `gcloud artifacts repositories create`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Cloud SDK `gcloud artifacts repositories update`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- Google Cloud Artifact Registry repository creation with Terraform: https://docs.cloud.google.com/artifact-registry/docs/repositories/create-repos
- Terraform Google provider `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Google Cloud SDK `gcloud artifacts docker images list`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- Google Cloud SDK `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The post used unsupported `gcloud artifacts repositories create/update --cleanup-policy-dry-run` and `--no-cleanup-policy-dry-run` flags. Updated the workflow to use `gcloud artifacts repositories set-cleanup-policies` with `--dry-run` and `--no-dry-run`, which is the documented CLI path.
- The cleanup policy JSON used `id` fields. Updated JSON policy examples to use `name`, matching the documented Artifact Registry policy file format.
- The cleanup policy JSON used `tagState: "UNTAGGED"` and omitted `tagState` on policies using `tagPrefixes`. Updated JSON examples to use lowercase `tagged` / `untagged` values and added `tagState: "tagged"` where tag prefixes are used.
- The dry-run audit log query filtered on `protoPayload.metadata.dryRun=true`. Updated it to filter on `protoPayload.request.validateOnly=true` and the repository `protoPayload.request.parent`, matching the documented audit log shape.
- The console review instructions pointed to the Artifact Registry cleanup policy section for dry-run results. Updated them to use Logs Explorer and the audit log fields.
- The live deletion audit log query also used the incorrect dry-run metadata field. Updated it to use `NOT protoPayload.request.validateOnly=true`.
- The Terraform example used tag prefixes without `tag_state`. Added `tag_state = "TAGGED"` to Terraform cleanup policies that use `tag_prefixes`.
- The Cloud Monitoring alert command lacked a condition filter and threshold. Added the required condition flags and clarified that it assumes a log-based metric has already been created for deletion audit logs.

## Review Notes
The Google Cloud CLI was not installed in the local workspace, so CLI verification was performed against official Google Cloud SDK reference documentation instead of local `gcloud --help` output. Artifact Registry cleanup jobs run periodically and Google documents that changes take effect within approximately one day; the post's daily-cycle guidance is consistent with that behavior.
