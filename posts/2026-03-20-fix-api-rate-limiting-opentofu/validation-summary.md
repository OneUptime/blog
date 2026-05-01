# Validation Summary: How to Fix API Rate Limiting Issues in OpenTofu

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu HCL
- AWS provider for OpenTofu/Terraform
- AWS retry behavior
- Google Cloud CLI and service quotas
- HashiCorp Time provider (`time_sleep`)

## Sources Consulted
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu environment variables docs: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `plan` docs, including resource targeting guidance: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu resource graph internals: https://opentofu.org/docs/v1.6/internals/graph/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `floor` function docs: https://opentofu.org/docs/language/functions/floor/
- Terraform Registry AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS retry behavior reference: https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
- Google Cloud Compute Engine rate quotas: https://docs.cloud.google.com/compute/api-quota
- Google Cloud Compute Engine concurrent operation quotas: https://docs.cloud.google.com/compute/operations-quota
- `gcloud alpha services quota list` reference: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/list

## Issues Found
- The post presented `tofu apply -target=...` as a normal way to split large applies. I updated the wording to match OpenTofu's guidance: prefer separate smaller configurations, and treat `-target` as a temporary workaround rather than the default workflow.
- The AWS retry example used `retry_mode = "adaptive"` without the caveat that AWS documents `adaptive` as a specialized mode. I changed the example to `retry_mode = "standard"` with `max_retries = 10`, which is supported by the AWS provider and better matches AWS's general guidance.
- The GCP quota command used `gcloud compute project-info describe`, which is not the current documented path for inspecting the relevant service quota usage and limits for API throttling. I replaced it with `gcloud alpha services quota list --service=compute.googleapis.com --consumer=projects/...`, which matches the current Google Cloud documentation for viewing these quotas.
- The batching example divided `instance_count` by `2` for both resource blocks, which drops one instance when the count is odd. I added `locals` using `floor()` and subtraction so the two batches always add up to the requested total.

## Review Notes
- The `-parallelism` guidance is technically correct and matches OpenTofu's documented default of `10`, though OpenTofu describes this as an advanced tuning option.
- The `time_sleep` examples are syntactically valid, but they are best treated as workarounds for rate-sensitive or eventually consistent APIs rather than a first-choice design.
- Some Google Cloud quotas and limits are not adjustable, so quota increases depend on the specific metric involved.
