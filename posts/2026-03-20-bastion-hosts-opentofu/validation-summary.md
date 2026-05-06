# Validation Summary: How to Deploy Bastion Hosts with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS Security Groups
- OpenSSH

## Sources Consulted
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Amazon EC2 SSH connection guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-linux-instance.html
- Amazon EC2 default Linux usernames: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man1/ssh.1
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/OpenBSD-7.4/ssh_config

## Issues Found
- The original SSH example used a direct `ssh -J ...` command while the config example used separate identity files for the bastion and private instance. OpenSSH documents that destination-host configuration is not generally applied to jump hosts, so the example could fail as written. I replaced it with a `~/.ssh/config` example that defines both `bastion` and `private-instance`, then connects with `ssh private-instance`.
- The summary said ProxyJump works "without storing private instance IPs." ProxyJump still requires a destination hostname, private IP, or configured alias. I corrected the sentence to explain that ProxyJump tunnels through the bastion without exposing private instances directly to the internet.

## Review Notes
- No remaining technical issues found after the fixes above.
- The AWS provider currently recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new configurations instead of inline security group rules. The post's inline rules remain valid, so this is a best-practice note rather than a correctness issue.
