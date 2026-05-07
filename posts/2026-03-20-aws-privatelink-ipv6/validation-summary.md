# Validation Summary: How to Configure AWS PrivateLink IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC endpoint services
- Interface VPC endpoints
- Network Load Balancer
- IPv6 and dual-stack networking
- AWS CLI
- Terraform (HashiCorp AWS provider)

## Sources Consulted
- AWS PrivateLink: Share your services: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
- AWS PrivateLink: Create a service powered by AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- AWS PrivateLink: Access AWS services through AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- AWS PrivateLink: Configure an endpoint service: https://docs.aws.amazon.com/vpc/latest/privatelink/configure-endpoint-service.html
- AWS CLI `create-vpc-endpoint`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI `modify-vpc-endpoint`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-endpoint.html
- AWS CLI `modify-vpc-endpoint-service-configuration`: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-endpoint-service-configuration.html
- AWS CLI `describe-vpc-endpoint-service-configurations`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoint-service-configurations.html
- AWS CLI `describe-vpc-endpoints`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html
- AWS CLI `describe-vpc-endpoint-services`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoint-services.html
- AWS CLI `set-ip-address-type`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/set-ip-address-type.html
- Terraform Registry `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- The introduction incorrectly described AWS PrivateLink IPv6 as requiring IPv6 BGP sessions and route advertisement. I replaced that with the actual PrivateLink model: IPv6-capable endpoint services, dualstack Network Load Balancers, and compatible interface endpoints.
- The prerequisites used Azure terminology (`VNet`) and omitted AWS-specific requirements for IPv6-capable PrivateLink. I corrected them to provider-side IPv6 CIDRs, dualstack NLBs, and compatible consumer subnets.
- The original CLI workflow used commands for unrelated features, including VPC DNS attributes, VPC CIDR association as the main service step, Direct Connect private virtual interfaces, and internet gateway routing. I replaced these with current AWS PrivateLink and ELBv2 commands that actually configure endpoint services and interface endpoints for IPv6.
- The testing section validated on-premises routing rather than PrivateLink behavior. I changed it to inspect VPC endpoint state and DNS entries, resolve AAAA records, and test the service over IPv6 from a VPC client.
- The Terraform example used `aws_vpn_connection`, which is unrelated to AWS PrivateLink. I replaced it with a valid `aws_vpc_endpoint` interface endpoint example using `ip_address_type = "dualstack"` and `dns_options`.
- The conclusion referred to BGP session state and route advertisement. I updated it to match PrivateLink's actual service, DNS, and endpoint configuration model.

## Review Notes
- AWS requires the endpoint service's Network Load Balancer to use the `dualstack` IP address type before the service can accept IPv6 requests.
- Interface endpoints can use `ip_address_type = "ipv6"` only with IPv6-only subnets; this post now demonstrates the more common `dualstack` configuration.
- AWS documentation notes that backend targets behind the Network Load Balancer do not need to support IPv6 traffic for the endpoint service to accept IPv6 requests.
- The commands were validated against current AWS and Terraform documentation. They were not executed locally because the review environment does not include the AWS CLI or Terraform binaries.
