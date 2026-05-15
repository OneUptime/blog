# Validation Summary: How to Automate Storage Configuration Using the storage RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Storage and LVM management

## Sources Consulted
- Red Hat Customer Portal: RHEL System Roles overview and installation guidance, https://access.redhat.com/articles/3050101
- Red Hat Documentation: Managing local storage by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_file_systems/managing-local-storage-by-using-rhel-system-roles
- Red Hat Catalog: redhat.rhel_system_roles collection installation and role naming, https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles

## Issues Found
- The install command only installed `rhel-system-roles`. Red Hat's current RHEL guidance installs both `rhel-system-roles` and `ansible-core`, so the command was updated to `sudo dnf install -y rhel-system-roles ansible-core`.
- The playbook used `rhel-system-roles.storage`. Current Red Hat collection documentation shows roles available as `redhat.rhel_system_roles.<role_name>`, so the playbook was updated to use `redhat.rhel_system_roles.storage`.
- The role documentation commands referenced `/usr/share/doc/rhel-system-roles/storage/README.md`. Red Hat's storage role documentation points users to `/usr/share/ansible/roles/rhel-system-roles.storage/README.md`, so the commands were updated to use that path.
- The verification step used generic placeholders for a service and config file. The storage role configures disks, filesystems, mounts, and LVM rather than a single service, so the examples were replaced with `lsblk -f`, `findmnt`, `sudo vgs`, and `sudo lvs`.

## Review Notes
The post remains a high-level skeleton and does not include concrete `storage_pools` or `storage_volumes` variables. That is technically acceptable because it directs readers to the role documentation for role-specific variables, but a future improvement would be to include a complete minimal example for creating or mounting storage.
