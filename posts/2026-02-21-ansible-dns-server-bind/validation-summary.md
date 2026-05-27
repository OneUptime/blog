# Validation Summary: How to Use Ansible to Set Up a DNS Server (BIND)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- BIND9
- DNS zone files
- Ubuntu Linux
- UFW

## Sources Consulted
- Ubuntu Server documentation: Domain Name Service (DNS), https://ubuntu.com/server/docs/how-to/networking/install-dns/
- BIND 9 Administrator Reference Manual, https://bind9.readthedocs.io/_/downloads/en/v9_18_1/pdf/
- Ansible template module documentation, https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/template_module.html
- Ansible facts documentation, https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_vars_facts.html

## Issues Found
- The role deployed zone files into `/etc/bind/zones` before creating that directory. I moved the directory creation before the template task so the playbook can run successfully on a fresh host.
- The logging configuration writes to `/var/log/named/default.log`, but the playbook did not create `/var/log/named` with ownership for the `bind` user. I added a task to create the log directory, matching Ubuntu's BIND logging guidance.
- The same zone template and validation tasks were applied to every zone, including secondary zones that do not define `records` and whose zone data is transferred from the primary. I limited those tasks to primary zones.
- The examples used BIND's older `master` and `slave` terminology. I updated the examples and template conditionals to `primary` and `secondary`, which matches current BIND documentation while keeping the same behavior.
- The secondary DNS example conflicted with the global `allow-transfer { none; };` setting. I added an optional per-zone `allow_transfer` variable and updated the secondary example to show the primary allowing transfers to the secondary server.
- Secondary zone files were declared under `/etc/bind/zones`, which is not writable by the `bind` service user in this role. I changed the template to store transferred secondary zones in `/var/cache/bind`.

## Review Notes
- The zone serial uses `ansible_date_time.epoch`, which is valid when facts are gathered, but it makes the zone template change on every playbook run. That is operationally acceptable for a simple tutorial, though a production role might generate serials only when zone content changes.
