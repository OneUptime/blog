# Validation Summary: How to Configure Gateway Load Balancer for Third-Party Appliances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Gateway Load Balancer
- AWS PrivateLink / Gateway Load Balancer endpoints
- Amazon VPC route tables and ingress routing
- AWS CLI
- AWS CloudFormation
- GENEVE encapsulation
- Linux iptables
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Elastic Load Balancing: Getting started with Gateway Load Balancers using the AWS CLI: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/getting-started-cli.html
- AWS Elastic Load Balancing: Gateway Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/gateway-load-balancers.html
- AWS Elastic Load Balancing: Target groups for Gateway Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/target-groups.html
- AWS Elastic Load Balancing: Register targets for Gateway Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/target-group-register-targets.html
- AWS Elastic Load Balancing: Edit target group attributes / flow stickiness: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/edit-target-group-attributes.html
- Amazon VPC / AWS PrivateLink: Access an inspection system using a Gateway Load Balancer endpoint: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-load-balancer-endpoints.html
- AWS CloudFormation: AWS::EC2::VPCEndpointService: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpointservice.html
- AWS CloudFormation: AWS::EC2::VPCEndpoint: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html
- AWS Elastic Load Balancing: CloudWatch metrics for Gateway Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/cloudwatch-metrics.html

## Issues Found
- Added the missing endpoint-service permissions step for cross-account consumers. AWS requires the service provider to allow principals before those consumers can create Gateway Load Balancer endpoints.
- Added a note that appliance security groups must allow inbound and outbound UDP 6081, plus the configured health check port.
- Changed "full CloudFormation setup" to "core CloudFormation setup" because the template does not include route tables, endpoint-service permissions, appliance instances, or target registration.
- Replaced the Linux `ip link` / passthrough `iptables` example with a minimal host-prep example and clarified that production appliances must handle GWLB GENEVE TLV metadata and return-path encapsulation.
- Clarified flow stickiness: 5-tuple is the default, 3-tuple and 2-tuple are configurable, and 5-tuple is required with AWS Transit Gateway appliance mode.
- Corrected the `describe-target-health` comment because that command reports target health, not active flow count.
- Corrected the `NewFlowCount` description to describe flows over the selected CloudWatch period rather than "per second."

## Review Notes
The remaining CLI and CloudFormation snippets use placeholder IDs and ARNs. They are structurally consistent with AWS examples, but users must replace placeholders with real AWS resource IDs and add route table resources if converting the CloudFormation snippet into a complete deployment.
