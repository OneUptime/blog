# Validation Summary: How to Set Up DHCP Option Sets in a VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- DHCP option sets
- AmazonProvidedDNS / Route 53 Resolver
- AWS CLI for EC2/VPC
- Terraform AWS provider
- Linux and Windows instance DNS configuration

## Sources Consulted
- AWS VPC User Guide: DHCP option sets in Amazon VPC, https://docs.aws.amazon.com/vpc/latest/userguide/VPC_DHCP_Options.html
- AWS VPC User Guide: DHCP option set concepts, https://docs.aws.amazon.com/vpc/latest/userguide/DHCPOptionSetConcepts.html
- AWS VPC User Guide: Work with DHCP option sets, https://docs.aws.amazon.com/vpc/latest/userguide/DHCPOptionSet.html
- AWS VPC User Guide: Understanding Amazon DNS, https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- AWS CLI Command Reference: create-dhcp-options, https://docs.aws.amazon.com/cli/latest/reference/ec2/create-dhcp-options.html
- AWS CLI Command Reference: associate-dhcp-options, https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-dhcp-options.html
- AWS EC2 User Guide: Understanding EC2 instance hostnames and domains, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/understanding-ec2-instance-hostnames-domains.html
- AWS EC2 User Guide: Precision clock and time synchronization on your EC2 instance, https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-time.html
- Amazon Route 53 Developer Guide: Forwarding outbound DNS queries to your network, https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html
- Terraform Registry: aws_vpc_dhcp_options, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_dhcp_options

## Issues Found
- The post said every VPC has exactly one DHCP option set and that AWS creates a default set per VPC. Updated this to say each VPC has at most one associated option set, each Region has a default option set, and a VPC can also be configured with no DHCP option set.
- The post listed only five supported DHCP option parameters. Updated it to include `ipv6-address-preferred-lease-time`.
- The post stated `domain-name-servers` and `ntp-servers` support only up to four addresses. Updated the limits to reflect the current AWS documentation: DNS can include up to four IPv4 values or up to three IPv4 values plus `AmazonProvidedDNS`, plus four IPv6 addresses; NTP can include four IPv4 and four IPv6 addresses.
- The post stated existing instances require stop/start for immediate DHCP changes and that reboot generally will not renew DHCP. Updated this to match AWS guidance: instances automatically pick up changes within a few hours based on DHCP lease renewal, and users can explicitly renew the lease from the operating system.
- The post said `AmazonProvidedDNS` cannot be listed alongside custom DNS server IPs. Updated this because AWS currently allows mixed values but warns that using both can cause unexpected behavior.
- The DNS server limitation section repeated the older four-server limit. Updated it with the current IPv4/IPv6 limit and operating system caveat.

## Review Notes
The AWS CLI and Terraform examples use current resource names and arguments. The local environment did not have `aws` or `terraform` installed, so command syntax was validated against official AWS CLI and Terraform provider documentation rather than local help output.
