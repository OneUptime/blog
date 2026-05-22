# Validation Summary: How to Use Outputs with Preconditions in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform output values
- Terraform preconditions and custom conditions
- Terraform input variable validation
- Terraform AWS provider resources and data sources
- AWS EKS, EC2, RDS, S3, ACM, VPC, ELB, NAT Gateway, CloudWatch

## Sources Consulted
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform validation and custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform custom conditions tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/custom-conditions
- Terraform AWS provider `aws_lb` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb.html.markdown
- Terraform AWS provider `aws_vpc` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc.html.markdown
- Terraform AWS provider `aws_instance` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_eks_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_acm_certificate` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/acm_certificate.html.markdown
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_server_side_encryption_configuration.html.markdown
- Terraform AWS provider `aws_eks_node_group` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eks_node_group.html.markdown
- Terraform AWS provider `aws_lb_listener` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_listener.html.markdown

## Issues Found
- The S3 encryption example indexed `rule[0]`, but the AWS provider documents `rule` as a set. Changed the expression to use `one(...)` and access the single encryption rule safely.
- The VPC module output example checked `aws_vpc.main.state`, but the `aws_vpc` resource does not export a `state` attribute. Changed the example to validate the supported `enable_dns_support` attribute.
- The complete example checked `aws_lb.app.status`, but the `aws_lb` resource does not export a `status` attribute. Changed the example to validate the supported `load_balancer_type` argument.

## Review Notes
Terraform was not installed in the local environment, so local `terraform validate` could not be run. The review was completed against official Terraform language documentation and HashiCorp AWS provider documentation. Some examples assume resources use `count` or `for_each` where `length(...)` or `for` expressions are applied to resource collections.
