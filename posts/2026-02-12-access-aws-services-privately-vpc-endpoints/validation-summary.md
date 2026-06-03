# Validation Summary: How to Access AWS Services Privately Using VPC Endpoints

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon VPC
- VPC endpoints
- AWS PrivateLink
- Gateway endpoints for Amazon S3 and DynamoDB
- Interface endpoints
- AWS CLI
- VPC Flow Logs
- Amazon ECS/Fargate
- AWS Lambda VPC networking
- AWS Systems Manager
- Amazon ECR
- CloudWatch Logs
- NAT Gateway cost comparison

## Sources Consulted
- AWS PrivateLink: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS PrivateLink: Access AWS services through AWS PrivateLink - https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- AWS CLI Command Reference: create-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI Command Reference: create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon ECR: Amazon ECR interface VPC endpoints - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- AWS Systems Manager: Improve the security of EC2 instances by using VPC endpoints - https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- AWS Lambda: Troubleshoot networking issues in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-networking.html
- AWS Lambda: Enable internet access for VPC-connected Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- Amazon VPC: NAT gateway pricing - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Amazon VPC Pricing - https://aws.amazon.com/vpc/pricing/

## Issues Found
- The opening description said every AWS service call from a VPC leaves the VPC and that a private EC2 call to S3 routes through NAT by default. Changed this to clarify that, without a VPC endpoint, calls use the configured egress path such as NAT, and fail if no egress path exists.
- The post said AWS offers two VPC endpoint types. Updated this to say these are the two endpoint types primarily used for private AWS service access, because current VPC endpoint features include additional endpoint types outside the post's scope.
- The interface endpoint description implied S3 and DynamoDB are gateway-only. Updated it to note that S3 and DynamoDB also have interface endpoint options, while gateway endpoints remain the free route-table option.
- The VPC Flow Logs example omitted the CloudWatch Logs delivery IAM role. Added `--deliver-logs-permission-arn` and noted that the log group and IAM role must exist first.
- The Fargate endpoint list called every endpoint "required" and described STS as required for IAM role assumption. Changed the list to "common endpoints" and scoped STS to tasks that call STS.
- The Lambda endpoint list implied a fixed required set. Changed the wording to say Lambda functions in a VPC need endpoints for the AWS services they call.
- The Systems Manager S3 comment was too narrow. Updated it to cover SSM Agent updates and S3-backed Systems Manager features.
- The interface endpoint creation command used `--private-dns-enabled true`, but AWS CLI documents this as a boolean switch. Changed it to `--private-dns-enabled`.
- The private VPC script and explanation claimed "full AWS service access." Changed this to say the VPC can reach the listed AWS services and that unsupported or unconfigured services still need another egress path.
- The cost section treated interface endpoint pricing and break-even math as universal and complete. Updated it to describe the monthly amount as common in many US regions, mention data processing charges, and clarify that real calculations must include NAT hourly charges, endpoint data processing charges, and cross-AZ transfer.
- The conclusion said gateway endpoints should always be created and that zero-internet VPCs can have full AWS service access. Reworded this to "usually worth creating when workloads use those services" and "supported AWS services."

## Review Notes
The AWS CLI is not installed in the local environment, so CLI command verification was performed against the official AWS CLI command reference rather than local `--help` output. The internal OneUptime links are plausible post URLs but were not changed.
