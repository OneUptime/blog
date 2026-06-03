# Validation Summary: How to Configure Direct Connect Gateway for Multi-VPC Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Direct Connect
- Direct Connect Gateway
- Virtual private gateways
- Transit gateways
- Transit and private virtual interfaces
- AWS CLI
- AWS CloudFormation
- BGP route propagation and prefix filtering

## Sources Consulted
- AWS Direct Connect User Guide: Direct Connect gateways - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways-intro.html
- AWS Direct Connect User Guide: Direct Connect virtual private gateway associations - https://docs.aws.amazon.com/directconnect/latest/UserGuide/virtualgateways.html
- AWS Direct Connect User Guide: Direct Connect gateways and transit gateway associations - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- AWS Direct Connect User Guide: Allowed prefixes interactions for Direct Connect gateways - https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html
- AWS Direct Connect User Guide: Direct Connect quotas - https://docs.aws.amazon.com/directconnect/latest/UserGuide/limits.html
- AWS CLI Command Reference: create-direct-connect-gateway - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway.html
- AWS CLI Command Reference: create-direct-connect-gateway-association - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway-association.html
- AWS CLI Command Reference: create-transit-virtual-interface - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-transit-virtual-interface.html
- AWS CLI Command Reference: accept-direct-connect-gateway-association-proposal - https://docs.aws.amazon.com/cli/latest/reference/directconnect/accept-direct-connect-gateway-association-proposal.html
- AWS CloudFormation Template Reference: AWS::DirectConnect::DirectConnectGateway - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-directconnect-directconnectgateway.html
- AWS CloudFormation Template Reference: AWS::DirectConnect::DirectConnectGatewayAssociation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-directconnect-directconnectgatewayassociation.html

## Issues Found
- Corrected the opening explanation that implied separate physical Direct Connect connections are required in each Region without a Direct Connect Gateway. The more accurate issue is separate private VIFs or regional gateway attachments.
- Clarified that a Direct Connect Gateway is a globally available routing component and that private VIFs are used for VGW associations while transit VIFs are used for transit gateway associations.
- Updated the Amazon-side ASN guidance to include the private long ASN range supported by AWS.
- Replaced invalid Direct Connect Gateway example IDs using the `dx-gw-...` form with UUID-style IDs used by the AWS API and CLI.
- Replaced an invalid sample VPC ID with a valid `vpc-...` style placeholder.
- Corrected the allowed-prefix explanation for VGW versus transit gateway associations. VGW allowed prefixes act as a filter, while transit gateway allowed prefixes are advertised as entered.
- Fixed the CloudFormation sample: `DirectConnectGatewayName`, `AssociatedGatewayId`, and `AllowedPrefixesToDirectConnectGateway` are the correct property names, and allowed prefixes are strings rather than objects with `CIDR` keys.
- Fixed the CloudFormation output to use `!GetAtt DirectConnectGateway.DirectConnectGatewayId` because `Ref` returns the Direct Connect Gateway ARN.
- Corrected the cross-account accept command to use `--proposal-id` instead of the invalid `--association-proposal-id`.
- Updated current Direct Connect Gateway limits: transit gateways per Direct Connect Gateway is 6, and transit gateway advertised prefixes are 200 combined IPv4 and IPv6 prefixes from AWS to on-premises.

## Review Notes
The tutorial is technically relevant and uses current AWS CLI and CloudFormation resource types after the fixes. The VPC-to-VPC communication note is directionally correct for normal Direct Connect Gateway use, but AWS documents edge cases where supernet routing can permit communication through the Direct Connect endpoint; the post now uses "generally" to avoid overstatement.
