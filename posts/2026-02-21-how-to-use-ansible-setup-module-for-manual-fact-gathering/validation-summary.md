# Validation Summary: How to Use Ansible setup Module for Manual Fact Gathering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.setup
- Ansible facts and fact caching
- Ansible playbooks and YAML
- community.general collection modules

## Sources Consulted
- Ansible `ansible.builtin.setup` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/setup_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible cache plugins documentation: https://docs.ansible.com/ansible/latest/plugins/cache.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The "Gather network facts only" example used only `gather_subset: network`. Official setup module documentation states that this still includes the default minimum facts. Updated the example to include `!all` and `!min` before `network` so it gathers only the requested subset.
- The "Gather minimal facts" example used `!all`, `!min`, `network`, and `hardware`, which excludes the minimum subset and gathers network and hardware facts instead. Updated it to use only `!all`, which is the documented way to collect the default minimum facts.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but current official documentation lists the timezone module as `community.general.timezone`. Updated the FQCN accordingly.
- The error handling snippet said "with this module" even though it does not use the setup module. Changed the comment to "in playbooks" to avoid implying setup module behavior.

## Review Notes
- The examples rely on fact variables such as `ansible_os_family` and `ansible_memtotal_mb` being injected as top-level variables, which is Ansible's default behavior unless fact variable injection is disabled.
- The `filter` parameter is documented as a list in modern Ansible, but the setup module still accepts a simple string as a single pattern, so the examples remain valid.
- The `community.general.timezone` and `community.general.ufw` examples require the `community.general` collection to be available.
- Ruby was not installed in the local environment, so an attempted local YAML parse could not be completed.
