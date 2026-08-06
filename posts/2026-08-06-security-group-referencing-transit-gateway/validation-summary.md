# Validation Summary: Security Group Referencing Across Transit Gateway

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Amazon Web Services (AWS)
- AWS Transit Gateway
- Amazon VPC security groups
- Transit Gateway VPC attachments and route tables
- VPC peering, AWS PrivateLink, Gateway Load Balancer, and AWS Network Firewall
- VPC Flow Logs and network ACLs
- Amazon EFS
- VPC Encryption Control and Transit Gateway Encryption Support
- Terraform and the HashiCorp AWS provider

## Sources Consulted
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Amazon VPC security group rules and referencing](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html#security-group-referencing)
- [CreateTransitGatewayVpcAttachmentRequestOptions API reference](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateTransitGatewayVpcAttachmentRequestOptions.html)
- [Create a Transit Gateway VPC attachment](https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html)
- [Modify a Transit Gateway VPC attachment](https://docs.aws.amazon.com/vpc/latest/tgw/modify-vpc-attachment.html)
- [Update Transit Gateway security group inbound rules](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-sg-updates-update.html)
- [Identify Transit Gateway referenced security groups](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-sg-updates-identify.html)
- [DescribeSecurityGroupReferences API reference](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeSecurityGroupReferences.html)
- [AWS CLI describe-security-group-references reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-group-references.html)
- [Transit Gateway Encryption Support](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-encryption-support.html)
- [Shared Transit Gateway permissions and limitations](https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html)
- [VPC network ACL documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [VPC Flow Log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [Terraform AWS provider: aws_ec2_transit_gateway](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway)
- [Terraform AWS provider: aws_ec2_transit_gateway_vpc_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment)
- [Terraform AWS provider: aws_vpc_security_group_ingress_rule](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule)
- [Terraform moved blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)

## Issues Found
- The troubleshooting section said that `describe-security-group-references` identifies the security groups that reference another group. The operation actually returns the specified security group ID, the ID of a VPC containing a referencing security group, and the applicable peering connection or Transit Gateway ID; it does not return the referencing security group's ID. The sentence was corrected to say that the operation identifies VPCs containing rules that reference the specified group.

## Review Notes
- The Terraform resource types and arguments are current in the HashiCorp AWS provider, and the HCL snippets are syntactically valid. The snippets intentionally assume that the referenced variables and `aws_security_group.api` are declared elsewhere.
- AWS documents the Transit Gateway-level default as disabled and the VPC attachment creation default as enabled. Explicit configuration at both layers is therefore appropriate.
- Availability Zone, Local Zone, and service limitations can change independently of Terraform configuration, so the post's recommendation to recheck the current AWS limitations before rollout remains important.
