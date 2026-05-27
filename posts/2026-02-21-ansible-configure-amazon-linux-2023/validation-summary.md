# Validation Summary: How to Use Ansible to Configure Amazon Linux 2023

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Linux 2023
- Ansible
- DNF package management
- SELinux
- AWS CLI v2
- AWS Systems Manager Agent
- Amazon CloudWatch Agent
- firewalld
- systemd
- Linux sysctl and SSH configuration

## Sources Consulted
- Amazon Linux 2023 User Guide: Relationship to Fedora: https://docs.aws.amazon.com/linux/al2023/ug/relationship-to-fedora.html
- Amazon Linux 2023 User Guide: Comparing AL2 and AL2023: https://docs.aws.amazon.com/linux/al2023/ug/compare-with-al2.html
- Amazon Linux 2023 User Guide: Package management tool: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Amazon Linux 2023 User Guide: Manage package and operating system updates in AL2023: https://docs.aws.amazon.com/linux/al2023/ug/managing-repos-os-updates.html
- Amazon Linux 2023 User Guide: SELinux: https://docs.aws.amazon.com/linux/al2023/ug/selinux.html
- Amazon Linux 2023 User Guide: Extra Packages for Enterprise Linux (EPEL): https://docs.aws.amazon.com/linux/al2023/ug/epel.html
- Amazon Linux 2023 User Guide: AWS CLI v2: https://docs.aws.amazon.com/linux/al2023/ug/awscli2.html
- AWS Systems Manager User Guide: Manually installing SSM Agent on Amazon Linux 2 and Amazon Linux 2023 instances: https://docs.aws.amazon.com/systems-manager/latest/userguide/agent-install-al2.html
- Amazon CloudWatch User Guide: Download the CloudWatch agent package: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-cloudwatch-agent-commandline.html
- Ansible documentation: ansible.builtin.dnf: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: ansible.posix.selinux: https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html
- Ansible documentation: ansible.posix.firewalld: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible documentation: community.general.timezone: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: ansible.builtin.hostname: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html

## Issues Found
- Corrected the description of AL2023's upstream base. AWS documents AL2023 as sourced from multiple upstreams, including Fedora and CentOS Stream, with its own lifecycle, not simply "based on Fedora."
- Replaced the EPEL claim with the official AL2023 guidance: there is no binary-compatible EPEL repository for AL2023; users should use AL2023 packages or Supplementary Packages for Amazon Linux where appropriate.
- Changed the networking difference from `systemd-resolved for DNS` to `systemd-networkd for network configuration`, matching the AL2023 comparison documentation.
- Fixed the AWS CLI package name from `aws-cli-2` to `awscli-2`, which is the package name shown in AL2023 release notes.
- Renamed the hostname task from "Set hostname from EC2 tag" to "Set hostname from inventory name" because the task uses `inventory_hostname`, not EC2 tag data.
- Replaced the invalid `dnf releasever --set 2023.3.20240312` example with `dnf upgrade --releasever=2023.3.20240312`, matching AWS documentation for deterministic updates.
- Clarified the AWS integration section so it does not imply that the CloudWatch agent is preinstalled. AWS documents AWS CLI v2 as shipped with AL2023, SSM Agent as usually preinstalled on AWS-provided AL2023 AMIs, and CloudWatch Agent as an installable package.

## Review Notes
The Ansible snippets use valid module names and parameters, but they depend on collections that are not part of ansible-core, including `ansible.posix` and `community.general`. The CloudWatch agent configuration also requires an instance role with appropriate CloudWatch permissions, which is operationally important but outside the narrow syntax corrections made here.
