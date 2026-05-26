# Validation Summary: How to Reduce Ansible Module Transfer Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible configuration
- Ansible SSH connection plugin
- Ansible modules: raw, command, shell, set_fact, copy, template
- ansible.posix synchronize module
- SSH, SFTP, SCP, rsync

## Sources Consulted
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible ssh connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible raw module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html
- Ansible command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible shell module: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible set_fact module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html
- Ansible template module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.posix synchronize module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- ansible.posix profile_tasks callback: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html

## Issues Found
- The post described every Ansible task as transferring a Python module over SFTP or SCP. Changed this to "most Python-backed modules" and included the piped transfer method, because Ansible has modules and action paths that do not follow that exact behavior.
- The pipelining section made overly absolute claims about no temp files, no chmod, and all operations dropping to one. Reworded this to match Ansible's documented behavior: supported connection plugins can execute many modules without actual file transfer and reduce network operations. Added the documented `requiretty` and `ANSIBLE_KEEP_REMOTE_FILES` caveats.
- The `module_compression = ZIP` example was not the documented value. Changed it to `module_compression = ZIP_DEFLATED`, which Ansible documents as the default module compression scheme.
- The `raw` module section said `changed_when` could not be based on return values, while the examples used `changed_when`. Clarified that `raw` returns unstructured output but still exposes fields such as `stdout`, `stderr`, and `rc` for task conditionals.
- The `set_fact` section incorrectly claimed large facts are sent to the remote host with every later module call. Corrected it to explain that facts stay in host variable data on the controller and become a payload concern when passed into module arguments or rendered into templates.
- The SCP section used `scp_if_ssh = True`, which is removed in recent ansible-core in favor of the SSH transfer method option. Replaced it with `transfer_method = scp`, clarified smart mode order, and added the OpenSSH 9.0 legacy SCP caveat.
- The loop example said one loop task equals one module transfer. Corrected it to say the playbook has one task but still executes the module once per item.
- The `command: mkdir -p /opt/app/{logs,data,tmp,config,bin}` example relied on shell brace expansion, but the Ansible `command` module does not process shell metacharacters. Replaced it with explicit directory arguments.
- The profiling example used the short callback name `profile_tasks`. Updated it to `ansible.posix.profile_tasks`, matching current collection documentation, and softened the measurement claim because run-to-run differences include connection overhead and remote execution variance.

## Review Notes
The recommended configuration is broadly valid for SSH-based Linux targets, but exact performance results depend on Ansible version, OpenSSH version, privilege escalation settings, network latency, and whether the `ansible.posix` collection is installed. The `synchronize` module is part of `ansible.posix`, not `ansible-core`, so environments that install only ansible-core need that collection installed separately.
