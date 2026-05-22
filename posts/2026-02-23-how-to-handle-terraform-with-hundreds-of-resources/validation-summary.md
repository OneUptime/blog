# Validation Summary: How to Handle Terraform with Hundreds of Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform S3 backend
- Terraform `terraform_remote_state` data source
- Terraform `for_each` meta-argument
- Terraform import blocks
- AWS provider `aws_route53_record`
- Bash, grep, awk, jq

## Sources Consulted
- HashiCorp Terraform CLI `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI `state` command documentation: https://docs.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform CLI `state mv` command documentation: https://docs.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- HashiCorp Help Center import block basics: https://support.hashicorp.com/hc/en-us/articles/19066086090771-How-to-Import-Block-Basics
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The commands for counting "unique resource types" and grouping resources by type only stripped instance indexes, so they counted resource addresses or blocks rather than resource types. Updated the commands to remove address indexes and extract the resource type field with `awk`.
- The `-target` example was technically valid, but the surrounding text implied it was a normal planning shortcut. Added a warning that Terraform recommends targeting only for exceptional situations because it can hide unrelated changes outside the targeted dependency graph.
- The state-splitting script used `terraform state mv -state-out=terraform/networking/terraform.tfstate` as if it could directly move resources from a configured backend into a separate S3 backend state path. Current Terraform documentation describes `-state` and `-state-out` as legacy local-state options. Updated the example to pull the source and destination states to local files, move resources between those local state files, then push the reviewed states back to their configured backends.
- The networking-resource grep pattern used `aws_nat`, which is not the AWS provider NAT gateway resource type. Updated it to match `aws_nat_gateway` and related common networking resources.
- The post said Terraform processes all `for_each` resources in parallel. Updated this to say Terraform can process `for_each` instances in parallel when the dependency graph allows it, which matches Terraform's graph-based parallelism behavior.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was checked against current official HashiCorp documentation rather than local `terraform --help` output.
- The performance benchmark table is reasonable as illustrative guidance, but actual times can vary substantially by provider, resource type, API throttling, backend latency, and refresh behavior.
