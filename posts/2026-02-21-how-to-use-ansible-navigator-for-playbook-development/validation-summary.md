# Validation Summary: How to Use ansible-navigator for Playbook Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible Navigator
- Ansible playbooks
- Ansible execution environments
- Ansible Core modules and filters
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible Navigator settings documentation: https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator subcommands documentation: https://docs.ansible.com/projects/navigator/subcommands/
- Ansible community execution environment documentation: https://docs.ansible.com/projects/ansible/latest/getting_started_ee/run_community_ee_image.html
- Ansible Core filter documentation for JSON queries and community.general migration: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbooks_filters.html
- Ansible Core groupby filter documentation: https://docs.ansible.com/projects/ansible-core/stable-2.19/collections/ansible/builtin/groupby_filter.html
- Local verification with ansible-navigator 26.4.0 and ansible-core 2.20.6 CLI help/output.

## Issues Found
- The execution environment image `quay.io/ansible/community-ee-minimal:latest` no longer resolves. Changed it to the official current community minimal image, `ghcr.io/ansible-community/community-ee-minimal:latest`.
- The TUI command list included `:top`, which is not a current ansible-navigator action, and `/pattern`, while current help documents filtering as `:f` or `:filter <re>`. Changed the examples to `:welcome` and `:filter pattern`.
- The Jinja2 lab used the short `json_query` filter, but the configured minimal execution environment only includes `ansible-core`; current Ansible Core documentation notes JSON queries are provided by `community.general.json_query` and require extra dependencies. Replaced that example with equivalent built-in `selectattr` score filtering.

## Review Notes
- Verified the Ansible playbook examples that do not depend on an external role by running them with ansible-core 2.20.6. The role example is structurally correct but still depends on a local `webserver` role being present.
- Confirmed `ansible-navigator run` accepts ansible-playbook flags such as `--check`, `--diff`, `--tags`, `--start-at-task`, `--syntax-check`, `--list-tasks`, and `--list-hosts`.
