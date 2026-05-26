# Validation Summary: How to Use Ansible import_playbook for Modular Playbook Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.import_playbook
- Ansible tags and conditional imports
- Ansible built-in modules: setup, debug, package, hostname, lineinfile, service, uri, fail, copy, cron
- community.general modules: timezone, ufw
- ansible-playbook CLI

## Sources Consulted
- Ansible import_playbook documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible reusable artifacts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse.html
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- community.general.timezone documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- ansible.builtin.uri documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.setup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html

## Issues Found
- The selective execution examples used `--tags databases` and `--skip-tags monitoring`, but the master playbook imports were not tagged. Added tags to the import examples so the commands work as described.
- The section title and wording implied that all Ansible include mechanisms are deprecated. Updated the wording to clarify that the legacy bare `include` keyword is deprecated, while modern `include_*` statements remain valid dynamic reuse mechanisms.
- The static import explanation said variable files are loaded immediately and could not use runtime conditions effectively. Reworded this to match Ansible's documented behavior: imports are pre-processed before task execution, loops are not supported, and conditions are inherited by the imported tasks.
- The infrastructure workflow used `ansible.builtin.timezone`, which is not the current documented module name. Replaced it with `community.general.timezone`.

## Review Notes
The examples are technically valid as illustrative playbook snippets, but the `community.general.timezone` and `community.general.ufw` tasks require the `community.general` collection, and `community.general.ufw` also requires the target host to have UFW installed.
