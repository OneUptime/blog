# Validation Summary: Transit Gateway or VPC Peering: Find the Real Break-Even Point

## Status
validated

## Post Type
Reference / Network architecture and cost guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC and VPC peering
- Transit Gateway VPC, VPN, Direct Connect gateway, Connect, Network Firewall, and peering attachments
- Transit Gateway route tables, associations, propagation, and blackhole routes
- AWS network data-transfer and Transit Gateway pricing
- Availability Zones and AWS Regions
- Network MTU and Path MTU Discovery (PMTUD)
- VPC route migration and longest-prefix-match routing
- AWS Cost and Usage Report (CUR)

## Sources Consulted
- AWS, What is VPC peering?: https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- AWS, How VPC peering connections work: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS, VPC peering configurations with routes to an entire VPC: https://docs.aws.amazon.com/vpc/latest/peering/peering-configurations-full-access.html
- AWS, What is AWS Transit Gateway for Amazon VPC?: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
- AWS, How AWS Transit Gateway works: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS, Amazon VPC attachments in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS, AWS Transit Gateway network function attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-nf-fw.html
- AWS, AWS Transit Gateway quotas (including MTU and PMTUD behavior): https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html
- AWS Transit Gateway pricing: https://aws.amazon.com/transit-gateway/pricing/
- Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/
- AWS, Amazon VPC Peering billing update: https://aws.amazon.com/about-aws/whats-new/2025/04/amazon-vpc-peering-billing/
- AWS, Best practices and considerations to migrate from VPC Peering to AWS Transit Gateway: https://aws.amazon.com/blogs/networking-and-content-delivery/best-practices-and-considerations-to-migrate-from-vpc-peering-to-aws-transit-gateway/

## Issues Found

1. **Path MTU Discovery support was stated too broadly.** The post said that Transit Gateway does not support Path MTU Discovery. Current AWS documentation says Transit Gateway supports PMTUD for traffic entering on VPC and Connect attachments, generating ICMPv4 `FRAG_NEEDED` and ICMPv6 Packet Too Big messages, but does not support PMTUD on Site-to-Site VPN, Direct Connect, or peering attachments. Updated the statement to reflect that attachment-specific behavior.

2. **The 9001-byte peering MTU needed a same-Region qualifier.** AWS documents a 9001-byte maximum MTU for same-Region VPC peering and an 8500-byte maximum for inter-Region VPC peering. Updated the migration warning so the comparison to Transit Gateway's 8500-byte MTU explicitly refers to a same-Region peering path.

## Review Notes
- The topology formula `N * (N - 1) / 2`, its table, and the conclusion that peerings first exceed VPC attachment count at four fully meshed VPCs are correct.
- The US East (Ohio) worked example is arithmetically correct under its stated assumptions. Same-Region cross-AZ peering is listed at `$0.01/GB` in both the In and Out directions, producing `$0.02/GB` in aggregate, while the cited Transit Gateway example uses `$0.05` per VPC attachment-hour and `$0.02/GB` sent into Transit Gateway. At equal variable rates, the four attachments add `$146.00` for a 730-hour month.
- AWS confirms that same-AZ VPC peering data transfer is free even across accounts, VPC peering is non-transitive, edge-to-edge gateway use is unsupported, and matching or overlapping IPv4 or IPv6 CIDRs prevent peering.
- AWS confirms that Transit Gateway attachments can associate with one route table and propagate routes to one or more route tables, and that Transit Gateway does not route between attached VPCs with identical or overlapping CIDRs.
- The directional Transit Gateway example is correct: a 5 GB request and a 100 GB response represent 105 GB entering the gateway from the two source VPC attachments across the two traffic directions.
- The migration description correctly relies on more-specific VPC routes and longest-prefix match to canary selected subnet pairs while broader routes continue to use peering. Parallel paths still require careful forward-and-return-path validation.
- Pricing is time- and Region-dependent. The post appropriately labels the values as current examples and tells readers to retrieve exact Regional rates; they should be rechecked after the validation date.
- The post contains formulas and technical implementation guidance but no executable code, CLI commands, or configuration blocks requiring syntax validation.
