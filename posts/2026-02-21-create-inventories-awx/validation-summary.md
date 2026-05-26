# Validation Summary: How to Create Inventories in AWX

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX / Automation Platform Controller inventories
- awx.awx Ansible collection
- AWX REST API
- Static inventories
- Dynamic inventory sources
- Smart inventories
- Constructed inventories
- AWS EC2 inventory plugin
- Azure Resource Manager inventory plugin

## Sources Consulted
- AWX inventories user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- awx.awx.inventory module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/inventory_module.html
- awx.awx.inventory_source module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/inventory_source_module.html
- awx.awx.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/group_module.html
- awx.awx.host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/awx/awx/host_module.html
- AWX OpenAPI reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- azure.azcollection.azure_rm inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html

## Issues Found
- The Azure dynamic inventory example used `compose`, which is valid for constructed-style inventory plugins such as AWS EC2 but not the current Azure Resource Manager inventory plugin. Changed it to `hostvar_expressions`, which is the documented Azure option for setting computed host variables such as `ansible_host`.
- The nested group example placed `us_east` under `webservers_east`, reversing the hierarchy shown in the diagram. Changed the example to create `webservers_east` first and then update `us_east` with `children: ["webservers_east"]`.
- The constructed inventory example did not specify `input_inventories`, which are the documented source inventories for a constructed inventory. Added representative input inventories.
- The constructed inventory source example used `source: "constructed"`, but the current `awx.awx.inventory_source` module source choices do not include `constructed`; constructed inventories instead have an auto-created inventory source configured with `source_vars`. Updated the example to target the auto-created source name and set `plugin: constructed` in `source_vars`.

## Review Notes
- Smart inventories are technically valid but are documented as deprecated in current AWX documentation; constructed inventories are the recommended replacement for new use cases.
- The AWX examples assume the referenced organization, credentials, inventories, groups, and numeric API IDs already exist or are replaced with values from the user's AWX instance.
