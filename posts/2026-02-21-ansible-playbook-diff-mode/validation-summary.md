# Validation Summary: How to Run an Ansible Playbook in Diff Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible diff mode
- Ansible check mode
- Ansible configuration files
- Ansible callback plugins
- Ansible file-management modules

## Sources Consulted
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible configuration settings, including DIFF_ALWAYS and MAX_FILE_SIZE_FOR_DIFF: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible.builtin.template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- ansible.builtin.blockinfile module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/blockinfile_module.html
- ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/shell_module.html
- ansible.builtin.raw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- ansible.posix.json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/json_callback.html
- ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- ansible.posix.sysctl module source: https://github.com/ansible-collections/ansible.posix/blob/main/plugins/modules/sysctl.py

## Issues Found
- The `ansible.cfg` example used `[defaults] diff = True`, but current Ansible configuration documents diff mode as `DIFF_ALWAYS` with INI section `[diff]` and key `always`. Updated the snippet to `[diff] always = True`.
- The post overstated diff mode as showing every file or every change Ansible touches. Official documentation states that only modules supporting diff mode report before-and-after information. Reworded the introduction, description, and check-mode section to make the module-support limitation explicit.
- The sysctl example claimed the `sysctl` module would emit parameter diffs. Current `ansible.posix.sysctl` documentation does not document diff-mode support, and the module source exits only with `changed` without returning a diff. Updated the example to manage sysctl configuration entries with `lineinfile`, which has full diff-mode support.
- The module support list incorrectly claimed `sysctl`, `user`, and `group` produce useful diff output. Current official docs show `user` and `group` have `diff_mode: none`, and `sysctl` does not document diff-mode support. Removed those entries from the supported-module list.
- The JSON callback example used `ANSIBLE_STDOUT_CALLBACK=json`. Current documentation identifies the callback as `ansible.posix.json` and notes it is supplied by the `ansible.posix` collection, not `ansible-core`. Updated the command and added a short collection note.
- The final paragraph claimed diff mode costs nothing in performance and gives full transparency. Reworded it because official configuration includes a maximum diff-size setting and documentation warns diff mode can produce large output.

## Review Notes
The remaining playbook snippets and commands are technically valid for modern Ansible syntax. The local environment did not have `ansible` or `ansible-playbook` installed, so CLI verification was performed against official documentation rather than local `--help` output.
