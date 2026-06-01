# Validation Summary: How to Use AWS Global Networks (Cloud WAN) for Multi-Region

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Cloud WAN
- AWS Network Manager
- AWS CLI
- Cloud WAN core network policies
- VPC, Site-to-Site VPN, Direct Connect gateway, and Transit Gateway connectivity
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Cloud WAN User Guide, What is AWS Cloud WAN: https://docs.aws.amazon.com/network-manager/latest/cloudwan/what-is-cloudwan.html
- AWS Cloud WAN core network policy JSON parameters: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policies-json.html
- AWS Cloud WAN attachments: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-create-attachment.html
- AWS Cloud WAN attachment acceptance: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-attachments-acceptance.html
- AWS CLI `networkmanager create-core-network`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-core-network.html
- AWS CLI `networkmanager create-vpc-attachment`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-vpc-attachment.html
- AWS CLI `networkmanager create-site-to-site-vpn-attachment`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-site-to-site-vpn-attachment.html
- AWS CLI `networkmanager list-attachments`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/list-attachments.html
- AWS CLI `networkmanager accept-attachment`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/accept-attachment.html
- AWS CLI `networkmanager get-network-routes`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/get-network-routes.html
- AWS CLI `networkmanager get-core-network-policy`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/get-core-network-policy.html
- AWS CLI `networkmanager get-network-telemetry`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/get-network-telemetry.html
- AWS Cloud WAN CloudWatch metrics: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-metrics.html
- AWS Cloud WAN pricing: https://aws.amazon.com/cloud-wan/pricing/

## Issues Found
- The post said Cloud WAN "builds on Transit Gateway infrastructure." AWS describes Cloud WAN core network edges as similar to Transit Gateway and managed by AWS, so the wording was changed to avoid overstating the internal implementation.
- The Global Network definition implied there is only one global network. AWS allows a global network as a container for network resources; the text now scopes the "one global network" statement to this design.
- The sample policy set `isolate-attachments` to `true` for the development segment while later claiming development VPCs can communicate with each other. Because `isolate-attachments: true` prevents attachments in the same segment from communicating, the policy was changed to `false`.
- The VPC attachment examples used human-readable placeholder VPC and subnet IDs inside ARNs. AWS CLI v2 validates these as `vpc-` and `subnet-` hexadecimal IDs, so the examples were changed to syntactically valid placeholder IDs.
- The route lookup command used `--core-network-id` as a top-level argument for `get-network-routes`. The AWS CLI requires `--global-network-id` plus a route table identifier, so the command was corrected.
- The verification comment described `get-core-network-policy` as checking the routing table. That command returns the core network policy, so the comment was corrected.
- The cost list described peering as "cross-region traffic." AWS prices peering connections between a core network edge and a Transit Gateway in the same Region, so the cost wording was corrected.
- The fixed monthly cost estimate was too specific without traffic assumptions and could become inaccurate as pricing changes. It was replaced with guidance to use the AWS Pricing Calculator for the deployment's traffic profile.

## Review Notes
The AWS CLI examples use valid Network Manager command names and option shapes. Cloud WAN segment sharing with `mode: "attachment-route"` is current; it creates mutual reachability between the named segment and the `share-with` segments, but does not create reachability among the `share-with` segments themselves.
