# Validation Summary: Private Link Endpoints with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC endpoints
- Amazon S3 gateway endpoints
- AWS Secrets Manager
- AWS Systems Manager
- Amazon ECR
- Amazon CloudWatch Logs
- OpenTofu
- HCL

## Sources Consulted
- AWS PrivateLink FAQs: https://aws.amazon.com/privatelink/faqs/
- AWS PrivateLink concepts: https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html
- Access AWS services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- Gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Gateway endpoints for Amazon S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Using an AWS Secrets Manager VPC endpoint: https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html
- Improve the security of EC2 instances by using VPC endpoints for Systems Manager: https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- Amazon ECR interface VPC endpoints (AWS PrivateLink): https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html

## Issues Found
- The description and introductory explanation treated gateway endpoints as AWS PrivateLink endpoints. I corrected this to distinguish PrivateLink-powered interface endpoints from gateway endpoints, because AWS documents that gateway endpoints are VPC endpoints but are not powered by AWS PrivateLink.
- The post stated that VPC endpoints come in two types. I changed that wording to say the guide uses two endpoint types, because AWS currently documents additional VPC endpoint types beyond interface and gateway endpoints.
- The S3 connectivity test used `https://s3.amazonaws.com`. I changed it to the regional endpoint `https://s3.us-east-1.amazonaws.com` because AWS gateway endpoint routing is region-specific and AWS documentation describes regional S3 endpoints for gateway endpoint behavior.
- The DNS verification note said the interface endpoint should resolve to a `10.x.x.x` address. I corrected this to a private RFC 1918 address from the VPC subnets, because interface endpoint ENIs use private IPs from the selected subnet CIDR ranges and those are not limited to `10.0.0.0/8`.
- The ECR best-practice note implied ECR interface endpoints alone are enough for private image pulls. I corrected it to include the S3 gateway endpoint as well, because AWS documents that ECR image layers are stored in S3 and private pulls require S3 connectivity.
- The high-availability best-practice note said to place endpoints in each AZ. I narrowed this to interface endpoints, because interface endpoints are created in subnets per Availability Zone, while gateway endpoints are associated with route tables rather than deployed per AZ.

## Review Notes
- The OpenTofu HCL examples use valid `aws_vpc_endpoint` arguments for the AWS provider and are consistent with current AWS endpoint service names shown in the AWS service documentation.
- The Systems Manager endpoint list includes `ec2messages`, which AWS still documents, but AWS also notes that newer SSM Agent versions prefer `ssmmessages` when available.
- Amazon S3 and DynamoDB now support both gateway and interface endpoint options. This post focuses on the gateway-endpoint pattern for S3, which remains valid for the examples shown.
