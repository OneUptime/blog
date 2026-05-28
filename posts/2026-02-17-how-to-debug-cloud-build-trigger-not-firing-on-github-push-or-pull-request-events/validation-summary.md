# Validation Summary: Debug Cloud Build Trigger Not Firing on GitHub Push or Pull Request Events

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Build
- Google Cloud CLI
- GitHub Apps
- GitHub webhooks
- Cloud Logging and Cloud Audit Logs
- CI/CD triggers

## Sources Consulted
- Google Cloud Build: Create and manage build triggers: https://docs.cloud.google.com/build/docs/automating-builds/create-manage-triggers
- Google Cloud Build: Connect to a GitHub repository: https://docs.cloud.google.com/build/docs/automating-builds/github/connect-repo-github
- Google Cloud SDK: `gcloud builds triggers update github`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/update/github
- Google Cloud SDK: `gcloud builds triggers run`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/triggers/run
- Google Cloud SDK: `gcloud builds repositories list`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/repositories/list
- Google Cloud SDK: `gcloud builds connections list`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/connections/list
- Google Cloud Build REST API: BuildTrigger resource and GitHub event filters: https://docs.cloud.google.com/build/docs/api/reference/rest/v1/projects.locations.triggers
- Google Cloud Build Audit logging: https://docs.cloud.google.com/build/docs/securing-builds/audit-logs
- GitHub Docs: Viewing webhook deliveries: https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/viewing-webhook-deliveries

## Issues Found
- The branch update command used `gcloud builds triggers update TRIGGER_NAME`, but the current CLI uses trigger-type-specific update commands such as `gcloud builds triggers update github TRIGGER_NAME`. Updated the command and included a region flag.
- The file-filter removal command used unsupported `--clear-included-files` and `--clear-ignored-files` flags. Replaced it with the documented export/edit/import workflow.
- The post implied Cloud Build GitHub App triggers can always be debugged from repository-level webhook deliveries. GitHub App webhook deliveries are separate from repository webhooks, so the section now directs readers to verify the installed GitHub App and only use repository webhook deliveries for custom webhook triggers.
- The manual trigger test overstated what a successful manual run proves. Updated it to say the build configuration, service account, and source access are working, while event filters still need checking.
- The audit log section claimed Cloud Build logs trigger evaluations and used a questionable `resource.type="build_trigger"` filter. Updated it to search for official `CreateBuild` audit log entries and clarified that skipped trigger evaluations are not fully explained there.
- The summary diagram still referenced webhook delivery checks, so it was updated to match the GitHub App access and build creation audit-log workflow.

## Review Notes
The guide is technically relevant and useful. Users may still need to add `--region` to other trigger commands depending on whether their triggers are regional and whether `builds/region` is configured in the Google Cloud CLI.
