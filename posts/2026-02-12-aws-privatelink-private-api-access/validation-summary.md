# Validation Summary: How to Implement AWS PrivateLink for Private API Access

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC interface endpoints
- Amazon S3 interface endpoints
- VPC endpoint services
- Network Load Balancer
- AWS CLI
- Terraform AWS Provider
- Security groups

## Sources Consulted
- AWS PrivateLink guide: Create a service powered by AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- AWS PrivateLink guide: Access AWS services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- Amazon S3 User Guide: AWS PrivateLink for Amazon S3: https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html
- AWS PrivateLink guide: Manage DNS names for VPC endpoint services: https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html
- AWS CLI Command Reference: create-vpc-endpoint: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI Command Reference: create-vpc-endpoint-service-configuration: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint-service-configuration.html
- AWS CLI Command Reference: modify-vpc-endpoint-service-permissions: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-endpoint-service-permissions.html
- AWS CLI Command Reference: accept-vpc-endpoint-connections: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-endpoint-connections.html
- AWS CLI Command Reference: ELBv2 create-load-balancer and create-target-group: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-load-balancer.html and https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- Terraform AWS Provider docs: aws_vpc_endpoint_service and aws_vpc_endpoint: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint_service and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- OneUptime linked related post: https://oneuptime.com/blog/post/2026-02-12-vpc-endpoint-policies-s3-dynamodb/view

## Issues Found
- The opening paragraph implied that all VPC A to VPC B API calls use the internet by default. That is only true when the target API is publicly exposed. Updated the wording to say "publicly exposed API" so it does not misrepresent private VPC-to-VPC connectivity.
- The S3 interface endpoint command enabled private DNS without accounting for S3's `PrivateDnsOnlyForInboundResolverEndpoint` default. AWS documents that this option defaults to `true` and requires an S3 gateway endpoint when used. Added `--dns-options PrivateDnsOnlyForInboundResolverEndpoint=false` and clarified the behavior so the command works for a VPC without an S3 gateway endpoint.
- The custom endpoint service used `api.myservice.internal` as a private DNS name. AWS requires endpoint service private DNS names to pass domain ownership verification through a public hostname or public DNS provider, so a generic `.internal` name is not a reliable working example. Changed it to `api.myservice.com` and added a note that domain ownership must be verified.
- The consumer-side AWS CLI command did not enable private DNS, but the verification step used the custom service DNS name. Added `--private-dns-enabled` to the consumer endpoint command and updated the curl example to use the corrected DNS name.

## Review Notes
The AWS CLI syntax and Terraform resource attributes used in the post are current based on the official references checked. Pricing values are region-dependent, but the stated PrivateLink and NAT gateway data processing examples are plausible for common US Regions; readers should still verify current regional pricing before making cost decisions.
