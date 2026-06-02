# Validation Summary: How to Set Up Transit Gateway Network Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Manager
- AWS Transit Gateway
- AWS Site-to-Site VPN
- AWS Direct Connect gateway attachments
- AWS CLI
- AWS CloudFormation
- Amazon EventBridge / CloudWatch Events
- Amazon SNS
- IAM
- Mermaid diagrams

## Sources Consulted
- AWS Network Manager: What is AWS Global Networks for Transit Gateways? https://docs.aws.amazon.com/network-manager/latest/tgwnm/what-are-global-networks.html
- AWS Network Manager: How AWS Global Networks for Transit Gateways works https://docs.aws.amazon.com/vpc/latest/tgwnm/how-network-manager-works.html
- AWS Network Manager transit gateway dashboards, monitoring, topology, and route analyzer https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-tgw-networks.html
- Amazon EventBridge AWS Network Manager events reference https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-networkmanager.html
- AWS CLI Network Manager command reference https://docs.aws.amazon.com/cli/latest/reference/networkmanager/
- AWS CLI Network Manager examples https://docs.aws.amazon.com/cli/latest/userguide/cli_networkmanager_code_examples.html
- AWS CloudFormation AWS::NetworkManager::GlobalNetwork https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-networkmanager-globalnetwork.html
- AWS CloudFormation AWS::NetworkManager::TransitGatewayRegistration https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-networkmanager-transitgatewayregistration.html
- AWS CloudFormation AWS::NetworkManager::CustomerGatewayAssociation https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-networkmanager-customergatewayassociation.html
- AWS CloudFormation AWS::SNS::TopicPolicy https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sns-topicpolicy.html

## Issues Found
- The post said Transit Gateway Network Manager lets you register Site-to-Site VPN connections and SD-WAN devices directly. AWS documentation describes registering transit gateways, while transit gateway attachments such as Site-to-Site VPN, Direct Connect gateway, VPC, Connect, and peering attachments are included automatically when the transit gateway is registered. Updated the explanation to match that behavior.
- The AWS CLI examples omitted the Network Manager home/control Region. AWS documentation and examples use `us-west-2` for Network Manager global network operations, so `--region us-west-2` was added to the Network Manager CLI commands.
- The customer gateway association example used `--link-id` without first associating the link to the device. AWS requires the link to be associated with the specified device before it can be used in the customer gateway association, so an `associate-link` command was added.
- The EventBridge-to-SNS CloudFormation example was a partial snippet and lacked an SNS topic policy allowing EventBridge to publish to the topic. Converted it into a complete minimal template and added `AWS::SNS::TopicPolicy`.
- The monitoring section claimed packet loss metrics and exact green/yellow/red state meanings. AWS documentation describes relationship line colors and the documented transit gateway monitoring metrics include bytes, packets, and dropped packet counters. Updated the wording to avoid overstating console behavior.
- The route analyzer section said it can test between any two points in the network. AWS documentation states Route Analyzer checks transit gateway route tables between specified transit gateway attachments, so the wording was narrowed.

## Review Notes
- The examples use placeholder resource IDs and ARNs. They are syntactically shaped correctly, but readers must replace them with real resources in supported Regions and accounts.
- AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI documentation rather than local `aws help` output.
