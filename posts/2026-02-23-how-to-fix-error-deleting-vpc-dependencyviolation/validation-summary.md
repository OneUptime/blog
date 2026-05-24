# Validation Summary: How to Fix Error Deleting VPC DependencyViolation

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (AWS provider: `aws_vpc`, `aws_internet_gateway`, `aws_subnet`, `aws_nat_gateway`, `aws_eip`)
- AWS VPC and dependent resources (Subnets, IGWs, NAT Gateways, ENIs, Security Groups, Route Tables, VPC Endpoints, Load Balancers, RDS)
- AWS CLI (`ec2`, `elbv2`, `rds` subcommands)
- Bash scripting

## Sources Consulted
- AWS CLI EC2 reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- AWS CLI `describe-nat-gateways` (uses singular `--filter`): https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-nat-gateways.html
- AWS CLI `describe-network-interfaces`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI `describe-internet-gateways` (uses `attachment.vpc-id` filter): https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-internet-gateways.html
- AWS Lambda VPC ENI documentation: https://docs.aws.amazon.com/lambda/latest/dg/foundation-networking.html
- Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform `-target` flag: https://developer.hashicorp.com/terraform/cli/commands/destroy

## Issues Found
- **Lambda ENI filter (Fix 4)**: The original `Name=requester-id,Values=*lambda*` filter would not reliably match Lambda-managed ENIs because the `requester-id` field for Lambda ENIs is an AWS service account ID (numeric), not a string containing "lambda". Changed to `Name=description,Values=*Lambda*`, since Lambda-managed ENIs have descriptions starting with "AWS Lambda VPC ENI", making this a reliable filter.

## Review Notes
- The `--filter` (singular) usage for `describe-nat-gateways` is correct — this is one of the AWS CLI inconsistencies where most `describe-*` commands use `--filters` (plural), but `describe-nat-gateways` uses `--filter` (singular).
- The "up to 20 minutes" timing for Lambda ENI cleanup is a reasonable estimate; AWS has documented cleanup times of 20–40 minutes depending on whether Hyperplane ENIs are reused.
- The Terraform `aws_eip` resource is referenced in Fix 1 (`aws_eip.nat`) but not defined in the snippet. This is fine since the snippet is illustrative and focuses on the dependency relationships.
- The example error message format matches typical Terraform AWS provider output.
- All AWS CLI command syntax (subcommands, flags, JMESPath query strings) verified as correct.
- Default security group note is accurate — AWS does not allow deletion of the default SG, but it does not block VPC deletion (it is deleted automatically with the VPC).
