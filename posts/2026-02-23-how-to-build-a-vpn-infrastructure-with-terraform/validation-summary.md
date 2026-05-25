# Validation Summary: How to Build a VPN Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Client VPN
- AWS Site-to-Site VPN
- AWS Transit Gateway
- AWS Certificate Manager
- AWS Private Certificate Authority
- Amazon CloudWatch
- Amazon VPC security groups and routing

## Sources Consulted
- Terraform AWS provider `aws_ec2_client_vpn_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Terraform AWS provider `aws_ec2_client_vpn_authorization_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule
- Terraform AWS provider `aws_ec2_client_vpn_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_route
- Terraform AWS provider `aws_vpn_connection` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- Terraform AWS provider `aws_acm_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider `aws_acmpca_certificate_authority` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate_authority
- Terraform AWS provider `aws_acmpca_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate
- Terraform AWS provider `aws_acmpca_certificate_authority_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acmpca_certificate_authority_certificate
- AWS Client VPN mutual authentication documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/mutual.html
- AWS Client VPN split-tunnel documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/split-tunnel-vpn.html
- AWS Client VPN routes documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS Client VPN authorization documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authorization.html
- AWS Site-to-Site VPN accelerated VPN documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/accelerated-vpn.html
- AWS Site-to-Site VPN CloudWatch monitoring documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/monitoring-cloudwatch-vpn.html

## Issues Found
- The ACM Private CA example created a root CA but did not install a CA certificate, leaving the CA in `PENDING_CERTIFICATE` and unable to issue certificates. Added `aws_acmpca_certificate`, `aws_acmpca_certificate_authority_certificate`, and `aws_partition` so the root CA is self-signed and activated before issuing the ACM server certificate.
- The Client VPN endpoint used the ACM PCA ARN for `root_certificate_chain_arn`. Terraform and AWS Client VPN require an ACM certificate ARN for certificate authentication. Changed it to use the server certificate ARN for the same-CA mutual authentication case documented by AWS.
- The optional internet access route was shown while split tunneling was always enabled and without the required `0.0.0.0/0` authorization rule. Changed `split_tunnel` to depend on `var.allow_internet_access` and added the matching authorization rule and subnet routing note.
- The Client VPN security group example implied UDP 443 ingress from the internet was required on the VPC security group. AWS applies this security group to the target network interfaces for controlling access to VPC resources; client connectivity to the managed endpoint is not opened with a VPC security group ingress rule. Removed the misleading ingress rule and clarified the description.
- The virtual private gateway Site-to-Site VPN example enabled acceleration, but AWS supports accelerated Site-to-Site VPN only for Transit Gateway VPN attachments. Removed `enable_acceleration` from the virtual private gateway example and kept it only in the Transit Gateway example with a clarifying comment.

## Review Notes
The post is technically valid after the corrections. Future improvements could include showing how to generate or distribute end-user client certificates and how target resource security groups should allow traffic from the Client VPN security group, but those are beyond the minimum corrections needed for accuracy.
