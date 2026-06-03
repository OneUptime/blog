# Validation Summary: How to Create Direct Connect with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Direct Connect
- Terraform AWS Provider
- Direct Connect Gateway
- Direct Connect virtual interfaces
- Link Aggregation Groups
- AWS Transit Gateway
- Amazon CloudWatch
- BGP networking

## Sources Consulted
- AWS Direct Connect User Guide: Direct Connect gateways - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways.html
- AWS Direct Connect User Guide: Direct Connect gateways and transit gateway associations - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- AWS Direct Connect User Guide: Direct Connect virtual private gateway associations - https://docs.aws.amazon.com/directconnect/latest/UserGuide/virtualgateways.html
- AWS Direct Connect User Guide: Direct Connect virtual interfaces and hosted virtual interfaces - https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html
- AWS Direct Connect User Guide: Public virtual interface routing policies - https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html
- AWS Direct Connect User Guide: Use the Direct Connect CLI - https://docs.aws.amazon.com/directconnect/latest/UserGuide/using-cli.html
- AWS Direct Connect User Guide: Monitor with Amazon CloudWatch - https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html
- Terraform AWS Provider documentation: aws_dx_connection - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_connection
- Terraform AWS Provider documentation: aws_dx_lag - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_lag
- Terraform AWS Provider documentation: aws_dx_public_virtual_interface - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_public_virtual_interface
- Terraform AWS Provider documentation: aws_dx_transit_virtual_interface - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_transit_virtual_interface
- Terraform AWS Provider documentation: aws_dx_bgp_peer - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_bgp_peer

## Issues Found
- The bandwidth description was outdated. AWS currently lists dedicated Direct Connect connection speeds of 1Gbps, 10Gbps, 100Gbps, and 400Gbps, while hosted connections can range from 50Mbps through 25Gbps depending on the Direct Connect Partner. Updated the text accordingly.
- The public virtual interface example used `route_filter_prefixes` as if they were AWS service prefixes to receive. Terraform and AWS use these as customer prefixes advertised to AWS over BGP. Updated the example and added a short clarification.
- The public virtual interface example used real-looking public addresses. Replaced them with AWS documentation example addresses from `203.0.113.0/24` and noted that production configurations must use public prefixes the customer owns or AWS provides.
- The transit virtual interface section reused the same Direct Connect Gateway shown for private VIF/VGW connectivity. AWS does not allow attaching a Direct Connect Gateway to a transit gateway if it is already associated with a virtual private gateway or attached to a private VIF. Updated the transit example to use a separate Direct Connect Gateway and added a clarification.
- The LAG example used the removed `number_of_connections` argument. Terraform AWS Provider v2 and later require creating Direct Connect connections separately and associating them with `aws_dx_connection_association`, so the example now creates a second connection and associates both connections with the LAG.

## Review Notes
The Terraform resource names and core arguments are current for the AWS provider documentation reviewed. The snippets still depend on surrounding resources not shown in the article, such as `aws_vpc.main`, `aws_ec2_transit_gateway.main`, and `aws_sns_topic.alerts`, so they are illustrative rather than a complete standalone Terraform module.
