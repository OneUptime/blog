# Validation Summary: How to Use Ansible to Create VMware VM Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- community.vmware Ansible collection
- VMware vSphere and VM templates
- RHEL 9 package and system service management
- firewalld
- SSH server configuration

## Sources Consulted
- Ansible community.vmware.vmware_guest module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_module.html
- Ansible community.vmware.vmware_guest_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_info_module.html
- Ansible community.vmware.vmware_vm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_vm_info_module.html
- Ansible community.vmware.vmware_guest_powerstate module documentation: https://docs.ansible.com/ansible/latest/collections/community/vmware/vmware_guest_powerstate_module.html
- Ansible vmware.vmware.vm_powerstate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_powerstate_module.html
- Ansible built-in module documentation for dnf, file, find, command, copy, lineinfile, and systemd_service: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The playbooks used `community.vmware.vmware_guest_powerstate`, which the current Ansible documentation marks as deprecated and moved to the `vmware.vmware` collection. Since the post already uses `community.vmware.vmware_guest`, I changed the two power-on examples to use `community.vmware.vmware_guest` with `state: powered-on`, which is documented and avoids the deprecated module.
- The service-management examples used `ansible.builtin.systemd`. I updated them to `ansible.builtin.systemd_service`, the current canonical module name.
- The cleanup task passed `/tmp/*` and `/var/tmp/*` to `ansible.builtin.file`. The `file` module does not expand shell globs, so this would target literal paths. I changed the example to discover files with `ansible.builtin.find` and remove the returned paths.
- The shutdown commands used `async: 0` with `poll: 0`. I changed them to `async: 1` with `poll: 0` so the shutdown can be launched asynchronously before the SSH connection closes.
- The template conversion play referenced `ansible_date_time` while facts were disabled. I enabled fact gathering for that play.
- The template rename task had duplicate `name` keys in the same module invocation, which is invalid YAML practice and would override the first value. I changed the task to identify the VM by UUID and set the desired new name.
- The update workflow declared `updated_template_name` but did not use it when converting back to a template. I added a rename step using the VM UUID and converted the updated VM under the new versioned template name.
- The update workflow said it was waiting for SSH but only waited for VMware Tools to report an IPv4 address. I corrected the task label and condition so it accurately waits for a non-empty IP address.

## Review Notes
The examples remain environment-dependent: vCenter folders, clusters, datastores, guest IDs, ISO paths, credentials, and VM inventory names must match the target vSphere environment. The post still uses the `community.vmware` collection for VM lifecycle operations; those modules are documented in the current Ansible community documentation, but future VMware automation work may prefer the newer `vmware.vmware` collection modules where equivalent coverage exists.
