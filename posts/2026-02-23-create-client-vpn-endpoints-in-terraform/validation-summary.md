# Validation Summary: How to Create Client VPN Endpoints in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- AWS Client VPN
- AWS Certificate Manager
- AWS Directory Service
- AWS IAM SAML identity providers
- Amazon CloudWatch Logs
- Amazon VPC networking

## Sources Consulted
- AWS Client VPN: Client authentication in AWS Client VPN: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html
- AWS Client VPN: Mutual authentication in AWS Client VPN: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/mutual.html
- AWS Client VPN: Enable mutual authentication: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-auth-mutual-enable.html
- AWS Client VPN: Client authorization in AWS Client VPN: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authorization.html
- AWS Client VPN: AWS Client VPN routes: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS Client VPN: How AWS Client VPN works: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/how-it-works.html
- AWS Client VPN: Connection logging: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/connection-logging.html
- Terraform AWS Provider: aws_ec2_client_vpn_endpoint: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- Terraform AWS Provider: aws_ec2_client_vpn_authorization_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_authorization_rule

## Issues Found
- The prerequisite list described "Active Directory or SAML IdP" as being for federated authentication. Active Directory authentication is directory-based, while SAML is federated. Updated the wording to distinguish the two authentication types.
- The certificate example referred to importing a "client root certificate" and used `client-root` file names. Terraform's `root_certificate_chain_arn` points to an ACM-provisioned client certificate ARN for certificate authentication, and AWS examples import a client certificate and key. Updated the example to use a client certificate resource and `client1` file names.
- The basic endpoint example said "Use TCP" but configured `transport_protocol = "udp"`. Updated the comment to state that UDP is the default and TCP can be used where UDP is blocked.
- The connection logging best practice said CloudWatch logs show "what they accessed." AWS Client VPN connection logs capture connection events and connection-level byte and packet counts, not per-resource access details. Updated the text to match the documented log fields.

## Review Notes
- The AWS provider constraint `~> 5.0` is not the latest major provider line as of this review, but the referenced resources and arguments are valid for the documented provider behavior.
- For additional routes such as peered VPC or internet routes, AWS recommends keeping route sets consistent across associated subnets to avoid intermittent access.
