# Validation Summary: How to Use Workspaces for Multi-Region Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform S3 backend and remote state
- Terraform AWS provider
- AWS VPC, subnets, VPC peering, and Auto Scaling
- AWS Route 53
- Amazon RDS read replicas
- AWS Systems Manager Parameter Store

## Sources Consulted
- Terraform CLI workspaces documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `terraform_remote_state` documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform AWS provider `aws_vpc_peering_connection` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- AWS VPC inter-region peering documentation: https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_route53_health_check` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_ssm_parameter` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Amazon EC2 AMI public parameter documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend now marks DynamoDB-based locking as deprecated, so the snippet was updated to `use_lockfile = true`.
- The region configuration used hard-coded AMI IDs that are region-specific and can become stale. The examples now use AWS's public Systems Manager Parameter Store path for the latest Amazon Linux 2023 AMI, and the launch template reads it through `data "aws_ssm_parameter"`.
- The `terraform_remote_state` data source was unconditionally declared, which could make the primary workspace try to read its own not-yet-created state during bootstrap. The data source is now created only for secondary regions, and references were updated to use the counted instance.
- The VPC peering example created only the requester side of an inter-region VPC peering connection. The snippet now sets `auto_accept = false` on the requester and adds an `aws_vpc_peering_connection_accepter` using a primary-region provider alias.
- The Route 53 latency record used an `A` alias with placeholder alias hosted zone data that would not be valid as written. It now uses a `CNAME` latency record with `ttl` and `records`, and includes a hosted zone data source.
- The primary RDS instance example omitted required arguments for a new DB instance. It now includes `allocated_storage`, `username`, and `manage_master_user_password = true`.
- RDS replica and VPC peering references were updated to match the counted `terraform_remote_state` data source.

## Review Notes
Terraform was not installed in the local environment, so CLI command validation was performed against official Terraform documentation rather than local `terraform --help` output. Some snippets still assume surrounding resources exist, such as security groups, load balancers, and hosted zones, which is reasonable for a focused blog post but would need complete definitions in a copy-paste runnable module.
