# Validation Summary: How to Create EC2 with Elastic IP in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon EC2
- Elastic IP addresses
- Elastic Network Interfaces
- Amazon VPC networking
- Amazon Route 53

## Sources Consulted
- HashiCorp AWS Provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp AWS Provider `aws_eip_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association
- HashiCorp AWS Provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS Provider `aws_network_interface_attachment` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface_attachment
- AWS EC2 Elastic IP address documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS EC2 instance IP addressing documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html
- AWS EC2 stop/start documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- AWS VPC public IPv4 pricing: https://aws.amazon.com/vpc/pricing/
- AWS EC2 On-Demand pricing, Elastic IP Addresses section: https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The basic example used a hard-coded, old AMI ID. Changed it to the current AWS Systems Manager public parameter for the latest Amazon Linux 2023 AMI so the example is not tied to a stale regional AMI.
- The EIP examples did not explicitly depend on the internet gateway. The AWS provider documentation notes that EIP association may require the IGW to exist first, so `depends_on = [aws_internet_gateway.main]` was added to the EIP resources in the examples that use the VPC from the post.
- The ENI examples used the deprecated `network_interface` block on `aws_instance`. Updated the primary ENI examples to `primary_network_interface` and changed the secondary ENI example to use `aws_network_interface_attachment`.
- The Cost and Limits section said EIPs are free when associated with a running instance and only cost money when idle or associated with a stopped instance. AWS now charges for all in-use and idle Elastic IP/public IPv4 addresses, so the bullets were corrected.
- The Cost and Limits section said EIP remapping is charged after 100 remaps per month. Current AWS pricing pages identify that 100-remap threshold for Carrier IP addresses in Wavelength Zones, so the bullet was narrowed to that case.

## Review Notes
The snippets are still partial examples in later sections and rely on previously declared resources such as subnets, security groups, internet gateways, key pairs, and AMI data sources. That is acceptable for a tutorial, but a future improvement would be to add a complete reusable module-style example with variables and provider version constraints.
