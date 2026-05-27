# Validation Summary: How to Use Ansible to Configure Database Firewalls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible inventory
- community.general.ufw
- ansible.posix.firewalld
- ansible.builtin.iptables
- UFW
- firewalld
- iptables
- PostgreSQL pg_hba.conf
- Linux networking commands

## Sources Consulted
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.posix.firewalld module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible ansible.builtin.iptables module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible INI inventory documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ini_inventory.html
- Ansible YAML inventory documentation: https://docs.ansible.com/ansible/2.9/plugins/inventory/yaml.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld zone options documentation: https://firewalld.org/documentation/zone/options
- firewalld runtime versus permanent configuration documentation: https://firewalld.org/documentation/configuration/runtime-versus-permanent.html
- PostgreSQL 16 pg_hba.conf documentation: https://www.postgresql.org/docs/16/auth-pg-hba-conf.html

## Issues Found
- The inventory example was labeled as an INI inventory but used YAML-style list syntax under `[all:vars]`, which is not valid INI inventory syntax. Changed the example to a proper YAML inventory file (`inventory/databases.yml`) with `all.vars`, `children`, and host variables.
- The UFW section described the module as built in. `community.general.ufw` is part of the `community.general` collection, not `ansible-core`. Updated the wording to say the module is in the community.general collection.
- The firewalld playbook attempted to set the default zone by enabling the predefined `drop` zone with `ansible.posix.firewalld`, which does not set the firewalld default zone. Replaced it with `firewall-cmd --get-default-zone` and an idempotent `firewall-cmd --set-default-zone=drop`.
- The firewalld playbook created a new `database` zone and then immediately used it before reloading firewalld. The Ansible firewalld documentation notes that newly created zones must be reloaded before immediate operations can use them. Added a `meta: flush_handlers` task after zone creation.
- The firewalld playbook added monitoring hosts as sources but did not open the monitoring exporter ports in that zone. Added the monitoring exporter ports (`9187`, `9104`, and `9216`) to match the UFW example and the article's described firewall flow.
- The database firewalld zone did not explicitly set a drop target. Added a separate `target: DROP` task after zone creation and reload so unmatched traffic in that source-bound zone is dropped rather than relying on implicit default behavior.

## Review Notes
- The YAML code fences were parsed successfully after the corrections.
- Ansible was not installed in the local environment, so module behavior was checked against official Ansible documentation rather than local `ansible-doc` output.
- The iptables module does not persist rules itself; the post correctly saves rules separately with `netfilter-persistent save`.
- The PostgreSQL `pg_hba.conf` example uses valid record types and authentication methods for PostgreSQL 16.
