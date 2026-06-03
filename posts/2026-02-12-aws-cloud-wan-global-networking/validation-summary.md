# Validation Summary: How to Use AWS Cloud WAN for Global Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cloud WAN
- AWS Network Manager
- AWS CLI
- AWS CloudFormation
- Amazon VPC routing
- Site-to-Site VPN
- Direct Connect gateway attachments
- Mermaid diagrams

## Sources Consulted
- AWS Cloud WAN core network policy version parameters: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policies-json.html
- AWS Cloud WAN core network policy examples: https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policy-examples.html
- AWS Cloud WAN overview: https://docs.aws.amazon.com/network-manager/latest/cloudwan/what-is-cloudwan.html
- AWS CLI create-core-network command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-core-network.html
- AWS CLI create-vpc-attachment command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-vpc-attachment.html
- AWS CLI accept-attachment command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/accept-attachment.html
- AWS CLI create-site-to-site-vpn-attachment command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-site-to-site-vpn-attachment.html
- AWS CLI put-core-network-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/put-core-network-policy.html
- AWS CLI get-core-network-change-set command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/get-core-network-change-set.html
- AWS CLI execute-core-network-change-set command reference: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/execute-core-network-change-set.html
- AWS CloudFormation AWS::NetworkManager::VpcAttachment reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-networkmanager-vpcattachment.html
- AWS CloudFormation AWS::EC2::Route reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- AWS Cloud WAN pricing: https://aws.amazon.com/cloud-wan/pricing/

## Issues Found
- The introduction said Cloud WAN policy is managed through a JSON or YAML policy document. AWS Cloud WAN policy documentation describes JSON policy files, so this was changed to "JSON policy document."
- The architecture explanation said Cloud WAN sits on top of transit gateway infrastructure. AWS describes Cloud WAN as using core network edges across the AWS global network, so the wording was corrected to avoid implying that Cloud WAN deploys Transit Gateways as its underlying primitive.
- The VPC attachment section said each VPC gets tagged and routed to the right segment. AWS attachment policies evaluate attachment tags, not the VPC resource's tags, so this was changed to say each attachment gets tagged and associated with the right segment.
- The CloudFormation example used a `SubnetIds` parameter with `SubnetArns: !Ref SubnetIds`, but `AWS::NetworkManager::VpcAttachment` requires subnet ARNs. The parameter was changed to `SubnetArns: List<String>`.
- The CloudFormation route example referenced `PrivateRouteTable` without declaring it. A `PrivateRouteTable` parameter of type `AWS::EC2::RouteTable::Id` was added.
- The Mermaid blocked-connection edge used `-.-x`, which is not a valid/common Mermaid flowchart edge form. It was changed to `x--x`.
- The cost section described "peering connections between regions." AWS Cloud WAN pricing refers to Transit Gateway peering connections to a core network edge, plus core network edges, attachments, data processing, and standard data transfer. The wording was corrected.

## Review Notes
AWS CLI was not installed in the local workspace, so CLI validation was performed against the official AWS CLI v2 command reference instead of local `aws ... help` output. The post uses Cloud WAN policy version `2021.12`, which is still documented as valid; AWS also documents policy version `2025.11` for route policies and BGP community support, but the post does not require those newer features.
