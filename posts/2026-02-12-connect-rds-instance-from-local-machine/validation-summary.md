# Validation Summary: How to Connect to an RDS Instance from a Local Machine

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon RDS
- Amazon EC2
- AWS Security Groups
- SSH local port forwarding
- AWS Systems Manager Session Manager
- AWS Client VPN
- EC2 Instance Connect Endpoint
- PostgreSQL, MySQL, and SQL Server command-line clients
- GUI database tools with SSH tunneling
- VPC Reachability Analyzer

## Sources Consulted
- AWS RDS documentation: Setting up public or private access in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/security-public-private.html
- AWS Systems Manager documentation: Start a Session Manager port forwarding session to a remote host: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS Systems Manager documentation: Enabling and disabling session logging: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager documentation: Logging session activity with CloudTrail: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html
- Amazon EC2 documentation: Reference the latest AMIs using Systems Manager public parameters: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami-parameter-store.html
- Amazon Linux 2023 documentation: Launching AL2023 using the SSM parameter and AWS CLI: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- AWS Client VPN documentation: Client authentication in AWS Client VPN: https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/client-authentication.html
- AWS CLI Command Reference: ec2-instance-connect open-tunnel: https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/open-tunnel.html
- Amazon RDS for PostgreSQL documentation: Using SSL with a PostgreSQL DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- MySQL documentation: mysql client SSL options: https://dev.mysql.com/doc/refman/9.0/en/mysql-command-options.html

## Issues Found
- The bastion launch example used a fixed AMI ID, which is Region-specific and can become stale. Changed it to use the Amazon Linux 2023 public SSM AMI parameter with `resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64`.
- The Session Manager section said port forwarding works with "no bastion needed" but did not clearly state that a managed EC2 instance is still the forwarding target. Clarified that it uses an SSM-managed EC2 instance without opening SSH access or running a public bastion host.
- The Session Manager benefits said "All sessions are logged in CloudTrail." CloudTrail logs Session Manager API calls, while session data logging is not available for port forwarding sessions. Changed the wording to "Session API calls are logged in CloudTrail."
- The Client VPN setup list implied that certificate authority creation is always the first step. AWS Client VPN supports mutual authentication, Active Directory authentication, and SAML-based federated authentication. Updated the wording to choose an authentication method first.
- The Client VPN section said everyone gets VPN access with their own certificates. That is only true for certificate-based mutual authentication. Changed it to refer to the chosen authentication method.
- The troubleshooting section recommended `--ssl-mode=require` for PostgreSQL, which is not the standard `psql` syntax. Changed it to `sslmode=require` in the PostgreSQL connection string. Also updated the MySQL example to the current `--ssl-mode=REQUIRED` option.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder IDs, subnets, security groups, hostnames, and private IPs. The EC2 Instance Connect Endpoint section is technically accurate for private-IP tunnels, but users should verify that their AWS CLI v2 version includes `ec2-instance-connect open-tunnel` and that security groups and routing allow traffic from the endpoint to the target private IP.
