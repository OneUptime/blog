# Validation Summary: How to Set Up Slack Notifications from OpenTofu Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Slack Incoming Webhooks
- Slack message attachments
- GitHub Actions
- Bash
- HCL provider configuration

## Sources Consulted
- Slack Incoming Webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack legacy secondary message attachments documentation: https://docs.slack.dev/legacy/legacy-messaging/legacy-secondary-message-attachments/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu provider documentation: https://opentofu.org/docs/v1.11/language/providers/
- OpenTofu provider registry API for `pablovarela/slack`: https://registry.opentofu.org/v1/providers/pablovarela/slack/versions
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub `actions/checkout` README: https://github.com/actions/checkout
- GitHub `actions/upload-artifact` README: https://github.com/actions/upload-artifact
- GitHub `actions/download-artifact` README: https://github.com/actions/download-artifact
- `pablovarela/slack` provider documentation: https://github.com/pablovarela/terraform-provider-slack/blob/master/docs/index.md
- `slack_conversation` provider resource documentation: https://github.com/pablovarela/terraform-provider-slack/blob/master/docs/resources/conversation.md

## Issues Found
- The Slack attachment payload used mrkdwn-style message text but did not set `mrkdwn_in`, so Slack could render the attachment `text` as plain text. Added `mrkdwn_in: ["text"]`.
- The GitHub Actions snippet used an older OpenTofu setup action and did not disable the wrapper while manually reading command exit codes. Updated it to `opentofu/setup-opentofu@v2` with `tofu_wrapper: false`.
- The plan step attempted to capture `PIPESTATUS[0]` after a piped `tofu plan`, but GitHub Actions bash uses fail-fast behavior that can exit before the output is written on failure. Added `set +e`, stored the exit code in `$GITHUB_OUTPUT`, and exited with that code after capture.
- The apply job referenced `tfplan` from a separate job without transferring it. Added `actions/upload-artifact` and `actions/download-artifact` steps so the saved plan is available in the apply job.
- The apply job did not install OpenTofu or run `tofu init`, even though GitHub jobs run on separate runners. Added setup and init steps to the apply job.
- The saved-plan apply command used `-auto-approve`, which OpenTofu ignores when a saved plan file is passed because the plan file itself is treated as approval. Replaced it with `tofu apply -no-color tfplan`.
- The workflow invoked `./scripts/notify-slack.sh` without showing that the script was executable. Changed calls to `bash scripts/notify-slack.sh`.
- The provider section said Slack channels and webhooks could be managed and commented that it required `puppetlabs/slack`, but the configured provider was `pablovarela/slack` and the shown resource manages channels. Updated the wording and provider comment.

## Review Notes
- Slack message attachments are still supported, but Slack classifies them as legacy and recommends Block Kit layout blocks for new richer message layouts. This example keeps attachments because it uses Slack's attachment color field for status coloring.
- OpenTofu saved plan files can contain sensitive values. The artifact example uses one-day retention, but production workflows should also restrict artifact access and avoid uploading plan files from untrusted pull requests.
- Real Slack delivery and OpenTofu infrastructure changes were not executed because they require workspace-specific secrets and infrastructure credentials; the examples were validated against official documentation and primary provider docs.
