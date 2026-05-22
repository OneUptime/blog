# Validation Summary: How to Handle Terraform Resource Dependencies in Complex Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform dependency graph
- Terraform `depends_on` meta-argument
- Terraform modules and outputs
- Terraform remote state
- Terraform CLI `graph` command
- AWS provider resources for VPCs, subnets, IAM, Lambda, security groups, VPC endpoints, and S3
- Graphviz `dot`

## Sources Consulted
- Terraform `depends_on` meta-argument documentation: https://docs.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform resource dependencies tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/dependencies
- Terraform `graph` command documentation: https://developer.hashicorp.com/terraform/cli/commands/graph
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Lambda Python 3.11 runtime announcement: https://aws.amazon.com/about-aws/whats-new/2023/07/aws-lambda-python-3-11/

## Issues Found
- The introductory dependency chain said a security group depends on the database. In the Terraform/AWS examples discussed later, the database normally depends on the security group association, not the other way around. Reworded the sentence to keep the dependency direction accurate.
- The circular dependency fix used `aws_security_group_rule`. The AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` for new security group rules. Updated both rule resources to use `aws_vpc_security_group_ingress_rule`, `ip_protocol`, and `referenced_security_group_id`.
- The graph script described `terraform graph -type=plan` as a simplified resource-only view. Terraform's official documentation says the default `terraform graph` output is the simplified resource dependency graph, while `-type=plan` is a more detailed operation graph. Updated the comments to match the actual behavior.
- The destroy-time dependency example placed `depends_on = [aws_vpc_endpoint.s3]` on the S3 bucket while saying the endpoint should be destroyed before the bucket. Terraform destroys dependents before the resources they depend on, so that dependency direction was reversed. Moved the explicit dependency to the VPC endpoint so the endpoint depends on the bucket and is destroyed first.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official Terraform CLI documentation rather than local `terraform graph -help` output. The remote state guidance is technically correct, and the post appropriately notes that provider data sources or other explicit publication mechanisms are preferable to remote state where possible because remote state readers need access to the state snapshot.
