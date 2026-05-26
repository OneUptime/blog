# Validation Summary: How to Profile Ansible Playbook Execution Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible callback plugins
- ansible.posix collection
- Bash shell scripting
- GNU time
- OpenSSH
- GitLab CI/CD

## Sources Consulted
- Ansible callback plugins documentation: https://docs.ansible.com/ansible/latest/plugins/callback.html
- Ansible configuration settings for `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.posix collection callback index: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.posix.profile_roles callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_roles_callback.html
- ansible.posix.timer callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible `now()` templating function documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating_now.html
- Ansible builtin module documentation for `raw`, `copy`, and related playbook modules: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/
- GNU time manual for `-v`: https://www.gnu.org/software/time/manual/time.html
- GitLab CI script syntax documentation: https://docs.gitlab.com/ci/yaml/script/

## Issues Found
- The post described `profile_tasks`, `profile_roles`, and `timer` as built-in callbacks shipped directly with Ansible. Current Ansible documentation places these callbacks in the `ansible.posix` collection, which may be included with the full `ansible` package but is not included in `ansible-core`. I changed the section to explain the collection requirement and added the `ansible-galaxy collection install ansible.posix` command.
- The callback enablement examples used short plugin names such as `profile_tasks` and `timer`. Current documentation recommends using fully qualified callback names, so I updated the `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED` examples to use `ansible.posix.profile_tasks`, `ansible.posix.profile_roles`, and `ansible.posix.timer`.
- The sample `profile_tasks` output used "Thursday 21 February 2026", but February 21, 2026 is a Saturday. I corrected the weekday in the sample timestamps.
- The performance tracking script counted `ok:` output lines as hosts, which counts task results rather than unique hosts. I changed the host count to parse one host line per host from the `PLAY RECAP` section.
- The GitLab CI example parsed only the `minutes` field from the timer output, so a run of one hour and zero minutes could pass a ten-minute threshold. I changed the example to measure elapsed seconds with `date +%s` and compare against a 600-second threshold.

## Review Notes
The post is now technically aligned with current Ansible documentation. The local environment did not have Ansible installed, so callback behavior was verified against official documentation rather than local `ansible-doc` output.
