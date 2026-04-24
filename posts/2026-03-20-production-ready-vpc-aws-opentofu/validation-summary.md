# Validation Summary: How to Build a Production-Ready VPC on AWS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- `terraform-aws-modules/vpc/aws`
- AWS NAT Gateway
- VPC Flow Logs
- AWS PrivateLink / VPC Endpoints
- AWS Network ACLs
- Amazon EKS subnet tagging

## Sources Consulted
- OpenTofu module source documentation: https://opentofu.org/docs/v1.9/language/modules/sources/
- `terraform-aws-modules/vpc/aws` v5.0.0 README: https://raw.githubusercontent.com/terraform-aws-modules/terraform-aws-vpc/v5.0.0/README.md
- `terraform-aws-modules/vpc/aws` v5.0.0 variables: https://raw.githubusercontent.com/terraform-aws-modules/terraform-aws-vpc/v5.0.0/variables.tf
- `terraform-aws-modules/vpc/aws` v5.0.0 outputs: https://raw.githubusercontent.com/terraform-aws-modules/terraform-aws-vpc/v5.0.0/outputs.tf
- Terraform AWS provider `aws_vpc_endpoint` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_endpoint.html.markdown
- Terraform AWS provider `aws_network_acl` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/network_acl.html.markdown
- AWS VPC interface endpoint documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/interface-endpoints.html
- AWS S3 gateway endpoint documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Amazon ECR interface VPC endpoint documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- AWS VPC network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC network ACL rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html
- Amazon EKS VPC and subnet networking requirements: https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html

## Issues Found
- The VPC endpoint examples referenced `var.region`, but no `region` variable was defined anywhere in the post. I replaced those references with `data.aws_region.current.name` so the endpoint service names derive from the active AWS provider region.
- The interface endpoint examples referenced `aws_security_group.vpc_endpoints`, but that security group resource was missing. I added the security group and allowed HTTPS from the private subnet CIDR blocks so the interface endpoints are usable as written.
- The EKS subnet role tag values were written as numeric literals, but the module input type for `public_subnet_tags` and `private_subnet_tags` is `map(string)`. I changed the values to `"1"` so the example matches the module schema and AWS tagging guidance.
- The database network ACL comments said the rules allowed access from private subnets only, but the actual CIDR used was `10.0.0.0/8`, which is much broader than the example VPC. I narrowed those CIDRs to `var.vpc_cidr` and updated the comments so the code and explanation are aligned.

## Review Notes
- The post pins `terraform-aws-modules/vpc/aws` to `~> 5.0`, which keeps the in-module flow log configuration shown here valid. Current module documentation notes that root-module flow log support is deprecated in v6.x and is planned for removal in v7, so a future major-version update would need a flow-log-specific refactor.
- `tofu` and `terraform` were not installed in this review environment, so validation was completed against official documentation rather than by running `validate` locally.
