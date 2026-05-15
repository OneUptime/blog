# Validation Summary: How to Automate TLS Certificates with the certificate System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible Core and Ansible playbooks
- TLS certificates
- certmonger

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Requesting certificates from a CA and creating self-signed certificates by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/requesting-certificates-using-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Preparing a control node and managed nodes to use RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles support matrix: https://access.redhat.com/articles/3050101

## Issues Found
- The original playbook included the certificate role without `certificate_requests`, so it would not request or create a certificate. Updated the playbook to use the documented `certificate_requests` variable with a self-signed certificate example.
- The original role invocation used the legacy role name. Updated the example to the current collection-qualified `redhat.rhel_system_roles.certificate` role name shown in current Red Hat documentation.
- The original documentation path pointed to `/usr/share/doc/rhel-system-roles/certificate/README.md`. Updated it to the collection role README path installed by the current RHEL System Roles package.
- The original verification commands were placeholders. Replaced them with the documented `getcert list` verification command run through Ansible.
- The corrected playbook targets multiple hosts, so the certificate DNS name now uses `{{ inventory_hostname }}` instead of a single static hostname.

## Review Notes
- The post remains a high-level tutorial and uses a self-signed certificate example. Production use with an IdM CA requires additional prerequisites, including IdM domain membership and an IdM-integrated CA.
