# Validation Summary: How to Set Up Amazon Lightsail for Simple Web Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Lightsail
- AWS CLI
- Lightsail DNS and static IPs
- Lightsail instance firewalls
- SSH
- Node.js
- PM2
- Nginx
- Certbot and Let's Encrypt

## Sources Consulted
- AWS CLI Command Reference: create-instances: https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-instances.html
- AWS CLI Command Reference: get-blueprints: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-blueprints.html
- AWS CLI Command Reference: create-domain-entry: https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-domain-entry.html
- AWS CLI Command Reference: open-instance-public-ports: https://docs.aws.amazon.com/cli/latest/reference/lightsail/open-instance-public-ports.html
- AWS CLI Command Reference: get-instance-metric-data: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-instance-metric-data.html
- AWS CLI Command Reference: put-alarm: https://docs.aws.amazon.com/cli/latest/reference/lightsail/put-alarm.html
- AWS CLI Command Reference: download-default-key-pair: https://docs.aws.amazon.com/cli/latest/reference/lightsail/download-default-key-pair.html
- Amazon Lightsail instance bundles: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- Amazon Lightsail pricing: https://aws.amazon.com/lightsail/pricing/
- Amazon Lightsail billing and static IP FAQ: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html
- Amazon Lightsail firewall documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html
- Amazon Lightsail SSH documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-ssh-using-terminal.html
- PM2 startup script documentation: https://pm2.keymetrics.io/docs/usage/startup/

## Issues Found
- The post said each plan includes a static IP address. Updated this to public IP addressing, because static IPv4 addresses are allocated separately and cannot be attached to IPv6-only instances.
- The pricing section mixed older public IPv4 prices and vCPU counts with current Lightsail pricing. Updated the text to distinguish IPv6-only pricing from public IPv4 pricing and corrected the plan table for Linux bundles with public IPv4 addressing.
- The static IP section implied static IPs are free only when attached to a running instance. Updated it to match AWS documentation: they are free when attached to an instance, and static IPv4 addresses cannot attach to IPv6-only instances.
- The firewall section described one default rule set as universal. Updated it to note that default firewall rules vary by blueprint.
- The Lightsail DNS CLI commands omitted the documented `us-east-1` region requirement for Lightsail domain-related API operations. Added `--region us-east-1` to the DNS commands.
- The SSH and deployment commands used the `ubuntu` user for a Node.js blueprint instance. Updated them to use the `bitnami` user and `/home/bitnami`, matching Lightsail guidance for Bitnami blueprints.
- The PM2 startup command was incomplete for configuring a systemd service for the non-root user. Updated it to include the user and home path.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI syntax was verified against the official AWS CLI command reference instead of local `aws --help` output.
