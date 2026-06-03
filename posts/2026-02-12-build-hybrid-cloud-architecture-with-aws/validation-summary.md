# Validation Summary: How to Build a Hybrid Cloud Architecture with AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Direct Connect
- AWS Transit Gateway
- Amazon Route 53 Resolver
- AWS Storage Gateway
- AWS DataSync
- AWS IAM Identity Center
- AWS Directory Service for Microsoft Active Directory
- Amazon CloudWatch Agent
- Amazon VPC security groups, NACLs, and VPC Flow Logs
- AWS CDK for TypeScript
- AWS CLI

## Sources Consulted
- AWS CDK `Vpc` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK `CfnVPNConnection` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.CfnVPNConnection.html
- AWS CloudFormation `AWS::EC2::VPNConnection` tunnel options reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-vpnconnection-vpntunneloptionsspecification.html
- AWS Site-to-Site VPN documentation and quotas: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
- AWS Direct Connect dedicated connection documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/dedicated_connection.html
- AWS Direct Connect MACsec documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/MACsec.html
- AWS CDK `CfnTransitGateway` and Transit Gateway CloudFormation documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/CfnTransitGateway.html
- AWS CDK `CfnResolverEndpoint` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53resolver.CfnResolverEndpoint.html
- AWS CDK `CfnResolverRule` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53resolver.CfnResolverRule.html
- AWS CLI `storagegateway create-nfs-file-share` command reference: https://docs.aws.amazon.com/cli/latest/reference/storagegateway/create-nfs-file-share.html
- AWS CDK `CfnTask` API reference and DataSync task schedule documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_datasync.CfnTask.html
- AWS Directory Service and IAM Identity Center Active Directory documentation: https://docs.aws.amazon.com/directory-service/ and https://docs.aws.amazon.com/singlesignon/latest/userguide/gs-ad.html
- Amazon CloudWatch Agent on-premises installation and configuration documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-premise.html
- Amazon CloudWatch Agent metrics and configuration examples: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html and https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-examples.html

## Issues Found
- The Site-to-Site VPN CDK example used `vpc.addVpnGateway()`, which is not present in the current AWS CDK `Vpc` API. Changed it to `vpc.enableVpnGateway()` and referenced `vpc.vpnGatewayId!` for the VPN connection.
- The VPN connection example used an `options.tunnelOptions` object that is not a valid `CfnVPNConnectionProps` property. Changed it to `vpnTunnelOptionsSpecifications`, matching the CloudFormation and CDK property names.
- The Direct Connect bandwidth list omitted 400 Gbps dedicated connections. Added 400 Gbps to match current AWS Direct Connect documentation.
- The Storage Gateway command used 9-digit account IDs in example ARNs. Changed them to 12-digit placeholder account IDs.
- The DataSync and Directory Service snippets referenced CDK namespaces without imports. Added the relevant `aws-datasync` and `aws-directoryservice` imports.
- The security checklist implied MACsec is available for all Direct Connect links. Clarified that MACsec applies to supported dedicated connections.

## Review Notes
The corrected CDK examples were typechecked against the current `aws-cdk-lib` package with strict TypeScript settings. AWS CLI was not installed locally, so CLI verification was performed against the official AWS CLI command reference.
