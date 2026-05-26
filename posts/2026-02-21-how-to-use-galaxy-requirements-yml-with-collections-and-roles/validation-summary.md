# Validation Summary: How to Use Galaxy requirements.yml with Collections and Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible Galaxy requirements.yml files
- Ansible roles
- Ansible collections
- YAML
- GitHub Actions

## Sources Consulted
- Ansible Community Documentation: Installing collections, including requirements.yml keys, collection source types, custom paths, and combined role/collection installs: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Galaxy user guide, including role requirements.yml fields and role install/list commands: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: ansible-galaxy CLI reference for role install, role list, collection install, and collection list options: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Red Hat Ansible Automation Platform documentation for Automation Hub server URLs: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.4/html/getting_started_with_automation_hub/configure-hub-primary

## Issues Found
- The post incorrectly said two commands are always required and that `ansible-galaxy install -r requirements.yml` only processes roles. Current Ansible documentation says `ansible-galaxy install -r requirements.yml` can install both roles and collections when using default paths, while `ansible-galaxy role install -r` and `ansible-galaxy collection install -r` only install their respective sections. I updated the installation section and summary to explain the one-command default-path behavior and the two-command custom-path behavior.
- Several examples used `ansible-galaxy install -r ... -p ./roles/` for role-only custom-path installs. I changed these to the explicit `ansible-galaxy role install -r ... -p ./roles/` form to match current CLI documentation and avoid ambiguity with combined installs.
- The post used `ansible-galaxy list -p` for role listing. I changed this to `ansible-galaxy role list -p`, the current explicit role subcommand form.
- The post said the unified `roles` and `collections` requirements format was introduced "Since Ansible 2.10." Official Ansible 2.9 documentation already documented requirements files containing both roles and collections, so I changed the wording to "Modern Ansible requirements files."
- The legacy-format section tied flat role-only requirements files specifically to "Before Ansible 2.10." I changed this to "Older role-only requirements files" because the flat role-only format predates collections but is not specifically a 2.10 boundary.
- The Automation Hub example used `https://cloud.redhat.com/api/automation-hub/content/published/`. I updated it to the current Red Hat documented hosted Automation Hub URL, `https://console.redhat.com/api/automation-hub/content/published/`.

## Review Notes
The local workspace did not have `ansible-galaxy` installed, so CLI behavior was verified against official documentation rather than local `--help` output. The collection examples use currently documented fields such as `name`, `version`, `source`, and `type`; newer Ansible also supports collection `signatures`, but the omission is not an error for this guide.
