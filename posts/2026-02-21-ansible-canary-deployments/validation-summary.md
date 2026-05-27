# Validation Summary: How to Use Ansible for Canary Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and YAML inventory
- Ansible serial rolling updates
- Ansible block/rescue error handling
- Ansible builtin modules: git, command, systemd/systemd_service, uri, pause, lineinfile, fail
- NGINX upstream configuration
- Canary deployments and CI/CD rollout patterns

## Sources Consulted
- Ansible YAML inventory documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yaml_inventory.html
- Ansible playbook strategies and serial documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible pause module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible filters documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html
- Ansible ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- NGINX command-line reload documentation: https://nginx.org/en/docs/switches.html

## Issues Found
- The canary traffic percentage claim implied that 2 of 10 servers always means 20% of traffic. I added a qualifier that this assumes even load-balancer distribution.
- The timed `pause` task said users could press Enter to continue. Ansible's pause module does not support prompting for input when `minutes` or `seconds` is set; early continuation uses Ctrl+C then C, and abort uses Ctrl+C then A. I updated the prompt accordingly.
- The rollback task used `default('main')`, which does not replace an empty string. I changed it to `default('main', true)` in both the rollback version and failure message so missing or empty version output falls back to `main`.
- The block/rescue explanation said rescue runs if anything in the block fails. I narrowed it to tasks that return a failure, matching Ansible's documented error-handling behavior.

## Review Notes
Short module names such as `git`, `uri`, and `lineinfile` are still valid for builtin modules, though Ansible documentation recommends fully qualified collection names such as `ansible.builtin.git` for clarity and avoiding name collisions. The NGINX load balancer snippet is a simplified example; in production, a template or NGINX Plus/API-based workflow would usually be safer than editing upstream files line by line.
