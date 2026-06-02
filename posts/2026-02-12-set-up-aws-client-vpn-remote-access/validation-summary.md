# Validation Summary: How to Set Up AWS Client VPN for Remote Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Client VPN
- AWS CLI
- AWS Certificate Manager
- Amazon CloudWatch Logs
- OpenVPN / Easy-RSA
- SAML authentication
- AWS Systems Manager Session Manager

## Sources Consulted
- AWS Client VPN mutual authentication: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/mutual.html
- AWS Client VPN client authentication: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html
- AWS Client VPN getting started guide: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-getting-started.html
- AWS Client VPN routes: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS Client VPN split tunnel: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/split-tunnel-vpn.html
- AWS Client VPN connection logging: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-with-connection-logs.html
- AWS CLI create-client-vpn-endpoint reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-endpoint.html
- AWS CLI authorize-client-vpn-ingress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-client-vpn-ingress.html
- AWS CLI associate-client-vpn-target-network reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-client-vpn-target-network.html
- AWS CLI describe-client-vpn-connections reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-client-vpn-connections.html
- AWS VPN pricing: https://aws.amazon.com/vpn/pricing/

## Issues Found
- The endpoint creation example enabled connection logging before creating the CloudWatch Logs log group. AWS requires the log group to exist before enabling Client VPN connection logging, so the log group and stream creation commands were moved before `create-client-vpn-endpoint`.
- The certificate upload comment implied that importing the client certificate into ACM is always required for mutual authentication. AWS documents this as optional when server and client certificates use the same CA, so the comment was corrected.
- The route section said split tunnel requires manually adding a route to the VPC CIDR. AWS automatically adds the VPC route when a subnet is associated with the endpoint, so the section was corrected to cover additional networks and to add identical additional routes for both associated subnets.
- The SAML endpoint command omitted the required `--connection-log-options` parameter for `create-client-vpn-endpoint`. The example was updated to include the CloudWatch Logs configuration.
- The cost section calculated an active user at about $36/month while also stating 8 hours/day and 22 days/month. At $0.05/hour, that usage is $8.80/month, so the math was corrected.
- The cost section omitted current AWS pricing caveats for public IPv4 address, data transfer, and CloudWatch Logs charges. A concise bullet was added.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against current official AWS CLI and AWS Client VPN documentation rather than local `aws --help` output.
