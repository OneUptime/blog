# Validation Summary: How to Configure Ansible Task Timeout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible configuration
- Ansible task, play, and block keywords
- Ansible async tasks
- Ansible built-in modules: `uri`, `wait_for`, `get_url`
- `community.docker.docker_image`
- GNU `timeout`

## Sources Consulted
- Ansible Playbook Keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible Configuration Settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Core Asynchronous actions and polling: https://docs.ansible.com/projects/ansible-core/2.20/playbook_guide/playbooks_async.html
- `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- `ansible.builtin.get_url` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html

## Issues Found
- The post described play-level `timeout` as a wall-clock timeout for the entire play. Official Ansible keyword documentation describes `timeout` as a task action execution limit, and when set at play/block/role scope it acts as a default for task actions. I changed the play-level section to explain that it applies per task action, not to the whole play.
- The post omitted the official global task timeout setting. I added `task_timeout` under `[defaults]` and explained that it is separate from connection timeout and does not include templating or loops.
- The post referenced `ANSIBLE_SSH_TIMEOUT`, which is not a documented current Ansible configuration environment variable. I replaced it with `ANSIBLE_TASK_TIMEOUT`.
- The post described `async` with `poll` as non-blocking in general. Official async documentation distinguishes `poll > 0`, which waits and polls, from `poll: 0`, which starts the task and moves on. I corrected that explanation.
- The post covered play and task-level defaults but not block-level timeout despite Ansible documenting `timeout` as valid for blocks. I added a small block-level example to keep the scope accurate.
- The retry timing comment counted a delay after the final attempt. I changed it to count six 10-second attempts and five 10-second delays, which is the closer upper bound for the shown retry loop.

## Review Notes
The module-specific timeout examples are technically valid. The `community.docker.docker_image` module belongs to the `community.docker` collection rather than `ansible-core`; using the short module name can work if the collection is installed and resolved, but using the FQCN would be clearer in a future style pass.
