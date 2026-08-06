# Validation Summary: Overlapping VPC CIDRs with Transit Gateway, PrivateLink, and Private NAT

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC and VPC route tables
- AWS PrivateLink and interface VPC endpoints
- Network Load Balancer and Application Load Balancer
- Private NAT Gateway
- Amazon Route 53 private DNS
- VPC Flow Logs

## Sources Consulted
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS Transit Gateway quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [NAT gateway use cases: Enable communication between overlapping networks](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html)
- [AWS Whitepaper: Private NAT Gateway](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/private-nat-gateway.html)
- [NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html)
- [Create a service powered by AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html)
- [AWS Prescriptive Guidance: AWS PrivateLink architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/integrate-third-party-services/architecture-1.html)
- [Control access to VPC endpoints using endpoint policies](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html)
- [Target groups for Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html)
- [AWS PrivateLink pricing](https://aws.amazon.com/privatelink/pricing/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)

## Issues Found
- The routing checklist called out four route planes but omitted the route tables associated with the Transit Gateway attachment subnets. Added the attachment-subnet routing requirement and noted that automatically added local routes normally cover traffic to addresses inside a VPC CIDR.
- The statement that a static route cannot select an attachment based on the source VPC was too broad because different source attachments can be associated with different Transit Gateway route tables. Clarified that one prefix can target only one attachment within a given route table and that static routes do not make both overlapping VPCs directly reachable at the same destination address.
- The PrivateLink checklist suggested endpoint policies as a possible authorization control without stating that AWS applies full-access endpoint policy behavior to non-AWS endpoint services. Replaced the recommendation with the documented limitation and retained application-level authorization as the appropriate control.
- The private NAT diagram said that source translation occurs "into" an entire transit CIDR. A NAT gateway translates the source to one of its assigned private IP addresses. Updated the diagram to identify the NAT gateway's private IP within the transit CIDR.

## Review Notes
- The Transit Gateway overlap and route-propagation behavior matches the current AWS documentation.
- The documented private NAT architecture is correctly characterized as an initiator-to-service pattern using source NAT and an Application Load Balancer, rather than transparent any-to-any routing.
- The PrivateLink source-address and Proxy Protocol v2 discussion matches AWS documentation.
- The PrivateLink data-processing tiers and the US East (Ohio) NAT Gateway example rates matched the AWS pricing pages on the validation date. These rates remain time- and Region-sensitive as the post notes.
- All eight documentation links in the post returned successful HTTP responses during validation.
