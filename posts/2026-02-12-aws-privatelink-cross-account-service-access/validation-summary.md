# Validation Summary: How to Set Up AWS PrivateLink for Cross-Account Service Access

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC interface endpoints
- VPC endpoint services
- Network Load Balancers
- Gateway Load Balancers
- Application Load Balancers as NLB targets
- AWS CLI
- AWS CloudFormation
- Security groups and endpoint policies

## Sources Consulted
- AWS PrivateLink concepts: https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html
- Create a service powered by AWS PrivateLink: https://docs.aws.amazon.com/vpc/latest/privatelink/create-endpoint-service.html
- Configure an endpoint service: https://docs.aws.amazon.com/vpc/latest/privatelink/configure-endpoint-service.html
- Control access to VPC endpoints using endpoint policies: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- Manage DNS names for VPC endpoint services: https://docs.aws.amazon.com/vpc/latest/privatelink/manage-dns-names.html
- AWS CLI create-vpc-endpoint-service-configuration: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint-service-configuration.html
- AWS CLI modify-vpc-endpoint-service-permissions: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-endpoint-service-permissions.html
- AWS CLI create-vpc-endpoint: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI describe-vpc-endpoint-connections: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoint-connections.html
- AWS CloudFormation AWS::EC2::VPCEndpointService: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpointservice.html
- AWS CloudFormation AWS::EC2::VPCEndpointServicePermissions: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpointservicepermissions.html
- AWS CloudFormation AWS::ElasticLoadBalancingV2::TargetGroup: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticloadbalancingv2-targetgroup.html
- Use an Application Load Balancer as a target of a Network Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/application-load-balancer-target.html

## Issues Found
- The post said PrivateLink only works with NLBs. AWS endpoint services can be backed by a Network Load Balancer or a Gateway Load Balancer, while this tutorial's interface endpoint service pattern uses an NLB and does not use an ALB directly. Updated the wording to make that distinction accurate.
- The post labeled `arn:aws:iam::*:root` as allowing all accounts in an organization. AWS documents all-principal access as `*`, and organization-wide allow-listing is not represented by that wildcard IAM root ARN in the endpoint service permissions examples. Updated the example to `*` and added a caution about using it.
- The security best practices section said consumer endpoint policies restrict what actions the endpoint can perform. AWS documents endpoint policies for AWS service endpoints and states that endpoints for non-AWS endpoint services allow full access. Updated the guidance to scope endpoint policies to AWS service endpoints and recommend provider permissions, manual acceptance, security groups, and application authentication for owned services.

## Review Notes
The remaining AWS CLI command shapes, DNS/private DNS explanation, CloudFormation resource names, service-name output pattern, and ALB-as-NLB-target note match current AWS documentation. The local AWS CLI was not installed in this workspace, so command verification was performed against official AWS CLI documentation rather than local `aws help` output.
