# Validation Summary: How to Automate RHEL Patching with Ansible

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Ansible playbooks
- ansible.builtin.dnf
- ansible.builtin.reboot
- ansible.builtin.wait_for_connection
- ansible.builtin.systemd
- DNF updateinfo and history commands
- systemd service health checks

## Sources Consulted
- Ansible documentation: ansible.builtin.dnf module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible documentation: Controlling playbook execution with serial, https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_strategies.html
- Ansible documentation: ansible.builtin.reboot module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/reboot_module.html
- Ansible documentation: ansible.builtin.wait_for_connection module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible documentation: ansible.builtin.systemd_service module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: ansible.builtin.pause module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pause_module.html
- Red Hat Customer Portal: Identify packages that will require a system reboot after an update, https://access.redhat.com/solutions/27943
- DNF command reference: updateinfo and history commands, https://dnf.readthedocs.io/en/stable/command_ref.html
- Red Hat Enterprise Linux documentation: Displaying installed security updates with DNF, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/pdf/risk_reduction_and_recovery_operations/configuring-logging-by-using-rhel-system-roles

## Issues Found
- The `needs-restarting -r` tasks used `failed_when: false`, which would also hide unexpected failures such as the command being missing. Updated both examples to fail unless the return code is `0` or `1`, while still treating `1` as "reboot required".
- The description and full-playbook heading claimed rollback capabilities, but the post does not implement an actual rollback operation. Updated the wording to describe reboot handling and validation instead.
- The patch report used `dnf updateinfo list installed --security`. Updated it to Red Hat's documented form, `dnf updateinfo list security --installed`.

## Review Notes
- The Ansible `dnf` module documentation notes that `list:` is a non-idempotent listing operation and recommends `package_facts` as a best practice for playbooks. The examples still work as reporting/checking snippets, but a future revision could use a more idempotent reporting pattern.
- The staged rollout example references `tasks/patch-and-verify.yml` without defining that task file. This is acceptable as an abbreviated example, but a production version should include the task file or convert it into a role.
- YAML snippets were parsed successfully after the corrections. A full Ansible syntax check was not run because Ansible is not installed in the local environment.
