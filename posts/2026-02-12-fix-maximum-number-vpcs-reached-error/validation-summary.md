# Validation Summary: How to Fix 'The maximum number of VPCs has been reached' Error

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS VPC
- AWS EC2 networking resources
- AWS Service Quotas
- AWS CLI
- AWS CloudFormation
- AWS Organizations

## Sources Consulted
- Amazon VPC quotas: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- Delete your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/delete-vpc.html
- AWS CLI Service Quotas command reference: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/
- AWS CLI Service Quotas examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_service-quotas_code_examples.html
- AWS CLI describe-stack-resources command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-resources.html
- AWS CLI create-default-vpc command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-default-vpc.html
- AWS CLI describe-vpc-endpoints command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html
- AWS CLI EC2 wait command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/
- AWS CLI describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html

## Issues Found
- The instance-count query used `length(Reservations[*].Instances[*])`, which can count reservation arrays rather than flattening and counting all instances. Changed it to `length(Reservations[].Instances[])`.
- The VPC deletion script deleted VPC endpoints after subnets and security groups. Interface VPC endpoints can create network interfaces and block subnet deletion, so the endpoint deletion step was moved before subnet deletion.
- NAT gateway deletion is asynchronous. Added `aws ec2 wait nat-gateway-deleted` after requesting NAT gateway deletion so later subnet deletion is less likely to fail.
- The quota-request status command was labeled as listing only pending requests, but the command lists quota request history for the quota. Updated the comment to match the command.
- The default VPC warning claimed some AWS services require the default VPC. Reworded it to focus on launch workflows and console wizards that may assume a default VPC exists.
- The VPC peering check only looked at requester-side peering connections. Updated the query to match peering connections where the VPC is either requester or accepter.
- The CloudFormation lookup omitted the required `--stack-name` or `--physical-resource-id` argument. Added `--physical-resource-id "$VPC_ID"` and kept the query scoped to VPC resources.

## Review Notes
AWS CLI is not installed in this workspace, so command validation was performed against the current official AWS CLI documentation rather than local `aws --help` output.
