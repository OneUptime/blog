# Validation Summary: How to Configure RHEL for Multi-Cloud Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Multi-cloud infrastructure
- Terraform
- AWS EC2
- Azure Virtual Machines
- Google Compute Engine
- cloud-init
- Ansible
- DNF Automatic
- firewalld

## Sources Consulted
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform CLI `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform meta-arguments documentation for `count`: https://developer.hashicorp.com/terraform/language/meta-arguments
- cloud-init module reference for `package_update`, `packages`, `write_files`, and `runcmd`: https://docs.cloud-init.io/topics/modules.html
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible built-in module index for `lineinfile` and `service`: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Red Hat Enterprise Linux 9 DNF Automatic documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 security updates documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_and_monitoring_security_updates/Red_Hat_Enterprise_Linux-9-Managing_and_monitoring_security_updates-en-US.pdf
- Red Hat guidance for identifying official RHEL AMIs on Amazon EC2: https://access.redhat.com/solutions/99333
- Red Hat guidance for listing RHEL AMIs on AWS: https://access.redhat.com/solutions/15356
- AWS EC2 instance types documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html
- Azure VM sizes documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/overview
- Azure Dsv5-series VM size documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series
- Google Compute Engine general-purpose machine family documentation: https://cloud.google.com/compute/docs/general-purpose-machines

## Issues Found
- The Ansible task named "Configure automatic security updates" only set `apply_updates = yes`. Red Hat's RHEL 9 security update guidance also requires `upgrade_type = security` for security-only automatic updates, and DNF Automatic must be run periodically through a systemd timer. Added a task to set `upgrade_type = security` and a task to enable and start `dnf-automatic-install.timer`.
- The deployment command sequence used `cd terraform/aws`, followed by `cd terraform/azure` and `cd terraform/gcp`. When run as one shell sequence, the later paths would resolve relative to `terraform/aws` and fail. Updated the Azure and GCP commands to use `cd ../azure` and `cd ../gcp`.

## Review Notes
- The Terraform AWS resource and data source syntax is consistent with the current HashiCorp AWS provider documentation.
- The AWS AMI owner ID matches Red Hat's documented owner account for official RHEL AMIs, but production modules should pin or constrain AMI selection more tightly if reproducibility is required.
- The post only shows the AWS resource implementation while describing a multi-cloud module. That is acceptable for a high-level guide, but future revisions could add Azure and GCP resource examples for completeness.
