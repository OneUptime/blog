# Validation Summary: How to Handle Terraform with Private Network Access Only

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform provider installation mirrors
- Terraform S3 backend
- Terraform modules
- AWS VPC endpoints
- AWS PrivateLink
- Amazon S3
- Amazon DynamoDB
- AWS STS
- GitHub Actions self-hosted runners

## Sources Consulted
- Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `providers mirror` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform module source documentation: https://developer.hashicorp.com/terraform/language/modules/sources
- AWS provider `aws_vpc_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS Gateway VPC endpoints documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS interface VPC endpoint documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html
- AWS STS VPC endpoint documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sts_vpc_endpoint_create.html

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform currently documents DynamoDB-based S3 backend locking as deprecated and recommends S3 lock files with `use_lockfile = true`, so the backend example was updated.
- The VPC endpoint section described both S3 and DynamoDB gateway endpoints as needed for state. With S3 lock files, DynamoDB is no longer required for Terraform state locking, so the wording was changed to make DynamoDB conditional on configurations that actually use it.
- The provider mirror example did not show that `terraform providers mirror` should be run from a Terraform configuration directory. The command mirrors providers required by the current configuration, so a `cd /path/to/your/terraform/configuration` step was added.
- The Terraform CLI config example used `~/.terraformrc`, while the CI pipeline set `TF_CLI_CONFIG_FILE` to `/opt/terraform/terraform.rc`. Terraform documentation says files referenced by `TF_CLI_CONFIG_FILE` should follow the `*.tfrc` naming pattern, so both examples now use `/opt/terraform/terraform.tfrc`.

## Review Notes
- The VPC endpoint examples are syntactically consistent with the current AWS provider `aws_vpc_endpoint` resource. The exact endpoint list must still be tailored to the AWS services, regions, partitions, and provider features a real Terraform configuration uses.
- STS private access requires clients to use the matching regional STS endpoint. Modern AWS SDK and CLI behavior generally favors regional endpoints, but older tooling may need explicit regional endpoint configuration.
