# Validation Summary: How to Fix 'Service Module' Start/Stop Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- ansible.builtin.service
- ansible.builtin.systemd_service
- ansible.builtin.sysvinit
- ansible.builtin.wait_for
- ansible.builtin.template
- systemd / systemctl / journalctl
- Linux service management

## Sources Consulted
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.sysvinit` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sysvinit_module.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- systemctl manual page: https://www.man7.org/linux/man-pages/man1/systemctl.1.html

## Issues Found
- Updated `ansible.builtin.systemd` examples to `ansible.builtin.systemd_service`, because current Ansible documentation says `systemd` is retained as a backward-compatible alias for the renamed module.
- Corrected the fallback init-system example so `ansible.builtin.sysvinit` is only used for `ansible_service_mgr == "sysvinit"`. The previous version used `sysvinit` for non-SysV service managers, which is outside that module's documented scope.
- Added `/usr/lib/systemd/system/nginx.service` to the service-file location checks, since this is a common systemd unit directory.
- Simplified the apt dependency example to install `nginx` directly, letting the package manager resolve dependencies instead of naming distribution-specific packages such as `libpcre3`.
- Added systemd guards around `systemd_service`, `systemctl`, and `journalctl` operations that only apply on systemd-managed hosts.
- Reworked the masked-service example to use `ansible.builtin.systemd_service` with `masked: no` instead of shelling out to `systemctl unmask`, and guarded it for systemd hosts.
- Removed the macOS/Darwin entry from the cross-platform service example and narrowed the wording to Linux and BSD systems. The generic Ansible service module documentation does not describe launchd/macOS service management support.
- Corrected the masked-service reference table. A masked unit is not simply disabled; systemd treats it as impossible to start until unmasked.
- Updated the quick diagnostic command for listing services to include `--all`, so it matches the comment "List all services" rather than listing only active loaded service units.

## Review Notes
All YAML code blocks parsed successfully with PyYAML. `ansible-playbook` was not installed in the local environment, so full Ansible syntax-check execution was not available.
