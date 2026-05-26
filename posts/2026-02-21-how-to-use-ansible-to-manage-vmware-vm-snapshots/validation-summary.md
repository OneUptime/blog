# Validation Summary: How to Use Ansible to Manage VMware VM Snapshots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- VMware vSphere / vCenter
- VMware VM snapshots
- `vmware.vmware` Ansible collection
- `community.vmware` Ansible collection

## Sources Consulted
- Ansible documentation: `vmware.vmware.vm_snapshot` module, https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_snapshot_module.html
- Ansible documentation: `vmware.vmware.vm_snapshot_revert` module, https://docs.ansible.com/projects/ansible/latest/collections/vmware/vmware/vm_snapshot_revert_module.html
- Ansible documentation: `community.vmware.vmware_guest_snapshot` module deprecation notice, https://docs.ansible.com/projects/ansible/latest/collections/community/vmware/vmware_guest_snapshot_module.html
- Ansible documentation: `community.vmware.vmware_guest_snapshot_info` module, https://docs.ansible.com/projects/ansible/devel/collections/community/vmware/vmware_guest_snapshot_info_module.html
- VMware Cloud Foundation Blog: Performance Best Practices for VMware Snapshots, https://blogs.vmware.com/cloud-foundation/2021/06/16/performance-best-practices-for-vmware-snapshots/

## Issues Found
- The post used the deprecated `community.vmware.vmware_guest_snapshot` module for create, delete, revert, and remove-all operations. Updated snapshot create/delete examples to `vmware.vmware.vm_snapshot` and revert examples to `vmware.vmware.vm_snapshot_revert`, matching the current official replacement modules.
- The old `state: remove_all` syntax is not valid for `vmware.vmware.vm_snapshot`. Updated remove-all examples to use `state: absent` with `remove_all: true`.
- The revert examples used `state: revert`, which belongs to the deprecated module. Updated those tasks to use `vmware.vmware.vm_snapshot_revert` without a `state` parameter.
- The create example referenced `snapshot_result.snapshot_results.current_snapshot.name`, which does not match the current `vmware.vmware.vm_snapshot` return values. Updated it to `snapshot_result.snapshot.name`.
- The full workflow used `ansible_date_time.date` while `gather_facts: false` was set. Replaced it with a date lookup that does not depend on gathered facts.
- The old-snapshot discovery section claimed to flag snapshots older than a configured threshold but only reported snapshot counts. Adjusted the text and debug output so it accurately lists snapshot metadata, including creation times from the info module response.
- The cleanup example claimed to remove snapshots older than three days while using a VM-name loop and removing all snapshots from each VM. Updated it to loop over `old_snapshots` entries and remove a named snapshot from each VM.

## Review Notes
The snapshot behavior explanation is consistent with VMware's published snapshot performance guidance: snapshots preserve VM state/data at a point in time, create delta/child disks for new writes, and can affect performance as snapshot chains grow. The `community.vmware.vmware_guest_snapshot_info` module remains in use for snapshot reporting because the current `vmware.vmware` collection documentation does not provide an equivalent snapshot-info module.
