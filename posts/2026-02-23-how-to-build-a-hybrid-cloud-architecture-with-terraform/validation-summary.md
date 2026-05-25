# Validation Summary: How to Build a Hybrid Cloud Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Terraform
- AWS Site-to-Site VPN
- AWS Transit Gateway
- AWS Direct Connect
- Amazon Route 53 Resolver
- Amazon S3
- AWS DataSync
- AWS Database Migration Service
- Amazon CloudWatch
- AWS Systems Manager Parameter Store
- Amazon SNS
- VMware and Active Directory providers

## Sources Consulted
- Terraform AWS provider documentation for `aws_vpn_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- AWS Site-to-Site VPN CloudWatch metrics documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html
- Terraform AWS provider documentation for `aws_ec2_transit_gateway` and VPC attachments: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS Direct Connect transit gateway association documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-transit-gateways.html
- AWS Direct Connect transit virtual interface documentation: https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html
- Terraform AWS provider documentation for `aws_dx_transit_virtual_interface`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_transit_virtual_interface
- Terraform AWS provider documentation for `aws_dx_gateway_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dx_gateway_association
- Terraform AWS provider documentation for `aws_route53_zone`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- Terraform AWS provider documentation for `aws_route53_resolver_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- Terraform AWS provider documentation for `aws_datasync_task`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/datasync_task
- Terraform AWS provider documentation for `aws_dms_replication_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_replication_instance
- AWS CloudWatch agent configuration documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The Direct Connect example associated a Direct Connect gateway with a Transit Gateway but created an `aws_dx_private_virtual_interface`. AWS Direct Connect documentation states that Transit Gateway connectivity through a Direct Connect gateway uses a transit virtual interface, and AWS also disallows attaching a Direct Connect gateway to a Transit Gateway when it is attached to a private virtual interface. Changed the resource to `aws_dx_transit_virtual_interface`.
- The Direct Connect gateway used `amazon_side_asn = 64512`, the same ASN as the Transit Gateway in the previous section. AWS Direct Connect documentation states that the Direct Connect gateway ASN and Transit Gateway ASN must be different for this association. Changed the Direct Connect gateway ASN to `64513`.

## Review Notes
- The snippets are illustrative and reference supporting resources such as VPCs, subnets, route tables, security groups, IAM roles, and DMS subnet groups that are not fully defined in the post.
- The Transit Gateway custom route tables are shown but not associated or populated with route table association/propagation resources. This is not syntactically incorrect, but a production implementation would need explicit route table design.
