# Validation Summary: How to Use the -parallelism Flag in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI: `tofu plan`, `tofu apply`, `tofu destroy`)
- Terraform-compatible CLI environment variables (`TF_CLI_ARGS_*`, `TF_LOG`)
- HCL configuration syntax (resource blocks, dependency references)
- AWS provider resources (S3, EC2, IAM)
- GitHub provider rate limits

## Sources Consulted
- OpenTofu CLI plan command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI apply command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu environment variables: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu CLI config file: https://opentofu.org/docs/cli/config/config-file/
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- AWS S3 request rates: https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html

## Issues Found
- **GitHub API rate limit was incorrect.** The post stated "GitHub API: 1,000 requests/hour (unauthenticated: 60/hour)". Per GitHub's official documentation, the authenticated REST API rate limit for personal access tokens is **5,000 requests per hour**, not 1,000. Updated the figure to 5,000 requests/hour. The unauthenticated 60/hour value was correct and left unchanged.

## Review Notes
- The `-parallelism=n` flag, default value of 10, and applicability to `plan`, `apply`, and `destroy` are all confirmed correct against OpenTofu official documentation.
- `TF_CLI_ARGS_plan` and `TF_CLI_ARGS_apply` environment variables are documented and behave as described in OpenTofu (inherited Terraform-compatible behavior).
- The note that parallelism cannot be set in `~/.tofurc` is correct — the CLI config file supports `credentials`, `provider_installation`, `plugin_cache_dir`, etc., but not parallelism.
- The S3 rate limits (3,500 PUT/sec, 5,500 GET/sec) are technically **per partitioned S3 prefix**, not per bucket. The post does not state this explicitly. Left as-is since the figures are correct as written and the qualifier would be a stylistic addition rather than a correction.
- The EC2 (~100 calls/sec) and IAM (~1,000 calls/sec) figures are order-of-magnitude approximations; AWS uses token-bucket throttling that varies per-API. Acceptable as rough guidance in the context of the post.
- HCL examples use `{ ... }` placeholders, which is appropriate for illustrative snippets in a practical guide.
