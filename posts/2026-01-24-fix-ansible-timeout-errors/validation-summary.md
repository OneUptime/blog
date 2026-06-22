# Validation Summary: How to Fix 'Timeout' Connection Errors in Ansible

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Ansible
- ansible-core configuration
- SSH and OpenSSH options
- Ansible async tasks and async_status
- Ansible fact gathering with setup
- Ansible callback plugins
- Linux package management with apt
- Network diagnostics

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible SSH connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible asynchronous actions and polling: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html
- ansible.builtin.async_status module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/async_status_module.html
- ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.setup module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible callback plugins: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible 8 porting guide: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_8.html
- ansible-playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- OpenSSH client options: https://man.openbsd.org/ssh_config

## Issues Found
- The SSH configuration example used `control_master` and `control_persist` as Ansible `ssh_connection` keys. These are OpenSSH options, so they were moved into `ssh_args` as `ControlMaster` and `ControlPersist`.
- The database migration async example referenced `migration_job.ansible_job_id` without registering the migration task. Added `register: migration_job`.
- Persistent connection timeout settings were shown under `[defaults]`. Current Ansible configuration documents these under `[persistent_connection]`, so the section was corrected.
- The global timeout example used `become_timeout`, which is not a current documented Ansible configuration key. Removed it and corrected the persistent connection timeout settings.
- The apt example used `timeout` as if it were an `apt` module parameter. `timeout` is a task keyword, while `apt` supports `lock_timeout` for lock waiting, so `lock_timeout` was added and the existing timeout comment was clarified as task-level.
- The parallel async example looped over `long_tasks.results`, which is not present when the prior task is registered per host without a loop. Updated it to use `long_tasks.ansible_job_id`.
- The fact gathering timeout section presented `gather_timeout` as an `ansible.cfg` setting. Current docs define it as a play keyword and `setup` module parameter, so the example now uses the play-level keyword.
- The performance config used deprecated/removed `callback_whitelist`. Updated it to `callbacks_enabled` with fully qualified ansible.posix callback names.
- The quick reference listed the async `poll` default as 10 seconds. Current Ansible docs state the default is 15 seconds, so the table was corrected.
- The debugging command used unsupported `ansible-playbook --callback-whitelist`. Replaced it with `ANSIBLE_CALLBACKS_ENABLED=ansible.posix.profile_tasks ansible-playbook playbook.yml`.

## Review Notes
The post is technically relevant and useful after correction. Some examples assume optional utilities or collections are installed, such as `nc`, `nslookup`, and the `ansible.posix` callback plugins; the commands and plugin names are otherwise valid.
