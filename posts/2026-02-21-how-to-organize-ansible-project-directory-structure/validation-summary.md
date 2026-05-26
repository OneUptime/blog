# Validation Summary: How to Organize Ansible Project Directory Structure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible project layout
- Ansible inventory
- Ansible roles
- Ansible playbooks
- Ansible configuration
- Ansible Galaxy requirements files
- Makefile command shortcuts
- Mermaid diagrams

## Sources Consulted
- Ansible sample setup documentation: https://docs.ansible.com/ansible/8/tips_tricks/sample_setup.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible YAML inventory plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/yaml_inventory.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible community.general YAML callback documentation: https://docs.ansible.com/projects/ansible/11/collections/community/general/yaml_callback.html
- Ansible Galaxy collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible apt, package, service, and template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- GNU Make manual for phony targets: https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html

## Issues Found
- The sample `host_vars` filenames did not match the fully qualified hostnames used later in the inventory example. Updated them to `web01.prod.example.com.yml`, `db01.prod.example.com.yml`, and `web01.staging.example.com.yml` so Ansible's `host_group_vars` lookup behavior is represented accurately.
- The playbook organization text said `site.yml` should include all other playbooks, but the example shows `site.yml` as an entry-point playbook containing plays directly. Updated the wording to match the example.
- The `ansible.cfg` example used `stdout_callback = yaml`. The `community.general.yaml` stdout callback is deprecated, and current Ansible supports YAML-style result formatting through the default callback with `callback_result_format = yaml`. Updated the configuration accordingly.
- The callback list used short callback names for `timer` and `profile_tasks`. In current documentation these callbacks live in the `ansible.posix` collection, so the example now uses `ansible.posix.timer` and `ansible.posix.profile_tasks`.
- The `control_path_dir` example used a full SSH control path template. That setting expects a directory; changed it to `/tmp/ansible-ssh`.
- The dependency installation example ran both `ansible-galaxy install -r requirements.yml` and `ansible-galaxy collection install -r requirements.yml`. Current Ansible documentation supports installing roles and collections from a combined requirements file with `ansible-galaxy install -r requirements.yml`, so the redundant collection command was removed.
- The Makefile declared several targets as phony but omitted `check-prod`. Added `check-prod` to `.PHONY`.

## Review Notes
The post is technically relevant and the overall Ansible project layout is consistent with Ansible's documented sample and alternative layouts. The local environment does not have Ansible installed, so CLI behavior was checked against official documentation rather than local `--help` output.
