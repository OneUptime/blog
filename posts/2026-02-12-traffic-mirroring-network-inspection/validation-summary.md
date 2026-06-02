# Validation Summary: How to Set Up Traffic Mirroring for Network Inspection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Traffic Mirroring
- Amazon EC2 Elastic Network Interfaces
- Network Load Balancer
- Gateway Load Balancer endpoint
- AWS CLI
- VXLAN
- tcpdump
- Linux iproute2
- Suricata
- Terraform AWS provider
- VPC Flow Logs

## Sources Consulted
- AWS VPC Traffic Mirroring: What is Traffic Mirroring? https://docs.aws.amazon.com/vpc/latest/mirroring/what-is-traffic-mirroring.html
- AWS VPC Traffic Mirroring: How Traffic Mirroring works https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-how-it-works.html
- AWS VPC Traffic Mirroring: Understand traffic mirror target concepts https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-targets.html
- AWS VPC Traffic Mirroring: Understanding traffic mirror packet format https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-packet-formats.html
- AWS VPC Traffic Mirroring: Traffic Mirroring limitations https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-network-limitations.html
- AWS CLI: create-traffic-mirror-target https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-target.html
- AWS CLI: create-traffic-mirror-filter https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-filter.html
- AWS CLI: create-traffic-mirror-filter-rule https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-filter-rule.html
- AWS CLI: create-traffic-mirror-session https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-session.html
- Terraform AWS Provider: aws_ec2_traffic_mirror_filter_rule https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_traffic_mirror_filter_rule
- Suricata documentation: AF_PACKET configuration https://docs.suricata.io/

## Issues Found
- The Network Load Balancer target setup omitted the requirement that the NLB have a UDP listener on port 4789. Added that requirement because AWS documents it as necessary for Traffic Mirroring to an NLB target.
- The filter section implied that Traffic Mirroring can operate without filters and would then mirror everything. Adjusted the wording because a traffic mirror session establishes a relationship with a filter, and traffic is mirrored when it matches accept rules.
- The session examples did not set a VXLAN network identifier, while the later Linux VXLAN interface example used VNI 1234. Added `--virtual-network-id 1234` to the session examples so the decapsulation example is consistent.
- The session-number explanation described lower numbers as higher priority during bandwidth contention. Changed it to AWS's documented behavior: sessions are evaluated by session number, and the first session with a matching filter mirrors the packet.
- The limitations section said Traffic Mirroring is supported on Nitro-based instance types only. Updated it to refer to AWS's current supported instance family list, because current AWS documentation lists supported source instance families rather than only the older Nitro-only statement.
- The VXLAN overhead was listed as about 50 bytes per packet. Updated it to AWS's documented 54 bytes for IPv4 and 74 bytes for IPv6.

## Review Notes
The AWS CLI command names, option names, Traffic Mirror target/filter/session concepts, filter rule ordering, packet truncation option, VXLAN UDP destination port 4789, Terraform resource names, and general bandwidth/drop behavior were consistent with current official documentation. The Terraform snippet is partial and assumes surrounding resources such as `aws_lb.inspection` and `aws_instance.web` exist.
