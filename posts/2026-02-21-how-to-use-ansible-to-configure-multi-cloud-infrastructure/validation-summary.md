# Validation Summary: How to Use Ansible to Configure Multi-Cloud Infrastructure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- amazon.aws Ansible collection
- azure.azcollection Ansible collection
- google.cloud Ansible collection
- AWS EC2, VPC, subnets, and security groups
- Azure resource groups, virtual networks, subnets, network security groups, and virtual machines
- Google Cloud VPC, subnets, firewall rules, and Compute Engine instances
- Ansible Vault and cloud credential management

## Sources Consulted
- Ansible collection installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- amazon.aws.ec2_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.ec2_security_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_security_group_module.html
- azure.azcollection documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/index.html
- azure.azcollection.azure_rm_virtualmachine module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_module.html
- azure.azcollection.azure_rm_securitygroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_securitygroup_module.html
- azure.azcollection.azure_rm_subnet module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_subnet_module.html
- Microsoft Learn Azure Ansible installation guidance: https://learn.microsoft.com/en-us/azure/developer/ansible/install-on-linux-vm
- google.cloud.gcp_compute_network module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_network_module.html
- google.cloud.gcp_compute_subnetwork module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_subnetwork_module.html
- google.cloud.gcp_compute_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html
- ansible.builtin.import_playbook documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html

## Issues Found
- The Azure SDK installation command listed only a small subset of packages. Updated it to install the Azure collection's official `requirements.txt`.
- The Google Cloud SDK installation command installed `google-cloud-compute`, while the Ansible collection documents `requests` and `google-auth` as the required Python dependencies for these modules. Updated the command accordingly.
- AWS credential variables were shown but not used by the AWS play. Added environment variables consumed by the amazon.aws modules.
- The AWS EC2 example used a hard-coded, region-specific AMI ID. Replaced it with an `aws_ami_id` variable and added an `aws_availability_zone` variable instead of deriving the AZ from the region string.
- Azure credential variables were shown but not used by the Azure play. Added the documented Azure environment variables for service principal authentication.
- The Azure network security group was created but not associated with the subnet. Added an `azure_rm_subnet` update task that attaches the NSG.
- The GCP VPC task omitted `routing_mode`, which is required by the current `google.cloud.gcp_compute_network` module. Added `routing_mode: REGIONAL`.
- The GCP instance tags example used deprecated `tags.items`. Updated it to `tags.tag_values`.
- The configuration role attempted to start `chrony` without installing it and used a non-Debian fallback service name without installing or configuring that service. Added `chrony` to the package list and scoped the service task to Debian-family systems.
- The project structure omitted the `monitoring_agent` role that the configuration playbook referenced. Added it to the role tree.

## Review Notes
- The examples are structurally correct as tutorial snippets, but a real deployment still needs provider-specific values such as a valid AWS AMI ID, an existing EC2 key pair, and inventories populated with the newly created instances before `configure-all.yml` can run against `webservers`.
