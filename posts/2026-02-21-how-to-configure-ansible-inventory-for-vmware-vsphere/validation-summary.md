# Validation Summary: How to Configure Ansible Inventory for VMware vSphere

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible dynamic inventory
- `community.vmware.vmware_vm_inventory`
- VMware vSphere and vCenter
- vSphere tags
- `ansible.builtin.constructed`
- `pyVmomi`

## Sources Consulted
- Ansible community.vmware.vmware_vm_inventory inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_inventory_inventory.html
- Ansible vmware.vmware.vms inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vms_inventory.html
- Ansible VMware dynamic inventory hostname guide: https://docs.ansible.com/ansible/7/collections/community/vmware/docsite/vmware_scenarios/vmware_inventory_hostnames.html
- Ansible VMware dynamic inventory filters guide: https://docs.ansible.com/ansible/3/scenario_guides/vmware_scenarios/vmware_inventory_filters.html
- Ansible ansible.builtin.constructed inventory plugin documentation: https://docs.ansible.com/projects/ansible/12/collections/ansible/builtin/constructed_inventory.html

## Issues Found
- The post described `community.vmware.vmware_vm_inventory` as the current standard without mentioning that current Ansible documentation marks it deprecated for removal in `community.vmware` 7.0.0. Added a short caveat and noted the documented replacement, `vmware.vmware.vms`.
- The prerequisites omitted the vSphere Automation SDK requirement for tag support. Added it to the prerequisites.
- The filename requirement was incomplete. Updated it to include `vmware_vm_inventory.yml` and `vmware_vm_inventory.yaml`, which are accepted by the plugin.
- The folder, cluster, and datacenter example attempted to group on undocumented variables such as `datacenter`, `cluster`, and `config.folder`. Reworked that example to use the plugin's documented `resources` search-scope filtering.
- The tag grouping example used a generic `tags` list with `tag_name` and `tag_category` attributes, but the documented community plugin examples expose tag categories through `tag_category.<CategoryName>`. Updated the example to use `tag_category.Environment` and `tag_category.Role`.
- The later datacenter and cluster filtering example only filtered datacenters. Added nested `compute_resource` entries so the example actually filters clusters too.
- The playbook example limited against a `dc_DC_East` group that the corrected inventory examples do not create. Updated it to run against the filtered inventory file directly.

## Review Notes
The examples remain focused on the `community.vmware` 6.x plugin because that is the subject of the post, but new deployments should evaluate the replacement `vmware.vmware.vms` plugin because the community plugin is documented as deprecated.
