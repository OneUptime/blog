# Validation Summary: How to Create Azure Dynamic Inventory in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible dynamic inventory
- azure.azcollection Azure Resource Manager inventory plugin
- Azure Resource Manager virtual machines and virtual machine scale sets
- Azure CLI
- Azure RBAC
- YAML inventory configuration

## Sources Consulted
- Ansible azure.azcollection.azure_rm inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- Ansible azure.azcollection repository and requirements documentation: https://github.com/ansible-collections/azure
- Ansible azure.azcollection azure_rm inventory plugin source: https://raw.githubusercontent.com/ansible-collections/azure/dev/plugins/inventory/azure_rm.py
- Ansible ansible-inventory CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-inventory.html
- Microsoft Azure CLI az role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Azure RBAC role assignment with Azure CLI documentation: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Azure CLI az vm update documentation: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest

## Issues Found
- The dependency installation command listed only a subset of Azure SDK packages. Updated it to install the collection's official `requirements.txt`, which is the documented installation path for azure.azcollection dependencies.
- The resource group filtering example used a non-existent `exclude_vm_resource_groups` option. Replaced it with `exclude_host_filters` using the documented host filtering mechanism.
- Several examples used `rg-production-*` in `include_vm_resource_groups`. The plugin documents exact resource group names plus the special `*` value for all groups, so these examples now use explicit resource group names.
- The post used `vm_size`, but the current plugin host variable is `virtual_machine_size`. Updated keyed groups and composed variables accordingly.
- The post used `public_ipv4_addresses`, but the current plugin host variable is `public_ipv4_address`. Updated host expressions and compose examples accordingly.
- The hostname section described private IP connection behavior but only set `plain_host_names`, which controls generated inventory hostnames. Added the documented `hostnames` option and moved private IP connection selection into `hostvar_expressions`.
- The production example used `default_host_filters: powerstate == 'running'`, which would exclude running hosts because host filters are exclusion expressions. Replaced it with `exclude_host_filters: powerstate != 'running'`.
- The credential-file authentication example included an unsupported `credential_file` option. Removed it and left `auth_source: credential_file`, which reads from `~/.azure/credentials` per the plugin docs.
- The role assignment command used `--assignee` with a client ID. Updated it to the Microsoft-documented service-principal object ID form using `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`.
- The closing sentence referred to the constructed plugin; the examples use constructed inventory features exposed by the Azure inventory plugin. Updated the wording to avoid implying a separate plugin is required.

## Review Notes
The examples are now aligned with azure.azcollection 3.18.0 documentation and the current plugin source available on May 26, 2026. The local environment did not have `ansible-inventory`, `ansible-doc`, or `az` installed, so command verification was performed against official documentation rather than local help output.
