# Validation Summary: How to Batch Tasks for Better Ansible Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops
- Ansible built-in modules: file, command, shell, apt, template, service, user, apt_repository
- ansible.posix.synchronize
- systemd systemctl
- rsync

## Sources Consulted
- Ansible loops documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.posix.synchronize module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html
- ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible blocks documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html

## Issues Found
- The loop section said Ansible reuses "module setup" for each loop iteration. Official loop documentation states that loops run the task once per item, so the wording was changed to say the module still runs once per item while avoiding repeated task definitions and reusing the SSH connection where available.
- The single-command directory example used `command: mkdir -p /opt/app/{logs,data,config,tmp,bin,lib}`. The Ansible `command` module does not process shell metacharacters such as brace expansion, so the example was changed to pass each directory path explicitly through the `cmd` parameter.
- The same directory example claimed `creates` made the task idempotent. A single `creates` path cannot prove that all directories exist, and `command` still needs custom change detection for accurate changed status. The explanation now says `mkdir -p` is safe to rerun but will report changed unless custom change detection is added.
- Technique 7 was titled "Use with_items Over include_tasks" even though the example used modern `loop` syntax and did not recommend `with_items`. The heading was corrected to "Use Direct Loops Over include_tasks."
- The block section claimed a block-level `when` condition is evaluated once. Ansible documentation says directives such as `when` are inherited by the tasks in the block, not applied to the block itself. The explanation was corrected.

## Review Notes
The examples use short module names such as `apt`, `file`, and `service`, which are still valid for built-in modules. Official documentation recommends fully qualified collection names, such as `ansible.builtin.apt`, for clearer linking and avoiding name conflicts, but this is not required for correctness.
