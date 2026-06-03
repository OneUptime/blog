# Validation Summary: How to Configure DNS Resolution in a VPC

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon VPC
- AmazonProvidedDNS / Route 53 Resolver
- Route 53 private hosted zones
- DHCP option sets
- Resolver inbound and outbound endpoints
- VPC peering DNS resolution
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS VPC User Guide: Understanding Amazon DNS - https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- AWS VPC User Guide: DHCP option set concepts - https://docs.aws.amazon.com/vpc/latest/userguide/DHCPOptionSetConcepts.html
- AWS VPC Peering Guide: Enable DNS resolution for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- AWS CLI Command Reference: modify-vpc-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI Command Reference: create-dhcp-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-dhcp-options.html
- AWS CLI Command Reference: create-resolver-endpoint - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-endpoint.html
- AWS CLI Command Reference: create-resolver-rule - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-rule.html
- AWS CLI Command Reference: modify-vpc-peering-connection-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-peering-connection-options.html
- Terraform Registry: aws_route53_resolver_endpoint - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- Terraform Registry: aws_route53_resolver_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule
- Terraform Registry: aws_route53_resolver_rule_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_rule_association

## Issues Found
- The post said the two VPC DNS attributes control whether DNS works at all. Changed this to say they control DNS support and DNS hostnames, because `enableDnsSupport` controls Amazon-provided DNS resolution while `enableDnsHostnames` controls public DNS hostnames and is also required with `enableDnsSupport` for private hosted zones.
- The private hosted zone note mentioned only `enableDnsHostnames`. Updated it to say both `enableDnsHostnames` and `enableDnsSupport` are required for Route 53 private hosted zones.
- The DHCP custom DNS example included `10.0.0.2`, which is the VPC resolver address in the example VPC, while the following paragraph described using only custom DNS servers. Changed the example IPs and clarified that losing direct private hosted zone resolution applies when instances are pointed only at custom DNS servers.
- The Route 53 Resolver endpoint and resolver rule AWS CLI examples omitted required `--creator-request-id` parameters. Added unique creator request IDs to the inbound endpoint, outbound endpoint, and forwarding rule commands.
- The Route 53 Resolver security group examples used `sg-resolver`, which is not a valid-looking AWS security group ID. Replaced it with a normal placeholder security group ID.
- The VPC peering section implied general DNS resolution across peering and referred to private DNS hostnames resolving differently. Updated it to match AWS behavior: the peering DNS option affects public IPv4 DNS hostnames resolving to private IPv4 addresses, requires both VPC DNS attributes, and has per-account update requirements for cross-account peering.
- The Terraform example created a resolver forwarding rule but did not associate it with the VPC. Added an `aws_route53_resolver_rule_association` resource so the rule is actually used by the VPC.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the current official AWS CLI documentation rather than local `aws help` output.
