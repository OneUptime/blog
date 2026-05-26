# Validation Summary: How to Use AWX Inventory Sources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWX inventory sources
- Ansible Automation Platform controller API
- Ansible dynamic inventory plugins
- Amazon EC2 inventory
- VMware vCenter inventory
- Microsoft Azure Resource Manager inventory
- Project-sourced inventories
- AWX schedules and RRULEs

## Sources Consulted
- AWX inventory user guide: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- amazon.aws.aws_ec2 inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- community.vmware.vmware_vm_inventory documentation and VMware inventory filter guide: https://docs.ansible.com/ansible/latest/collections/community/vmware/vmware_vm_inventory_inventory.html and https://docs.ansible.com/ansible/3/scenario_guides/vmware_scenarios/vmware_inventory_filters.html
- azure.azcollection.azure_rm inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- ansible.builtin.constructed inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html
- awx.awx.inventory_source module documentation: https://ansible.readthedocs.io/projects/ansible/9/collections/awx/awx/inventory_source_module.html
- awx.awx.schedule module documentation: https://docs.ansible.com/ansible/latest/collections/awx/awx/schedule_module.html

## Issues Found
- The AWX source type list was missing current documented source types. Added Red Hat Insights, Terraform State, and OpenShift Virtualization, and changed "Ansible Controller" to the current "Red Hat Ansible Automation Platform" label.
- The AWS EC2 `source_vars` example used strings for `regions` and `filters`. Changed `regions` to a list and `filters` to the dictionary format expected by the `amazon.aws.aws_ec2` plugin.
- The VMware `filters` example used a dictionary, but the documented VMware inventory plugin expects filter expressions as strings. Changed it to a Jinja expression and aligned the keyed group with the `runtime.powerState` property included in the example.
- The Azure example used `private_ip_addresses`, which is not a documented host variable for the current `azure_rm` inventory plugin. Changed it to `private_ipv4_addresses`.
- The project-sourced inventory example used `update_on_project_update`, which is not documented as a current `awx.awx.inventory_source` field. Removed it and updated the explanation to describe `update_on_launch`.
- The sync status snippet labeled `last_job_run` as a sync result. Changed the output labels to show `last_job_run` and `last_job_failed`.

## Review Notes
The examples still use placeholder numeric IDs for organizations, credentials, projects, and inventory sources. That is acceptable for API examples, but readers must replace them with IDs from their own AWX instance.
