# Validation Summary: How to Use Ansible Ad Hoc Commands to Manage Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.service
- ansible.builtin.systemd_service
- systemd and systemctl
- journalctl
- Linux service management

## Sources Consulted
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ad hoc commands documentation: https://docs.ansible.com/projects/ansible/latest/command_guide/intro_adhoc.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html

## Issues Found
- The post used the older `systemd` module name. Ansible documents the current module as `ansible.builtin.systemd_service`, with `systemd` kept as a compatibility alias, so the post now uses `systemd_service`.
- The `service state=reloaded` comment omitted that Ansible starts the service if it is not already running. The comment now includes that behavior.
- The privilege escalation sentence said `--become` is required. This is usually true for system service management, but not universally true, so the wording now says it is usually required.
- The systemctl status examples were presented without a systemd scope caveat. The status section now states that those checks are for systemd hosts.
- The deployment health-check command used double quotes around shell code containing `$svc` and command substitution, which would be expanded by the controller's shell before Ansible sent the command to managed hosts. The command now uses single quotes around the Ansible argument.
- The multi-service `systemctl is-active nginx postgresql redis` example could report a zero exit status if at least one unit was active, even when another listed unit was inactive. It now prints each service state in a loop.
- The emergency-stop verification command would make Ansible report failure when the service was correctly inactive. It now uses `|| true` so the inactive state can be inspected as verification output.
- The emergency-stop comment described `-f 50` as maximum parallelism. Ansible documents `-f` as the number of forks, so the comment now says high parallelism.

## Review Notes
The post is now technically valid for current Ansible documentation. Future improvements could mention that `systemctl status` and `journalctl` are systemd-specific, while the `service` module examples remain appropriate for mixed init systems.
