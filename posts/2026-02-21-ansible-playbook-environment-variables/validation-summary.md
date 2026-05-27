# Validation Summary: How to Use Ansible Playbook Environment Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `environment` keyword
- YAML playbook configuration
- Jinja2 variable interpolation and `combine` filter
- Ansible modules: `command`, `copy`, `apt`, `pip`, `get_url`, `lineinfile`, `file`, `systemd`
- systemd service environment files and drop-in overrides
- Ansible Vault

## Sources Consulted
- Ansible Core documentation: Setting the remote environment - https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible Core documentation: Blocks - https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible Core documentation: Precedence rules - https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html
- Ansible Core documentation: `ansible.builtin.combine` filter - https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/combine_filter.html
- Ansible documentation: `ansible.builtin.lineinfile` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible documentation: `ansible.builtin.systemd_service` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- systemd documentation: `systemd.service` - https://www.freedesktop.org/software/systemd/man/253/systemd.service.html
- systemd documentation: `systemd.exec` - https://www.freedesktop.org/software/systemd/man/249/systemd.exec.html

## Issues Found
- The play-level Java example set `JAVA_HOME` to Java 17 while using `-XX:MaxPermSize=128m` in `MAVEN_OPTS`. `MaxPermSize` is obsolete for modern JVMs and is not appropriate for a Java 17 example. Changed `MAVEN_OPTS` to `"-Xmx512m"`.
- The systemd persistence example wrote `EnvironmentFile=/etc/myapp/environment` directly into a drop-in file with `lineinfile`. systemd service-specific execution settings must be under a `[Service]` section, and the drop-in directory must exist before the override file is written. Replaced the example with a `file` task to create `/etc/systemd/system/myapp.service.d` and a `copy` task that writes a valid `[Service]` drop-in.

## Review Notes
The Ansible `environment` keyword usage at task, play, and block scope is consistent with official Ansible documentation. The dictionary reuse and `combine` examples are valid. The post correctly notes that `environment` affects task execution and does not persist variables on the remote host.
