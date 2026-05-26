# Validation Summary: How to Use Ansible --diff Mode to See File Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-playbook CLI
- Ansible check mode and diff mode
- Ansible playbook keywords
- Ansible built-in modules
- Ansible callback plugins

## Sources Consulted
- Ansible documentation: Validating tasks with check mode and diff mode - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible documentation: Playbook keywords - https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible documentation: Configuration settings, DIFF_ALWAYS and ANSIBLE_DIFF_ALWAYS - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible documentation: ansible.builtin.template module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: ansible.builtin.lineinfile module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: ansible.builtin.blockinfile module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- Ansible documentation: ansible.builtin.replace module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/replace_module.html
- Ansible documentation: ansible.builtin.file module - https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.command and ansible.builtin.shell modules - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html and https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: ansible.posix.json callback plugin - https://docs.ansible.com/ansible/latest/collections/ansible/posix/json_callback.html
- Ansible documentation: community.general.ini_file module - https://docs.ansible.com/ansible/latest/collections/community/general/ini_file_module.html

## Issues Found
- The `ansible.cfg` example used `[defaults] diff = True`, but current Ansible configuration documents diff mode as `[diff] always = True`. Updated the snippet accordingly.
- The module support list named `ini_file` without its current collection. Updated it to `community.general.ini_file`.
- The module support description claimed `apt` does not produce diff output. Current Ansible documentation lists `ansible.builtin.apt` as supporting diff mode, so the unsupported-module sentence was corrected.
- The `file` module description implied normal file diff behavior. Current documentation says file contents are not shown for `absent` or `touch`, so the description and deleted-file section were corrected.
- The `copy` examples used templated variables with `content`. Current documentation recommends `template` for variable interpolation and says variables with `content` can produce unpredictable results. Replaced those examples with static inline content or a template task.
- The callback example used `ANSIBLE_STDOUT_CALLBACK=json`. Current documentation identifies the JSON stdout callback as `ansible.posix.json`, so the command and surrounding text were updated.
- The callback JSON snippet was presented as exact output. Updated the wording to describe it as a simplified host result because the full callback output is nested.

## Review Notes
Local `ansible-playbook` was not installed in the review environment, so CLI behavior was verified against official Ansible documentation instead of local `--help` output.
