# Validation Summary: How to Reduce Data Transfer Costs Between VPCs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon VPC
- VPC Peering
- AWS Transit Gateway
- AWS PrivateLink and interface VPC endpoints
- AWS CLI
- Amazon EC2 Instance Metadata Service
- AWS Cost Explorer
- Python
- Flask
- Redis

## Sources Consulted
- AWS VPC Peering documentation: https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/
- AWS Transit Gateway pricing: https://aws.amazon.com/transit-gateway/pricing/
- AWS PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- AWS data transfer price reduction for PrivateLink and Transit Gateway: https://aws.amazon.com/about-aws/whats-new/2022/04/aws-data-transfer-price-reduction-privatelink-transit-gateway-client-vpn-services/
- AWS Availability Zone IDs documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/az-ids.html
- EC2 instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS CLI create-vpc-peering-connection reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI accept-vpc-peering-connection reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-vpc-peering-connection.html
- AWS CLI create-route reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI create-transit-gateway reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html
- AWS CLI create-transit-gateway-vpc-attachment reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-vpc-attachment.html
- AWS CLI create-vpc-endpoint-service-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint-service-configuration.html
- AWS CLI create-vpc-endpoint reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI authorize-security-group-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Cost Explorer get-cost-and-usage reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS Cost Explorer filtering documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html
- Python gzip documentation: https://docs.python.org/3/library/gzip.html
- Python json documentation: https://docs.python.org/3/library/json.html
- Flask API documentation: https://flask.palletsprojects.com/
- redis-py documentation: https://redis.readthedocs.io/
- Requests documentation: https://requests.readthedocs.io/

## Issues Found
- The pricing table stated that PrivateLink cross-region connectivity is not supported. AWS PrivateLink now supports cross-region interface endpoint service access for supported services, with PrivateLink processing and hourly charges plus standard inter-region data transfer. Updated the table and PrivateLink section.
- The instance metadata example used `placement/availability-zone` even though the surrounding guidance tells readers to use AZ IDs for cross-account physical AZ alignment. Updated the code to read `placement/availability-zone-id` and key endpoints by AZ ID.
- The cache example used `requests.get()` without importing `requests`. Added the missing import.
- The opening paragraph implied every VPC boundary crossing is charged, which conflicts with the post's correct same-AZ VPC peering guidance. Changed the wording to "usually pay" to account for the same-AZ peering exception.

## Review Notes
- AWS pricing varies by Region and can change over time. The dollar amounts in the post are representative for common US Region examples, but production cost modeling should use the current AWS pricing pages or AWS Pricing Calculator for the specific Regions and traffic direction.
- The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI command reference rather than local `aws --help` output.
