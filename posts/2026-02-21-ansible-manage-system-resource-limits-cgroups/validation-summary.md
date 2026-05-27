# Validation Summary: How to Use Ansible to Manage System Resource Limits (cgroups)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- systemd service unit drop-ins
- systemd slice units
- Linux cgroups v1 and cgroups v2
- systemctl and systemd-cgtop commands
- PAM limits configuration

## Sources Consulted
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- systemd resource-control manual: https://www.freedesktop.org/software/systemd/man/249/systemd.resource-control.html
- systemd system.conf/user.conf manual: https://www.freedesktop.org/software/systemd/man/256/systemd-system.conf.html
- systemd slice manual: https://www.freedesktop.org/software/systemd/man/256/systemd.slice.html
- systemd special units manual: https://www.freedesktop.org/software/systemd/man/256/systemd.special.html
- Local `systemctl --help` and `systemd-cgtop --help` output
- Local `pam_limits(8)` manual page

## Issues Found
- The service override playbook reloaded systemd but did not restart the affected services, so persistent unit drop-in changes might not apply to already running service cgroups. Updated the task to use `ansible.builtin.systemd_service` with `state: restarted`, `daemon_reload: true`, and a loop over the affected services.
- The examples used `ansible.builtin.systemd`, which Ansible documents as a backward-compatible alias for the renamed `ansible.builtin.systemd_service` module. Updated examples to use the current fully qualified module name.
- The custom slice example configured `Slice=web.slice` for nginx but did not restart nginx, so the running service would not move into the new slice. Added a restart task after daemon reload.
- The user slice example generated slice names from an MD5 hash of the username. systemd user slices are named with numeric UIDs, such as `user-1000.slice`. Updated the playbook to look up each user's UID with `id -u` and write per-user drop-ins under `user-<UID>.slice.d`.
- The user slice example wrote the same fixed limits for every user instead of using the `user_limits` variables. Updated the copy task to render `TasksMax`, `MemoryMax`, and `CPUQuota` from each user's configured values.
- The default limits playbook copied files into `/etc/systemd/system.conf.d` and `/etc/systemd/user.conf.d` before ensuring both directories existed. Added directory creation tasks before the copy tasks.
- The default limits playbook used `DefaultBlockIOAccounting`, which systemd marks deprecated in favor of the unified IO accounting setting. Removed the deprecated option and kept `DefaultIOAccounting=yes`.
- The introduction said the guide covered direct cgroup configuration, but the implementation uses systemd-managed cgroups. Corrected the wording to match the actual content.
- The default limits section said the example prevented resource monopolization broadly, but it only enabled accounting and task limits. Adjusted the wording to avoid overstating CPU or memory enforcement.

## Review Notes
- YAML code blocks were parsed with PyYAML successfully after edits. `ansible-playbook` was not installed in the local environment, so full Ansible syntax checks could not be run.
- Several examples intentionally use placeholder service names and inventory groups (`mysqld`, `myapp`, `shared_servers`, `target_host`), so they still need adaptation to a real fleet.
