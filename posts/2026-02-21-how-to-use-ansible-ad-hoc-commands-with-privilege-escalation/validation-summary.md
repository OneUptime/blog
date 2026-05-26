# Validation Summary: How to Use Ansible Ad Hoc Commands with Privilege Escalation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- Ansible privilege escalation with become
- sudo, su, doas, pfexec, and pbrun become methods
- Ansible inventory variables
- ansible.cfg privilege escalation settings
- Ansible built-in modules: apt, service, systemd/systemd_service, copy, file, lineinfile, shell, raw
- Ansible Vault

## Sources Consulted
- Ansible `ansible` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible become plugins documentation: https://docs.ansible.com/ansible/latest/plugins/become.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible ad hoc command guide: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html

## Issues Found
- The post used `ANSIBLE_BECOME_PASSWORD` as an environment variable for a sudo password. The official docs document `ansible_become_password` as the connection variable, while become-plugin password environment variables use plugin-specific names such as `ANSIBLE_BECOME_PASS`. I changed the example to pass `ansible_become_password` as an extra variable and clarified that the Vault file should define that variable.
- The post described `ansible all -m apt -a "upgrade=yes" --become -e "ansible_apt_upgrade_type=safe"` as installing security updates only. The `apt` module's `upgrade` parameter accepts values such as `yes`, `safe`, `full`, and `dist`; `ansible_apt_upgrade_type` is not a documented module parameter and the command was not security-only. I changed the example to a safe upgrade using `upgrade=safe`.
- The post showed `--become=false` as a command-line override. The official `ansible` CLI documents `--become`/`-b` but not a `--become=false` option. I changed the override example to use the documented `ansible_become=false` variable via `-e`.
- The security best-practice section recommended restricting sudoers to individual commands such as `/usr/bin/systemctl`. The Ansible privilege escalation docs state that privilege escalation cannot generally be limited to certain command paths because Ansible runs modules from temporary file names. I changed the guidance to scope where the Ansible account can connect and where `ansible_become=true` is used, while keeping a normal module-compatible sudoers example.

## Review Notes
Ansible was not installed in the local environment, so local `ansible --help` verification was not available. The review used current official Ansible documentation instead. Some examples remain environment-dependent, such as Debian/Ubuntu-specific `apt`, Linux-specific `/var/log/auth.log`, and host-specific service names, but they are technically plausible in the contexts implied by the post.
