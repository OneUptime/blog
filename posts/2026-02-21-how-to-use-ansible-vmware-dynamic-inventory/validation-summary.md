# Validation Summary: How to Use Ansible VMware Dynamic Inventory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory plugins
- Ansible dynamic inventory
- VMware vSphere / vCenter
- VMware Ansible collections
- YAML inventory plugin configuration
- Ansible inventory caching

## Sources Consulted
- Ansible `vmware.vmware.vms` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vms_inventory.html
- Ansible `community.vmware.vmware_vm_inventory` inventory plugin documentation and deprecation notice: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_inventory_inventory.html
- Ansible inventory plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible inventory guide for multiple inventory sources and inventory directories: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible `ansible.builtin.jsonfile` cache plugin documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/jsonfile_cache.html

## Issues Found
- The post used the deprecated `community.vmware.vmware_vm_inventory` plugin. Current official documentation marks it deprecated and scheduled for removal in `community.vmware` 7.0.0, with `vmware.vmware.vms` as the alternative. Updated the collection install command, plugin name, `enable_plugins` examples, and inventory filenames to use `vmware.vmware.vms`.
- The original inventory filename guidance used `.vmware.yml` / `.vmware.yaml`, which belongs to the deprecated plugin. Updated it to the current `vmware.vmware.vms` filename patterns: `.vms.yml`, `.vms.yaml`, `.vmware_vms.yml`, or `.vmware_vms.yaml`.
- The post used `with_tags: true` and tag expressions such as `tags.Environment`, which match the old plugin style and do not match the current plugin's documented tag output. Updated tag examples to use `gather_tags: true` and `tags_by_category`.
- The filtering examples treated `filters` as include conditions. In the current `vmware.vmware.vms` plugin, `filter_expressions` excludes a host when an expression evaluates to true. Updated the examples to exclude powered-off VMs and VMs without IP addresses.
- The folder filtering example used the old `resources` syntax. Updated it to the current `search_paths` option with vSphere inventory paths.
- The examples mixed `runtime.powerState` with current plugin documentation that uses `summary.runtime.powerState`. Updated property lists, keyed groups, groups, and filter expressions to use `summary.runtime.powerState`.
- The `compose` examples used full Jinja delimiters for expressions where the inventory plugin expects Jinja expressions. Updated the connection variable examples to match the documented expression style.
- The cache example used the short `jsonfile` cache plugin name. Updated it to the recommended FQCN `ansible.builtin.jsonfile`.

## Review Notes
The examples were reviewed for configuration correctness against current Ansible documentation. They were not executed against a live vCenter environment, so credentials, folder paths, tag category names, and VM properties still need to match the reader's environment.
