# Validation Summary: How to Set Up Direct Connect Resiliency with Dual Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Direct Connect
- AWS Direct Connect Resiliency Toolkit
- AWS CLI
- Border Gateway Protocol (BGP)
- Bidirectional Forwarding Detection (BFD)
- Link Aggregation Groups (LAG)
- AWS CloudFormation
- Amazon CloudWatch

## Sources Consulted
- AWS Direct Connect Resiliency Toolkit: https://docs.aws.amazon.com/directconnect/latest/UserGuide/resiliency_toolkit.html
- Direct Connect connection options: https://docs.aws.amazon.com/directconnect/latest/UserGuide/connection_options.html
- Resilience in AWS Direct Connect: https://docs.aws.amazon.com/directconnect/latest/UserGuide/disaster-recovery-resiliency.html
- AWS CLI create-connection command reference: https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-connection.html
- AWS CLI create-transit-virtual-interface command reference: https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-transit-virtual-interface.html
- AWS CLI start-bgp-failover-test command reference: https://docs.aws.amazon.com/cli/latest/reference/directconnect/start-bgp-failover-test.html
- AWS CLI list-virtual-interface-test-history command reference: https://docs.aws.amazon.com/cli/latest/reference/directconnect/list-virtual-interface-test-history.html
- AWS::DirectConnect::DirectConnectGateway CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-directconnect-directconnectgateway.html
- AWS::DirectConnect::TransitVirtualInterface CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-directconnect-transitvirtualinterface.html
- Direct Connect CloudWatch monitoring: https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html
- Direct Connect quotas for BFD timers: https://docs.aws.amazon.com/directconnect/latest/UserGuide/limits.html

## Issues Found
- The Development and Test resiliency model was described as a single connection with no redundancy. AWS documents it as separate connections terminating on separate devices in one Direct Connect location, so the description was corrected.
- The Classic model was described as two same-location connections. AWS documents Classic as a connection ordered outside the Resiliency Toolkit and notes that the model itself does not provide resiliency or redundancy, so the description was corrected.
- The transit VIF CLI examples used a `dx-gw-*` style Direct Connect gateway ID. Current AWS examples and CloudFormation patterns use UUID-style Direct Connect gateway IDs, so the placeholder was replaced with a UUID-style value.
- The transit VIF CLI examples omitted `addressFamily`. The field is part of the documented BGP peer structure and AWS examples include it, so `addressFamily: ipv4` was added.
- The failover test comments incorrectly called the operation a BFD test and described it as requesting a maintenance event. AWS documents `start-bgp-failover-test` as placing a BGP peering session in the DOWN state, so the comments were corrected.
- The failover test monitoring command used `describe-virtual-interface-test-history`, which is not the current AWS CLI command. It was replaced with `list-virtual-interface-test-history`.
- The CloudFormation Direct Connect gateway used `Name`, but the resource property is `DirectConnectGatewayName`. The property was corrected.
- The CloudFormation transit VIF resources placed `Asn` at the resource top level and omitted required `BgpPeers`. The resources were updated to use `BgpPeers` with `AddressFamily`, `Asn`, `AuthKey`, `AmazonAddress`, and `CustomerAddress`.
- The CloudFormation section claimed to be a "full stack" setup even though it only provisions Direct Connect resources. The heading and introductory sentence were narrowed to avoid implying that Transit Gateway associations are included.

## Review Notes
- The BGP router syntax remains a vendor-specific Cisco-like example, as stated in the post.
- Transit VIFs require a Direct Connect gateway that is associated with a Transit Gateway for end-to-end Transit Gateway connectivity; the post's CloudFormation snippet now avoids claiming it creates the full downstream stack.
