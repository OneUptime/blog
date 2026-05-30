# Validation Summary: How to Write Ansible Playbooks for Provisioning Azure Virtual Machines at Scale

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Azure Resource Manager
- azure.azcollection
- Azure Virtual Machines
- Azure dynamic inventory
- Ansible async tasks
- Ansible roles
- Ubuntu package management
- Azure Monitor Agent

## Sources Consulted
- Ansible azure.azcollection collection index: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/index.html
- Ansible azure_rm_resourcegroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_resourcegroup_module.html
- Ansible azure_rm_virtualnetwork module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualnetwork_module.html
- Ansible azure_rm_subnet module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_subnet_module.html
- Ansible azure_rm_securitygroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_securitygroup_module.html
- Ansible azure_rm_networkinterface module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_networkinterface_module.html
- Ansible azure_rm_virtualmachine module documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_virtualmachine_module.html
- Ansible azure_rm inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- Ansible async_status module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Microsoft Learn Azure Linux VM image documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/tutorial-manage-vm

## Issues Found
- The dynamic inventory example used `include_vm_resource_groups: "rg-myapp-*"`, but the official plugin documentation describes explicit resource-group names and the special `"*"` value, not general glob matching. I changed the example to list explicit staging and production resource groups.
- The dynamic inventory snippet said it only included running VMs, but `conditional_groups` creates groups and does not filter hosts. I added an `include_host_filters` expression that filters to running VMs tagged as managed by Ansible, and changed the `running` group to target the already-filtered hosts.
- The scaling section described Ansible's default execution as serial. Ansible's default `forks` value is 5, so I changed the wording to say the default fork count can be too low at larger scale.

## Review Notes
- The Azure module parameters, service-principal environment variables, async task pattern, Azure VM image fields, and Ansible configuration keys matched current official documentation.
- The Azure Monitor Agent shell install URL appears plausible, but Microsoft generally recommends managing Azure VM agents through Azure extensions or policy for production deployments.
