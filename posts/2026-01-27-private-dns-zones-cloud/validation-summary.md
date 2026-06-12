# Validation Summary: How to Build Private DNS Zones in Cloud

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- DNS and private DNS zones
- AWS Route 53 private hosted zones and Route 53 Resolver
- Google Cloud DNS private managed zones
- Azure Private DNS
- AWS CLI, Google Cloud CLI, and Azure CLI
- Terraform AWS, Google, and AzureRM providers
- VPC and VNet DNS resolution

## Sources Consulted
- AWS CLI Command Reference: `route53 create-hosted-zone` - https://docs.aws.amazon.com/cli/latest/reference/route53/create-hosted-zone.html
- AWS CLI Command Reference: `route53 associate-vpc-with-hosted-zone` - https://docs.aws.amazon.com/cli/latest/reference/route53/associate-vpc-with-hosted-zone.html
- Amazon Route 53 Developer Guide: Working with private hosted zones - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html
- Amazon Route 53 Developer Guide: Private hosted zone considerations and split-view DNS - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html
- Amazon VPC User Guide: Amazon DNS concepts - https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Amazon Route 53 Developer Guide: Route 53 Resolver outbound endpoint values and security group requirements - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries-endpoint-values.html
- Amazon Route 53 Developer Guide: Resolver endpoint scaling and security group port requirements - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-resolver-endpoint-scaling.html
- AWS CLI Command Reference: `route53resolver create-resolver-endpoint` - https://docs.aws.amazon.com/cli/latest/reference/route53resolver/create-resolver-endpoint.html
- Google Cloud DNS documentation: Create, modify, and delete zones - https://docs.cloud.google.com/dns/docs/zones
- Google Cloud SDK Reference: `gcloud dns managed-zones update` - https://docs.cloud.google.com/sdk/gcloud/reference/dns/managed-zones/update
- Google Cloud DNS documentation: DNS server policies and metadata resolver behavior - https://docs.cloud.google.com/dns/docs/server-policies-overview
- Google Cloud DNS documentation: Best practices for Cloud DNS - https://docs.cloud.google.com/dns/docs/best-practices
- Terraform Registry: `google_dns_managed_zone` - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_managed_zone
- Microsoft Learn: Create an Azure private DNS zone using Azure CLI - https://learn.microsoft.com/en-us/azure/dns/private-dns-getstarted-cli
- Microsoft Learn: Azure Private DNS virtual network links - https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Microsoft Learn: Azure Private DNS autoregistration - https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Microsoft Learn: Azure IP address 168.63.129.16 - https://learn.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
- Microsoft Learn Azure CLI Reference: `az network private-dns link vnet` - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Terraform Registry: `aws_route53_zone`, `aws_route53_record`, `aws_route53_zone_association`, and `aws_vpc` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Registry: AzureRM private DNS resources - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- IETF RFC 6762: Multicast DNS and `.local` special-use behavior - https://datatracker.ietf.org/doc/html/rfc6762

## Issues Found
- The AWS Route 53 Resolver outbound endpoint security group example used `authorize-security-group-ingress` for DNS traffic. AWS documents that outbound Resolver endpoints require egress rules allowing TCP and UDP access to the DNS target port, so I changed the commands to `authorize-security-group-egress` and clarified the comment.
- The AWS Terraform example referenced `aws_lb.internal` and `aws_vpc.secondary` without defining them in the snippet. I replaced those references with explicit input variables for the existing internal load balancer DNS name, load balancer hosted zone ID, and secondary VPC ID so the example no longer depends on undeclared resources.
- The naming guidance said to avoid public TLDs for private zones, which contradicted the post's own `internal.mycompany.com` examples and AWS split-view DNS guidance. I changed it to recommend using a subdomain of a domain you control and documenting intentional split-horizon behavior.

## Review Notes
The post is technically relevant and contains implementation details, CLI commands, and Terraform snippets. The remaining examples are illustrative and use placeholder IDs and IP addresses, so they still require real cloud resources, IAM permissions, enabled APIs/extensions, and provider credentials before execution.
