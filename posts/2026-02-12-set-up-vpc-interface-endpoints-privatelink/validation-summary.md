# Validation Summary: How to Set Up VPC Interface Endpoints (PrivateLink)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC interface endpoints
- VPC endpoint private DNS
- AWS CLI
- AWS CloudFormation
- VPC endpoint security groups and endpoint policies
- Amazon SQS, CloudWatch Logs, CloudWatch Monitoring, KMS, Secrets Manager, ECR, STS
- AWS NAT Gateway and PrivateLink pricing

## Sources Consulted
- AWS PrivateLink: Access an AWS service using an interface VPC endpoint: https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html
- AWS PrivateLink concepts: https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html
- AWS PrivateLink: Access AWS services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- AWS PrivateLink endpoint policies: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- AWS CLI create-vpc-endpoint command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CloudFormation AWS::EC2::VPCEndpoint resource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html
- Amazon ECR interface VPC endpoints: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- AWS Secrets Manager VPC endpoints and endpoint policies: https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html
- AWS PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- Amazon VPC NAT gateway pricing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS NAT Gateway regional availability announcement: https://aws.amazon.com/about-aws/whats-new/2025/11/aws-nat-gateway-regional-availability/
- Related OneUptime VPC endpoints post: https://oneuptime.com/blog/post/2026-02-12-access-aws-services-privately-vpc-endpoints/view
- Related OneUptime gateway endpoints post: https://oneuptime.com/blog/post/2026-02-12-set-up-vpc-gateway-endpoints-s3-dynamodb/view

## Issues Found
- The SQS endpoint creation example used placeholder subnet values `subnet-priv-1a subnet-priv-1b`, which are not valid AWS subnet ID placeholders for an AWS CLI command. Changed them to `$SUBNET_1 $SUBNET_2`, matching the variable-based examples used later in the post.
- The endpoint policy section said interface endpoints support policies without qualification. AWS documentation states that not all AWS services support endpoint policies. Updated the text to say interface endpoints for AWS services can support policies and that readers should check service documentation before relying on one.

## Review Notes
The remaining AWS CLI commands, CloudFormation `AWS::EC2::VPCEndpoint` properties, private DNS explanation, security group guidance, ECR endpoint requirements, and cost comparison are consistent with the official documentation reviewed. Pricing varies by Region and can change over time; the post's examples align with current us-east-1-style public pricing as of this review.
