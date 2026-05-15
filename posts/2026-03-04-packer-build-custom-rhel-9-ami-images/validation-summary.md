# Validation Summary: How to Use Packer to Build Custom RHEL AMI Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- HashiCorp Packer
- Packer Amazon EBS builder
- Amazon EC2 AMIs
- AWS Systems Manager Agent
- OpenSSH server configuration
- Terraform AWS provider
- AWS CLI

## Sources Consulted
- HashiCorp Packer install documentation: https://developer.hashicorp.com/packer/install
- HashiCorp Packer Amazon EBS builder documentation: https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs
- HashiCorp Packer command and machine-readable output documentation: https://developer.hashicorp.com/packer/docs/commands
- HashiCorp Packer plugin installation documentation: https://developer.hashicorp.com/packer/docs/plugins/install
- AWS Systems Manager documentation for installing SSM Agent on RHEL 8, 9, and 10: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-rhel-8-9.html
- AWS EC2 documentation for RHEL AMI users: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- Red Hat documentation for identifying official RHEL AMIs on Amazon EC2: https://access.redhat.com/solutions/99333
- Red Hat documentation for listing RHEL images on AWS: https://access.redhat.com/solutions/15356
- OpenSSH release notes: https://www.openssh.com/releasenotes.html
- OpenSSH sshd_config manual: https://man.openbsd.org/sshd_config.5
- Terraform AWS provider aws_ami data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider aws_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The Packer installation commands used `dnf config-manager --add-repo` directly. HashiCorp's current RHEL package-manager instructions install `yum-utils`, use `yum-config-manager --add-repo`, and install with `yum`. Updated the commands to match the official RHEL instructions.
- The Packer provisioner installed SSM Agent with `sudo dnf install -y amazon-ssm-agent`. AWS documents RHEL 8, 9, and 10 installation using the SSM Agent RPM URL because AWS-provided RHEL AMIs do not include SSM Agent by default. Updated the command to install the x86_64 RPM URL that matches the x86_64 source AMI filter.
- The sample `sshd_config` included `Protocol 2`. OpenSSH removed SSH protocol 1 support and associated configuration options in OpenSSH 7.6; RHEL 9 uses OpenSSH 8.7 and supports only SSH protocol 2. Removed the obsolete directive.

## Review Notes
- The Packer HCL structure, Amazon EBS builder settings, Red Hat owner ID, `ec2-user` SSH username, Terraform `aws_ami` lookup, and `packer build -machine-readable` artifact parsing pattern are consistent with the consulted documentation.
- Packer 1.14 and newer can install HashiCorp-maintained plugins from HashiCorp releases while preserving existing `github.com/hashicorp/amazon` plugin source declarations, so the plugin block was left unchanged.
