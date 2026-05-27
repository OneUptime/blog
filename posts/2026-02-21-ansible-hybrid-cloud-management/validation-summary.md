# Validation Summary: How to Use Ansible for Hybrid Cloud Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Ansible dynamic inventory plugins
- Amazon AWS Ansible collection
- Community AWS Ansible collection
- Azure Ansible collection
- UFW, SSH, cron, and Linux host configuration
- Prometheus node exporter textfile metrics

## Sources Consulted
- Ansible inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- azure.azcollection.azure_rm inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- azure.azcollection.azure_rm_virtualmachine module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_module.html
- amazon.aws.ec2_vpc_vgw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_vgw_module.html
- amazon.aws.ec2_vpc_vpn module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_vpn_module.html
- community.aws.ec2_customer_gateway module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ec2_customer_gateway_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- Added the missing `azure_databases` conditional inventory group so the database play target shown later in the post resolves for Azure database-tagged hosts.
- Updated the Azure Ubuntu image example from the older `UbuntuServer` offer and `22_04-lts` SKU to the current Canonical Jammy offer and Gen2 SKU pattern used for Ubuntu 22.04 marketplace images.
- Changed the AWS customer gateway task from `amazon.aws.ec2_customer_gateway` to `community.aws.ec2_customer_gateway`, because the current documented module lives in the `community.aws` collection.
- Corrected the VPN gateway return reference from `aws_vgw.vgw.vpn_gateway_id` to `aws_vgw.vgw.id`, matching the documented return value for `amazon.aws.ec2_vpc_vgw`.
- Replaced `ansible.builtin.timezone` with `community.general.timezone`, because timezone management is documented in the `community.general` collection in current Ansible documentation.
- Updated the monitoring label expression so it detects prefixed dynamic inventory groups such as `aws_webserver` and `azure_webservers`; checking for exact group names `aws` or `azure` would not match the groups created by the examples.
- Made the SSH service restart portable for Debian-family systems by using `ssh` there and `sshd` elsewhere.

## Review Notes
The examples are illustrative and still assume the required collections, Python SDKs, cloud credentials, virtual networks, subnets, and SSH keys already exist. I could not run `ansible-playbook --syntax-check` locally because Ansible is not installed in this environment.
