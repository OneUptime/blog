# Validation Summary: How to Set Up VPC Endpoint Policies for S3 and DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC endpoints
- Amazon S3
- Amazon DynamoDB
- AWS PrivateLink
- AWS IAM and resource policies
- AWS CLI
- Terraform AWS provider
- AWS CloudTrail
- Amazon ECR

## Sources Consulted
- AWS PrivateLink Guide: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS PrivateLink Guide: Control access to VPC endpoints using endpoint policies - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- AWS CLI Command Reference: create-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI Command Reference: modify-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-endpoint.html
- Amazon DynamoDB Developer Guide: AWS PrivateLink for DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/privatelink-interface-endpoints.html
- Amazon ECR User Guide: Amazon ECR interface VPC endpoints - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon S3 User Guide: Controlling access from VPC endpoints with bucket policies - https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
- AWS CloudTrail User Guide: Logging data events - https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
- AWS CLI Command Reference: lookup-events - https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Amazon CloudWatch Logs User Guide: CloudWatch Logs Insights language query syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Terraform Registry: aws_vpc_endpoint resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- The "Restrict to Organization" S3 endpoint policy used `aws:PrincipalOrgID` while the surrounding text described restricting bucket/resource ownership to the organization. Changed it to `aws:ResourceOrgID` and updated the wording to clarify that the policy restricts resources in the organization.
- The gateway endpoint "Restrict by IAM Principal" example placed IAM role ARNs directly in `Principal`. AWS requires gateway endpoint policies to use `Principal: "*"` and restrict principals with a condition such as `aws:PrincipalArn`, so the example was corrected.
- The CloudTrail monitoring command used `lookup-events` for S3 `GetObject`. `lookup-events` searches recent management or Insights events, while `GetObject` is an S3 data event when logged. Replaced the command with guidance to enable CloudTrail data events and query delivered logs.
- The best practices section said endpoint policy changes take effect immediately. AWS documentation says updates can take a few minutes, so the wording was corrected.

## Review Notes
Gateway endpoint examples, AWS CLI flags, endpoint service names, ECR S3 layer bucket access, S3 `aws:sourceVpce` bucket policy usage, and Terraform `aws_vpc_endpoint` usage were consistent with current official documentation.
