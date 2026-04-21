# Validation Summary: How to Stream Logs from Cloud Backend in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- OpenTofu cloud backend CLI integration
- HCP Terraform / Terraform Cloud API
- HCP Terraform runs, plans, applies, and notification configurations
- GitHub Actions
- Splunk HTTP Event Collector
- Bash, curl, and jq

## Sources Consulted
- OpenTofu cloud backend CLI overview: https://opentofu.org/docs/cli/cloud/
- OpenTofu cloud backend settings: https://opentofu.org/docs/cli/cloud/settings/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu debugging logs: https://opentofu.org/docs/internals/debugging/
- HCP Terraform API overview and authentication: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- HCP Terraform runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform plans API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/plans
- HCP Terraform applies API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/applies
- HCP Terraform notification configurations API: https://developer.hashicorp.com/terraform/enterprise/api-docs/notification-configurations
- HCP Terraform CLI-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- HCP Terraform variables and environment variables: https://developer.hashicorp.com/terraform/cloud-docs/variables
- GitHub Actions workflow commands: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions artifacts: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions workflow syntax and shell behavior: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Splunk HTTP Event Collector event format: https://docs.splunk.com/Documentation/Splunk/latest/Data/FormateventsforHTTPEventCollector

## Issues Found

1. **Incorrect HCP Terraform plan log endpoint.** The post used `GET /api/v2/plans/$PLAN_ID/log`, but the official Plans API exposes logs through the plan object's `data.attributes.log-read-url`. Updated the retrieval, polling, and Splunk examples to fetch `/plans/:id`, read `log-read-url`, and then `curl` that pre-authenticated URL. Also added equivalent apply log retrieval in the polling example through `/applies/:id`.

2. **Run list calls could miss speculative plans.** The HCP Terraform Runs API excludes `plan_only` runs from list results by default. Added an explicit `filter[operation]` list to the workspace and organization run queries so recent speculative `tofu plan` runs are included.

3. **API streaming claim was overstated.** The original "Streaming Logs via API" example only polled run status and then attempted to fetch logs from an invalid endpoint. Renamed the section to "Polling Logs via API" and updated the script to poll run status, then retrieve available plan/apply logs through the supported API fields.

4. **`TF_LOG` wording conflated local CLI logs with remote worker logs.** Local `TF_LOG` affects OpenTofu CLI debug output, while remote worker logging requires workspace environment variables in the cloud backend. Clarified the wording and separated local debug file logging from capturing streamed plan/apply output with `tee`.

5. **GitHub Actions apply step could mask failures.** The original pipeline used `tee` and wrote `${PIPESTATUS[0]}` to `$GITHUB_OUTPUT`, but did not exit with that status. Updated the step to capture the OpenTofu exit code and exit with it after writing the output value.

6. **Notification configuration JSON API type was incorrect.** The official API requires `data.type` to be `"notification-configuration"` in request payloads. Changed the payload from `"notification-configurations"` to the singular type.

7. **Webhook wording implied log forwarding without retrieval.** HCP Terraform notification configurations send run event notifications, not the full run logs. Renamed the section to "Run Event Webhook" and adjusted the conclusion to describe webhooks as event-driven triggers for log retrieval.

8. **Product naming was outdated in technical explanations.** Updated relevant references from Terraform Cloud to HCP Terraform while preserving Terraform Cloud where it appears as a tag or compatibility context.

## Review Notes
- The local environment does not have `tofu` or `terraform` installed, so CLI behavior was verified against official OpenTofu and HCP Terraform documentation rather than local `--help` output.
- HCP Terraform `log-read-url` values are pre-authenticated URLs and should be treated as secrets.
- The Splunk example forwards the plan log excerpt. Apply log forwarding can be added by fetching `relationships.apply` and `/applies/:id` in the same pattern shown in the polling example.
