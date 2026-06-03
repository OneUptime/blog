# Validation Summary: How to Create a Bastion Host for Secure EC2 Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Amazon VPC, subnets, route tables, and internet gateways
- EC2 security groups
- Elastic IP addresses
- Amazon Linux 2023
- OpenSSH, SSH agent forwarding, and ProxyJump
- fail2ban
- dnf-automatic
- Terraform AWS provider
- Amazon CloudWatch Agent
- AWS Systems Manager Session Manager
- EC2 Instance Connect Endpoint

## Sources Consulted
- AWS CLI Command Reference: `run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI User Guide: EC2 security groups - https://docs.aws.amazon.com/cli/latest/userguide/cli-ec2-sg.html
- AWS CLI Command Reference: `authorize-security-group-ingress` - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Amazon EC2 User Guide: public IPv4 addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-ip-addresses.html
- Amazon Linux documentation overview - https://docs.aws.amazon.com/linux/
- Amazon Linux 2023 release cadence - https://docs.aws.amazon.com/linux/al2023/ug/release-cadence.html
- Amazon Linux 2023 package list - https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- Amazon Linux 2023 security updates with DNF - https://docs.aws.amazon.com/linux/al2023/ug/security-inplace-update.html
- Amazon Linux 2023 systemd journal documentation - https://docs.aws.amazon.com/linux/al2023/ug/journald.html
- Amazon CloudWatch Agent configuration file documentation - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Amazon CloudWatch Agent start command documentation - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- Terraform AWS provider `aws_instance` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_eip` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- OpenSSH manual pages - https://www.openssh.org/manual.html

## Issues Found
- The hardening script used Amazon Linux 2-era package management commands (`yum`, `amazon-linux-extras`, and `yum-cron`) even though Amazon Linux 2023 is the current Amazon Linux generation. Updated the script to use `dnf`, install `fail2ban` from the AL2023 package set, and configure `dnf-automatic` with the systemd timer.
- The SSH hardening `sed` commands only matched uncommented `PermitRootLogin` and `PasswordAuthentication` directives. Updated them to handle commented defaults and append the directives if absent, then validate the SSH daemon configuration before restart.
- The fail2ban SSH jail used a fixed `/var/log/secure` path. Updated it to use the systemd backend, which is appropriate for current Amazon Linux systemd-based logging.
- The CloudWatch Agent snippet wrote a configuration file and then started the service directly. Updated it to start the agent with `amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:...`, which is the documented way to load a local configuration file.
- The CloudWatch Agent snippet collected `/var/log/secure`, but AL2023 does not install `rsyslog` by default. Added installation and startup of `rsyslog` before configuring the agent to ship that file.

## Review Notes
- The AWS CLI VPC, subnet, route table, security group, `run-instances`, and Elastic IP commands use valid current CLI options.
- The Terraform resource arguments shown for `aws_instance`, `metadata_options`, `root_block_device`, and `aws_eip` are valid in the current AWS provider documentation.
- SSH agent forwarding works as described, but it should be used carefully because a compromised bastion can interact with a forwarded agent while the session is active. ProxyJump is generally preferable where it satisfies the workflow.
