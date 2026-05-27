# Validation Summary: How to Use Ansible with Netbox for Network Source of Truth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- NetBox
- netbox.netbox Ansible collection
- community.general Ansible collection
- YAML playbooks and dynamic inventory

## Sources Consulted
- Ansible documentation: netbox.netbox.nb_inventory inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/nb_inventory_inventory.html
- Ansible documentation: netbox.netbox.nb_lookup lookup plugin: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/nb_lookup_lookup.html
- Ansible documentation: netbox.netbox collection index: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/index.html
- Ansible documentation: netbox.netbox.netbox_device module: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_device_module.html
- Ansible documentation: netbox.netbox.netbox_prefix module: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_prefix_module.html
- Ansible documentation: community.general.timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible documentation: community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible documentation: ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- NetBox documentation: REST API overview: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox documentation: REST API filtering: https://netbox.readthedocs.io/en/stable/reference/filtering/

## Issues Found
- The dynamic inventory example used `regions` in `group_by`, but the current `netbox.netbox.nb_inventory` plugin documents `region` as the valid group key. Changed `regions` to `region`.
- The inventory example used `query_filters` for device-specific filters and mixed two filters that should narrow the device query. Changed this to `device_query_filters` with `status: active` and `has_primary_ip: 'true'`, matching the plugin's documented device filter option.
- The post used `netbox.netbox.netbox_device_info` and `netbox.netbox.netbox_prefix_info`, which are not present in the current `netbox.netbox` collection documentation. Replaced them with `netbox.netbox.nb_lookup` queries for devices, sites, and site-scoped prefixes.
- The provisioning example used `ansible.builtin.timezone`, but the documented timezone module is `community.general.timezone`. Updated the module name.

## Review Notes
- The `netbox.netbox` collection is not part of `ansible-core`; users need the collection installed separately.
- Site assignment for prefixes changed in newer NetBox releases. The prefix lookup was updated to use `scope_type=dcim.site` and `scope_id` to align with current NetBox behavior.
- Local `ansible-doc` verification was not possible because `ansible-doc` is not installed in this environment; official online documentation was used instead.
