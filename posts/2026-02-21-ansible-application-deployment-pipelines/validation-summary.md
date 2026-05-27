# Validation Summary: How to Use Ansible to Automate Application Deployment Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: file, get_url, unarchive, stat, copy, uri, include_tasks, slurp, fail, systemd
- Rolling deployments with serial and max_fail_percentage
- systemd service restarts
- CI/CD deployment workflows

## Sources Consulted
- Ansible playbook strategies and serial rolling updates: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible error handling and max_fail_percentage: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- ansible-playbook CLI reference: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.get_url module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- ansible.builtin.unarchive module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/unarchive_module.html
- ansible.builtin.stat module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.uri module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.include_tasks module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible handlers and meta flush_handlers: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- ansible.builtin.systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible roles and role defaults: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html

## Issues Found
- The shared configuration symlink task wrote into `{{ app_releases_dir }}/{{ release_timestamp }}/config`, but the example did not guarantee that this directory existed after extracting the artifact. Added a task to create the release-specific `config` directory before creating symlinks.
- The automatic rollback task assumed `{{ app_base_dir }}/.previous_release` existed. On a failed first deployment, or any deployment without an existing current symlink, `slurp` would fail with a less useful error instead of clearly reporting that rollback is unavailable. Added a `stat` check and explicit failure message before reading the rollback target.

## Review Notes
- The examples use short module names such as `file` and `uri`, which remain valid for built-in modules. Current Ansible documentation recommends fully qualified collection names for clearer linking and avoiding name conflicts, but this is not required for correctness.
- The `systemd` module name remains available as an alias for `ansible.builtin.systemd_service`.
- The local environment did not have Ansible preinstalled, so module behavior and CLI options were verified against official Ansible documentation. A temporary `ansible-core` install was used to sanity-check selected playbook syntax and templating behavior.
