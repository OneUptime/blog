# Validation Summary: How to Import AWS VPCs into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- AWS CLI
- HashiCorp AWS provider
- HCL

## Sources Consulted
- OpenTofu import CLI documentation: https://opentofu.org/docs/cli/import/
- OpenTofu import language documentation: https://opentofu.org/docs/language/import/
- OpenTofu upgrade guides (`v1.6` is the first stable OpenTofu v1.x release): https://opentofu.org/docs/language/upgrade-guides/
- AWS CLI `describe-vpcs` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI `describe-route-tables` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI `describe-internet-gateways` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-internet-gateways.html
- AWS VPC guide for CLI-based VPC inventory examples: https://docs.aws.amazon.com/vpc/latest/userguide/getting-started-with-amazon-vpc-using-the-aws-cli.html
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_route_table_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- AWS provider `aws_default_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_vpc

## Issues Found
- The post implied that `tofu plan` completes the import. Official OpenTofu docs state that import blocks are processed during planning, but the actual import happens during `tofu apply`. I updated Step 4 to use `tofu plan`, then `tofu apply`, then a final `tofu plan` for verification.
- The import block comment said `OpenTofu 1.5+`. OpenTofu’s stable v1 series starts at `1.6`, so I corrected the version note to `OpenTofu 1.6+`.
- The route table inventory command only displayed `Associations[0].SubnetId`, which can hide routes, main associations, gateway associations, and additional subnet associations. I changed it to output route tables with both `Routes` and `Associations` in JSON.
- The description and introduction overstated the post as a complete VPC import walkthrough, while the examples only covered a core subset of VPC resources. I narrowed that wording so the scope matches the actual examples.

## Review Notes
- The `aws_default_vpc` example is technically valid, but this resource adopts the region’s existing default VPC into management rather than creating a new VPC.
- OpenTofu’s current import documentation marks parts of the configuration-driven import workflow as experimental, especially around generated configuration. This post’s manual-HCL workflow remains valid.
