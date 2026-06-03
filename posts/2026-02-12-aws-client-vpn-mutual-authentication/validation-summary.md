# Validation Summary: How to Set Up an AWS Client VPN with Mutual Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Client VPN
- AWS Certificate Manager (ACM)
- AWS CLI
- AWS CDK / CloudFormation
- Easy-RSA / OpenVPN certificates
- CloudWatch Logs

## Sources Consulted
- AWS Client VPN mutual authentication documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/mutual.html
- AWS Client VPN mutual authentication setup with Easy-RSA: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-auth-mutual-enable.html
- AWS CLI `acm import-certificate` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/import-certificate.html
- AWS CLI `ec2 create-client-vpn-endpoint` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-endpoint.html
- AWS CLI `ec2 authorize-client-vpn-ingress` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-client-vpn-ingress.html
- AWS Client VPN route documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-routes.html
- AWS CLI `ec2 create-client-vpn-route` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-client-vpn-route.html
- AWS Client VPN client configuration export documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/export-client-config-file.html
- AWS Client VPN certificate revocation list documentation: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-certificates.html
- AWS CLI `ec2 import-client-vpn-client-certificate-revocation-list` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/import-client-vpn-client-certificate-revocation-list.html
- AWS CloudFormation `AWS::EC2::ClientVpnEndpoint` reference used by CDK L1 constructs: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-clientvpnendpoint.html
- AWS CloudFormation `CertificateAuthenticationRequest` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ec2-clientvpnendpoint-certificateauthenticationrequest.html

## Issues Found
- The Easy-RSA server certificate command omitted the SAN value used by AWS's documented Client VPN setup. Changed `./easyrsa build-server-full server nopass` to `./easyrsa --san=DNS:server build-server-full server nopass`.
- The post implied that the ClientRootCertificateChainArn should be a CA certificate ARN and used a `ca-cert-id` placeholder. AWS expects the ARN of the imported client certificate chain, or the server certificate ARN when the server and client certificates share the same CA. Updated CLI and CDK placeholders to `client-cert-id` and clarified the same-CA exception.
- The route section showed manually adding the VPC CIDR route after subnet association. AWS automatically adds the VPC route when a subnet is associated, so the section now focuses on additional routes such as peered VPCs.
- The route section associated two target subnets but showed an additional peered VPC route for only one subnet. AWS recommends identical route sets for each associated subnet to avoid intermittent access, so the example now adds the peered route for both subnets.
- The CRL import command used `fileb://pki/crl.pem`. AWS's command reference documents this parameter as a file string and uses `file://`, so the command was changed to `file://pki/crl.pem`.
- The revocation explanation said revoked certificates are blocked immediately. Importing a CRL resets existing client connections, and revoked certificates are blocked on subsequent authentication. Updated the wording to reflect that behavior.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the current official AWS CLI command reference instead of local `aws --help` output.
