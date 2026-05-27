# Validation Summary: How to Use Ansible with Azure Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Azure Automation
- Azure Automation Hybrid Runbook Worker
- Azure Key Vault
- Azure Resource Manager modules in `azure.azcollection`
- Ansible core and community modules

## Sources Consulted
- Ansible `azure.azcollection.azure_rm_resourcegroup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_resourcegroup_module.html
- Ansible `azure.azcollection.azure_rm_virtualnetwork` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualnetwork_module.html
- Ansible `azure.azcollection.azure_rm_subnet` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_subnet_module.html
- Ansible `azure.azcollection.azure_rm_virtualmachine` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_module.html
- Ansible `azure.azcollection.azure_rm_keyvaultsecret_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_keyvaultsecret_info_module.html
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Microsoft Azure Automation overview: https://learn.microsoft.com/en-us/azure/automation/overview
- Microsoft Azure Automation runbook types: https://learn.microsoft.com/en-us/azure/automation/automation-runbook-types
- Microsoft Azure Automation Hybrid Runbook Worker overview: https://learn.microsoft.com/en-us/azure/automation/automation-hybrid-runbook-worker

## Issues Found
- The Azure VM example created a virtual network but no subnet, while `azure_rm_virtualmachine` requires a resource group containing a VNet with at least one subnet. Added an `azure.azcollection.azure_rm_subnet` task.
- The Azure VM example relied on implicit VNet/subnet selection. Added `virtual_network` and `subnet` to make the VM use the network resources created by the playbook.
- The Ubuntu Marketplace image reference used the older `UbuntuServer` offer and `22_04-lts` SKU. Updated it to the current Canonical Jammy offer/SKU pattern shown in the Ansible Azure VM documentation: `0001-com-ubuntu-server-jammy` and `22_04-lts-gen2`.
- The timezone example used `ansible.builtin.timezone`, but current Ansible documentation places the timezone module in `community.general`. Updated it to `community.general.timezone`.
- The SSH handler used `sshd` unconditionally, which is not the service name on Debian/Ubuntu systems. Updated the handler to use `ssh` on Debian-family systems and `sshd` otherwise.
- The key takeaway claimed the Azure collection provides modules for managing all Azure resources. Narrowed this to "many Azure resources" to avoid overstating module coverage.
- The common-use-cases introduction referred to "this module" even though the post covers several modules and patterns. Updated the wording to refer to "these patterns."

## Review Notes
The Azure Automation discussion is accurate at a high level, but the post does not include a concrete Azure Automation runbook trigger example. A future revision could add an explicit REST API or Azure SDK example for starting Automation runbooks from Ansible.
