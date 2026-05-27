# Validation Summary: How to Use Ansible to Configure Core Dump Settings

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible playbooks and modules
- Linux core dump configuration
- systemd-coredump and coredumpctl
- Linux sysctl settings
- PAM limits configuration
- cron-based cleanup

## Sources Consulted
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- systemd `coredump.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/249/coredump.conf.html
- systemd `systemd-coredump(8)` documentation: https://www.freedesktop.org/software/systemd/man/254/systemd-coredump.html
- systemd `coredumpctl(1)` documentation: https://www.freedesktop.org/software/systemd/man/latest/coredumpctl.html
- Linux `core(5)` manual page: https://www.man7.org/linux/man-pages/man5/core.5.html
- Linux-PAM `limits.conf(5)` manual page: https://man7.org/linux/man-pages/man5/limits.conf.5.html

## Issues Found
- The playbooks used `ansible.builtin.sysctl`, but the current documented sysctl module is `ansible.posix.sysctl`. Replaced all sysctl task FQCNs so the examples resolve correctly with the documented collection.
- The first two playbooks copied files into `/etc/systemd/coredump.conf.d` without ensuring that directory exists. Added directory creation tasks before those copy tasks.
- The production playbook comment said it set `kernel.core_pattern` to `/dev/null`, but the value actually pipes to `/bin/false`. Updated the comment to match the configuration.
- The production verification task implied that `ulimit -c` in an Ansible shell proves the PAM limit file is active. Adjusted the task name and message to clarify it shows the current task limit and that PAM limits apply to new login sessions.
- The development playbook configured a custom file-based `kernel.core_pattern` while also configuring `systemd-coredump`, but `systemd-coredump` is only used when `kernel.core_pattern` invokes it. Updated the example to set the systemd-coredump pattern and use `/var/lib/systemd/coredump` as the managed storage path.
- The monitoring shell commands used `cmd | head/tail || echo ...`; because the final pipeline command can succeed on empty input, the fallback message may never run. Reworked the `coredumpctl` availability check and adjusted the file-finding condition.
- The audit example treated any `0` in limits output as compliant. Tightened the grep and compliance expression to look specifically for `* hard core 0` and `* soft core 0`.
- The practical tips said to use a weekly cron job even though the example used a daily scheduled job. Changed the wording to "scheduled cleanup job."
- The practical tips described `ProcessSizeMax` as the saved dump size limit. systemd documents `ExternalSizeMax` as the saved external dump size limit, while `ProcessSizeMax` limits processing. Updated the guidance accordingly.

## Review Notes
- The upstream systemd documentation shows `/usr/lib/systemd/systemd-coredump` in the handler path, but some distributions may package the binary under a different compatible path or provide the setting through `/usr/lib/sysctl.d/50-coredump.conf`.
- The Ansible examples now use `ansible.posix.sysctl`; users running only `ansible-core` may need to install the `ansible.posix` collection.
