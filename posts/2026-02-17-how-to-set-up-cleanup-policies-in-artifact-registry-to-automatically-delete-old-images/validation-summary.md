# Validation Summary: Set Up Cleanup Policies in Artifact Registry to Automatically Delete Old Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Artifact Registry cleanup policies
- Google Cloud CLI
- Docker images and tags
- Terraform Google provider
- Cloud Logging and Cloud Audit Logs

## Sources Consulted
- Google Cloud Artifact Registry cleanup policy documentation: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Google Cloud Artifact Registry cleanup policy overview: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy-overview
- Google Cloud SDK reference for `gcloud artifacts repositories set-cleanup-policies`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/set-cleanup-policies
- Google Cloud SDK reference for `gcloud artifacts repositories list-cleanup-policies`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/list-cleanup-policies
- Google Cloud SDK reference for `gcloud artifacts repositories delete-cleanup-policies`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/delete-cleanup-policies
- Google Cloud Artifact Registry audit logging documentation: https://cloud.google.com/artifact-registry/docs/audit-logging
- Terraform Registry documentation for `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository

## Issues Found
- The JSON cleanup policy examples used `id`, but the Google Cloud cleanup policy JSON format uses `name`. Updated all JSON policy snippets to use `name`.
- JSON examples with `tagPrefixes` omitted `tagState`. Google Cloud documentation says `tagState` must be set to tagged when using tag prefixes. Added `tagState: "tagged"` to those examples.
- Some JSON examples used uppercase `UNTAGGED`; the documented JSON values are `tagged`, `untagged`, and `any`. Updated JSON snippets to use lowercase `untagged`.
- The keep-policy explanation said order matters because keep policies are evaluated first. Google Cloud documents that policies are applied in order unless a keep policy matches the same artifact as a delete policy. Updated the explanation to state keep-policy precedence only for matching artifacts.
- The command for viewing cleanup policies used `gcloud artifacts repositories describe`; the dedicated current command is `list-cleanup-policies`. Updated the command.
- The cleanup policy delete command used `--policy-names`; the documented flag is `--policynames`. Updated the command and clarified that it deletes selected policies, not all policies.
- The apply commands did not explicitly disable dry run. Added `--no-dry-run` to match the stated behavior of applying cleanup policies for deletion.
- The Terraform examples with `tag_prefixes` omitted `tag_state = "TAGGED"`. Added it to align with the documented cleanup policy behavior and Terraform enum values.
- The audit-log query used `DeleteVersion`, but cleanup policy deletions are documented as `BatchDeleteVersions` actions. Updated the query and added the requirement to enable Data Write audit logging for Artifact Registry.

## Review Notes
The corrected snippets use duration values in seconds, which Google Cloud accepts. The current documentation also supports human-readable durations such as `30d`, but changing the examples was not necessary for correctness.
