# Validation Summary: How to Use Ansible to Manage LVM on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible
- LVM
- XFS
- YAML playbooks
- community.general Ansible collection
- ansible.posix Ansible collection

## Sources Consulted
- Ansible documentation: community.general.lvg module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/lvg_module.html
- Ansible documentation: community.general.lvol module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/lvol_module.html
- Ansible documentation: community.general.filesystem module - https://docs.ansible.com/projects/ansible/latest/collections/community/general/filesystem_module.html
- Ansible documentation: ansible.posix.mount module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_logical_volumes/red_hat_enterprise_linux-9-configuring_and_managing_logical_volumes-en-us.pdf
- Red Hat Customer Portal: XFS duplicate UUID and LVM snapshot mount behavior - https://access.redhat.com/solutions/5494781

## Issues Found
- The initial package install task only installed `lvm2`, but the playbook creates XFS filesystems. The Ansible `community.general.filesystem` module requires filesystem-specific tools such as `xfsprogs` for XFS operations, so the task was updated to install both `lvm2` and `xfsprogs`.

## Review Notes
- The Ansible module names and key parameters used in the examples are current: `community.general.lvg`, `community.general.lvol`, `community.general.filesystem`, and `ansible.posix.mount`.
- The `lvol` examples for `resizefs`, snapshots, thin pools, thin volumes, and percentage/free-space sizing match current module documentation.
- The XFS snapshot mount option `nouuid` is appropriate when mounting a snapshot on the same host as the origin filesystem.
- The `lvg` module's `remove_extra_pvs` parameter defaults to `true` in current `community.general` releases. The examples provide the full intended PV list when resizing the volume group, so the shown usage is valid.
