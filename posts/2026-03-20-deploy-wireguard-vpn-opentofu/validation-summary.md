# Validation Summary: How to Deploy Wireguard VPN with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS Elastic IP
- AWS Security Groups
- AWS Secrets Manager
- WireGuard
- Ubuntu cloud-init user data
- Bash

## Sources Consulted
- OpenTofu `templatefile` function: https://github.com/opentofu/opentofu/blob/main/website/docs/language/functions/templatefile.mdx
- OpenTofu `cidrhost` function: https://github.com/opentofu/opentofu/blob/main/website/docs/language/functions/cidrhost.mdx
- OpenTofu output values and sensitive data in state: https://github.com/opentofu/opentofu/blob/main/website/docs/language/values/outputs.mdx and https://github.com/opentofu/opentofu/blob/main/website/docs/language/state/sensitive-data.mdx
- AWS provider `aws_eip` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eip.html.markdown
- AWS provider `aws_instance` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- AWS provider `aws_ami` data source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/ami.html.markdown
- AWS provider `aws_security_group` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_secretsmanager_secret_version` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- WireGuard provider `wireguard_asymmetric_key` resource docs: https://github.com/OJFord/terraform-provider-wireguard/blob/master/docs/resources/asymmetric_key.md
- WireGuard `wg-quick(8)` man page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- Ubuntu on AWS image lookup docs: https://documentation.ubuntu.com/aws/en/latest/aws-how-to/instances/find-ubuntu-images/
- AWS EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS source/destination check guidance for NAT instances: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- AWS Route 53 VPC Resolver and AmazonProvidedDNS docs: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html and https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Ubuntu networking docs on predictable interface names: https://documentation.ubuntu.com/server/explanation/networking/configuring-networks/

## Issues Found
- The Canonical Ubuntu 22.04 AMI name filter omitted `jammy`, which does not match Canonical’s documented EC2 image naming pattern. I updated the filter to `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`.
- The post pinned the `OJFord/wireguard` provider to `~> 0.3` even though the current provider release is 0.4.x. I updated the version constraint to `~> 0.4`.
- The WireGuard NAT rules hardcoded `eth0`. Ubuntu uses predictable interface names, so the primary EC2 interface is not guaranteed to be `eth0`. I updated the script to detect the default egress interface at boot and use that interface in `PostUp` and `PostDown`.
- The script wrote `/etc/wireguard/wg0.conf` without tightening file permissions even though it contains the server private key. I added explicit directory creation and `chmod 600` for the config file.
- The generated client config used the EC2 instance private IP as `DNS`, but the post never configures the instance to run a DNS resolver. I changed it to use the AWS VPC resolver address derived from `cidrhost(var.vpc_cidr, 2)`.
- The conclusion overstated key-handling security. Provider-generated private keys, Secrets Manager secret values, and EC2 `user_data` are still exposed through OpenTofu state or instance metadata. I rewrote that wording to reflect the actual exposure model.

## Review Notes
- The `DNS = ${cidrhost(var.vpc_cidr, 2)}` line assumes `var.vpc_cidr` is the VPC’s primary IPv4 CIDR. If the VPC uses custom DHCP option sets or another DNS design, that value should be adjusted.
- Inline `ingress` and `egress` blocks in `aws_security_group` are still valid, but current AWS provider docs recommend dedicated `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for newer configurations. I left that structure unchanged to avoid unnecessary rewrites.
- `tofu` and `terraform` were not installed in the workspace, so the review was completed by checking the post against official documentation rather than running `validate`.
