# Validation Summary: How to Use -parallelism Flag for Faster Applies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform AWS Provider
- AWS IAM
- Amazon Route 53
- Amazon S3
- AWS CloudTrail
- AWS CLI
- Azure Resource Manager
- Google Cloud Platform

## Sources Consulted
- Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `destroy` command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform AWS Provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_eks_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- AWS CLI `cloudtrail lookup-events` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CloudTrail event lookup documentation: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- Amazon Route 53 quotas documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/DNSLimitations.html
- AWS IAM and STS quotas documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- Amazon S3 performance documentation: https://aws.amazon.com/documentation-overview/s3/

## Issues Found
- The Route 53 example recommended `-parallelism=50` and included unverified timing claims. Route 53 documents a low per-account API request quota, so this was changed to recommend cautious parallelism and removed the unsupported timing estimates.
- The IAM section claimed IAM has high rate limits and recommended `-parallelism=25`. This was softened to moderate parallelism with a note about IAM quotas, eventual consistency, throttling, and propagation-related errors.
- The tuning section described the sample loop as a binary search, but the script uses a fixed stepwise sequence. The text was changed to "stepwise benchmark approach."
- The environment variable section incorrectly said the shown variables were not built-in Terraform features. `TF_CLI_ARGS_apply`, `TF_CLI_ARGS_plan`, and `TF_CLI_ARGS_destroy` are built-in Terraform CLI environment variables, so the wording was corrected.
- The wrapper script appended `-parallelism` after all user arguments and included deprecated `terraform refresh`. The script now inserts the flag immediately after the subcommand and only handles `apply`, `plan`, and `destroy`.
- The CloudTrail lookup example filtered by `EventName=ThrottleEvent`, which is not a valid way to find throttling errors. It now retrieves recent events and filters the embedded CloudTrail event JSON for throttling-style `errorCode` values with `jq`.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. Provider resource snippets and timeout defaults were checked against the current Terraform AWS Provider documentation. The cloud-provider parallelism starting points remain heuristic guidance; real limits vary by account, region, service quota, provider retry behavior, and dependency graph shape.
