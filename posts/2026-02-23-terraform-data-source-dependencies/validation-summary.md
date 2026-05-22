# Validation Summary: How to Handle Data Source Dependencies in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- Terraform data sources
- Terraform dependency graph and `depends_on`
- HashiCorp AWS provider
- AWS EC2, VPC, subnet, security group, load balancer, AMI, and KMS alias resources/data sources

## Sources Consulted
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform meta-arguments documentation: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform resource dependencies tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/dependencies
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_security_groups` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups
- AWS provider `aws_kms_alias` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/kms_alias
- AWS CLI `describe-subnets` filter documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html

## Issues Found
- The implicit dependency example created a VPC, then queried private subnets in that VPC, but did not create any subnets. A newly created `aws_vpc` does not create private subnets, so the subsequent `aws_lb` example would not work as described. I added two managed subnets and changed the `aws_subnets` data source to reference their IDs through a valid `filter` block, preserving the dependency lesson while making the example coherent.
- The post stated that `depends_on` on a data source always forces the read to the apply phase. Current Terraform documentation is more nuanced: Terraform may defer the read when dependencies have pending actions or values are not known during planning. I updated the explanation and best-practice bullet to avoid overgeneralizing.

## Review Notes
The examples are illustrative and omit provider configuration and some production details such as region selection, subnet routing, and security group assignment for load balancers. Those omissions are acceptable for the scope of this dependency-focused guide.
