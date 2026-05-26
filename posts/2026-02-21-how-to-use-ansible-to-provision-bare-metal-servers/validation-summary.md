# Validation Summary: How to Use Ansible to Provision Bare Metal Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Ansible `community.general` collection
- Ansible `ansible.posix` collection
- IPMI and BMC management
- `ipmitool`
- PXE boot with dnsmasq, TFTP, GRUB, and nginx
- Ubuntu Server autoinstall and cloud-init NoCloud
- LVM, XFS, SMART monitoring, and Linux package management

## Sources Consulted
- Ansible `community.general.ipmi_power` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ipmi_power_module.html
- Ansible `ansible.builtin.wait_for_connection` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/wait_for_connection_module.html
- Ansible `ansible.builtin.import_playbook` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html
- Ubuntu Server netboot documentation for amd64: https://ubuntu.com/server/docs/how-to/installation/how-to-netboot-the-server-installer-on-amd64/
- Ubuntu autoinstall configuration reference: https://canonical-subiquity.readthedocs-hosted.com/en/latest/reference/autoinstall-reference.html
- Ubuntu guide for providing autoinstall configuration: https://canonical-subiquity.readthedocs-hosted.com/en/latest/tutorial/providing-autoinstall.html
- cloud-init NoCloud datasource documentation: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Ubuntu `ipmitool` man page: https://manpages.ubuntu.com/manpages/jammy/man1/ipmitool.1.html
- Ubuntu `dnsmasq` man page: https://manpages.ubuntu.com/manpages/jammy/en/man8/dnsmasq.8.html

## Issues Found
- The prerequisites listed Ansible 2.12+ while the post now uses current `ansible.posix` collection modules. Updated the prerequisite to Ansible 2.15+ and added the missing `ansible.posix` and `ipmitool` prerequisites.
- The IPMI status example used `community.general.ipmi_power` with `state: status`, but the module only supports power-changing states such as `on`, `off`, `shutdown`, `reset`, and `boot`. Replaced the status check with `ipmitool chassis power status` and kept `community.general.ipmi_power` for power changes.
- The `ipmitool` examples passed the BMC password with `-P`, which exposes it in process arguments. Updated the examples to use `-E` with `IPMI_PASSWORD`.
- The PXE server example claimed to serve installer files over HTTP but did not configure nginx. Added an nginx site rooted at `/srv/http` so `/install/...` NoCloud paths are served correctly.
- The PXE boot example used GRUB directly as the DHCP boot file but did not stage signed shim/GRUB artifacts. Added tasks to install and copy signed shim, signed GRUB, and the GRUB font for UEFI PXE.
- The Ubuntu autoinstall seed URL pointed to a single `/install/` directory while the generated files were placed in per-host directories. Updated the flow to key NoCloud directories by system UUID and use cloud-init DMI expansion in the GRUB seed URL.
- The NoCloud HTTP seed directories contained only `user-data`. Added `meta-data`, which cloud-init expects alongside `user-data`.
- The autoinstall network config used deprecated `gateway4`. Replaced it with a default route under `routes`.
- The wait-for-install play used `connection: local`, causing `wait_for_connection` to test the controller connection instead of SSH to the provisioned server. Removed `connection: local` from that play.
- The post-install play created an XFS filesystem without ensuring `xfsprogs` was installed. Added `xfsprogs` to the essential packages list.
- The orchestration playbook combined `name` entries with top-level `import_playbook` entries incorrectly. Rewrote it to valid top-level `ansible.builtin.import_playbook` statements.

## Review Notes
The PXE example assumes that `/vmlinuz` and `/initrd` from the target Ubuntu live-server ISO have been staged under the TFTP root, which is now called out in the post and is consistent with Ubuntu's netboot documentation. In a production version, this staging step could be automated.
