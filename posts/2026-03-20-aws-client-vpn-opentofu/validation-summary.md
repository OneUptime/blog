# Validation Summary: How to Configure AWS Client VPN with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Client VPN
- AWS Certificate Manager (ACM)
- OpenTofu
- AWS CLI
- Amazon CloudWatch Logs
- Amazon VPC and security groups

## Sources Consulted
- AWS Client VPN mutual authentication: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/mutual.html
- Create an AWS Client VPN endpoint: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoint-create.html
- AWS Client VPN authorization rules: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html
- AWS Client VPN routes: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS Client VPN maximum VPN session duration timeout: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-max-duration.html
- Export the AWS Client VPN client configuration file: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/export-client-config-file.html
- AWS Client VPN endpoint configuration file export: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-endpoint-export.html
- AWS CLI `export-client-vpn-client-configuration`: https://docs.aws.amazon.com/cli/latest/reference/ec2/export-client-vpn-client-configuration.html
- AWS CLI `create-client-vpn-endpoint`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-endpoint.html
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_ec2_client_vpn_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_endpoint
- AWS provider `aws_ec2_client_vpn_network_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_client_vpn_network_association

## Issues Found
- The post said both server and client certificates must be imported into ACM for mutual TLS. I corrected this because AWS only requires a separate client certificate ARN when the client certificate was issued by a different CA than the server certificate.
- The post implied that `session_timeout_hours = 8` by itself forces periodic re-authentication. I corrected this by adding `disconnect_on_session_timeout = true` and updating the explanation, because AWS otherwise attempts automatic reconnect on session timeout.
- The deployment step said to add only the client certificate to the exported `.ovpn` file. I corrected this to require both the client certificate and the client private key for mutual TLS, which AWS documents as mandatory.

## Review Notes
- For access to the VPC CIDR, the post does not need explicit `aws_ec2_client_vpn_route` resources because AWS adds a VPC route when a target subnet is associated. If the endpoint is later used for peered VPCs, on-premises networks, or internet egress, additional Client VPN routes and matching authorization rules will be required for each associated subnet.
