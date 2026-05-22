# Validation Summary: How to Monitor Run Status and History in HCP Terraform

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- HCP Terraform / Terraform Cloud
- HCP Terraform API
- Terraform Enterprise / HCP Terraform Provider (`hashicorp/tfe`)
- Terraform HCL
- Bash, `curl`, and `jq`
- Python `requests`
- Prometheus Python client
- Slack, email, and generic webhook notifications

## Sources Consulted
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform Plans API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/plans
- HCP Terraform Applies API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/applies
- HCP Terraform run states and stages: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/states
- HCP Terraform notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations
- `hashicorp/tfe` provider `tfe_notification_configuration` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration

## Issues Found
- The run state table was missing several current documented states, including VCS fetching, pre-plan, queueing, cost-estimated, policy-checked, post-plan, and saved-plan states. Added the missing states and corrected the meaning of `planned`.
- The current-run API example used an undocumented `/workspaces/:id/current-run` endpoint. Replaced it with the documented workspace `current-run` relationship followed by `GET /runs/:run_id`.
- The run API examples attempted to read resource addition/change/destruction counts from run objects. The documented run attributes include `has-changes`, while detailed resource counts are exposed on plan/apply resources. Removed those fields from run-object examples.
- The "Get Plan and Apply Logs" example only downloaded plan logs. Added documented apply log retrieval through the run's `relationships.apply` and `GET /applies/:id`.
- The `curl` examples used unescaped query parameter brackets such as `page[size]`, which can fail because `curl` treats brackets as URL globbing syntax. Changed shell URLs to percent-encoded query keys.
- The webhook payload example omitted documented `run_updated_at` and `run_updated_by` fields inside notification entries. Added them to the sample payload.
- The metrics collection shell script read `current-run` as a workspace attribute, but the API exposes it as a relationship and optional included resource. Updated the script to request `include=current_run`, paginate workspaces, and extract the included run status correctly.
- The stale-workspace script claimed to find workspaces without recent successful runs but only compared workspace `updated-at`. Updated it to query the latest `applied` run per workspace using the documented run status filter.
- The Prometheus exporter declared a latest-run error metric but never set it, and it only processed the first page of workspaces. Updated it to paginate workspaces and populate the error gauge from each workspace's latest run.
- Removed unused Python datetime imports from the monitoring script.
- Updated the Slack trigger comment for `run:errored` to reflect that the trigger covers errors and cancellations.

## Review Notes
The examples are technically aligned with the current HCP Terraform API and `tfe_notification_configuration` provider documentation. For production use, the Python scripts should add HTTP error handling, rate-limit handling, and request timeouts.
