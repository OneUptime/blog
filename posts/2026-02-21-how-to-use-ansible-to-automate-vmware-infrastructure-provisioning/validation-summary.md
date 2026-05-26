# Validation Summary: How to Use Ansible to Automate VMware Infrastructure Provisioning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.vmware collection
- vmware.vmware collection
- VMware vSphere and vCenter
- VMware guest customization and dynamic inventory
- YAML playbooks and inventory configuration

## Sources Consulted
- Ansible community.vmware collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/index.html
- community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- community.vmware.vmware_guest_disk module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_disk_module.html
- vmware.vmware.vms inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vms_inventory.html
- vmware.vmware.vm_snapshot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_snapshot_module.html
- community.general.filesystem module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/filesystem_module.html
- ansible.posix.mount module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- ansible.builtin.include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- ansible.builtin.import_playbook module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html

## Issues Found
- The prerequisites pinned the guidance to "Ansible 2.12+ with the community.vmware collection", but the current community.vmware collection has a newer ansible-core support floor. I changed this to tell readers to use VMware collections supported by their ansible-core version.
- The post-provisioning playbook uses `community.general.filesystem` and `ansible.posix.mount`, but the install commands did not install those collections for ansible-core users. I added installation commands for both collections.
- The snapshot example used the deprecated `community.vmware.vmware_guest_snapshot` module. I changed it to the maintained `vmware.vmware.vm_snapshot` module, added the `vmware.vmware` collection installation command, and included the folder and infrastructure vars required by the example.
- The snapshot play used `ansible_date_time.date` while disabling fact gathering, which would leave that variable undefined. I enabled fact gathering for that play.
- The dynamic inventory example used the deprecated `community.vmware.vmware_vm_inventory` plugin. I changed it to the maintained `vmware.vmware.vms` plugin, updated the filename to one accepted by that plugin, and adjusted the property/group references to match the current plugin examples.
- The extra disk playbook used `datacenter` and `datastore` but did not load the infrastructure vars file where those variables are defined. I added `../vars/infrastructure.yml` to `vars_files`.
- The master playbook used `include_tasks` to include full playbooks. `include_tasks` only includes task lists, and `import_playbook` must be used at the playbook top level. I rewrote the orchestration example to import the provisioning and disk playbooks at top level, then run the wait play, then import the configuration playbook.

## Review Notes
The VMware provisioning and disk examples otherwise match the documented module parameters. The examples still intentionally use `validate_certs: false` for lab-style simplicity; production environments should use trusted certificates instead.
