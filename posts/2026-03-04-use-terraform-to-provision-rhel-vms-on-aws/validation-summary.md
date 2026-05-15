# Validation Summary: How to Use Terraform to Provision RHEL VMs on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS EC2
- AWS security groups
- Red Hat Enterprise Linux AMIs on AWS

## Sources Consulted
- HashiCorp Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform init command: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform plan command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform destroy command: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_vpc_security_group_egress_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Red Hat documentation for RHEL AMIs on AWS and Red Hat owner ID: https://access.redhat.com/solutions/15356
- Red Hat Cloud Access Reference Guide for AWS gold image owner ID and naming: https://docs.redhat.com/en-us/documentation/subscription_central/1-latest/pdf/red_hat_cloud_access_reference_guide/Subscription_Central-1-latest-Red_Hat_Cloud_Access_Reference_Guide-en-US.pdf
- AWS EC2 key pair documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html

## Issues Found
No technical issues found.

## Review Notes
The Terraform configuration uses current AWS provider resources for standalone security group ingress and egress rules. The AMI owner ID and `RHEL-9*` lookup pattern align with Red Hat guidance for listing RHEL 9 AMIs on AWS. The example assumes the AWS account has a default VPC/default subnet in `us-east-1` and that an EC2 key pair named `my-key-pair` already exists. Terraform was not installed in the local environment, so syntax was reviewed against official documentation rather than validated with `terraform validate`.
