# Validation Summary: How to Fix Ansible Failed to lock apt Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- APT/dpkg package locking
- Ubuntu/Debian unattended upgrades
- systemd timers
- Ansible playbook modules and facts

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible playbook execution and `serial` documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ubuntu Server automatic updates documentation: https://ubuntu.com/server/docs/how-to/software/automatic-updates/
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `ansible.builtin.package` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The post recommended generic task retries as the most robust apt lock solution. Current Ansible provides the `lock_timeout` parameter on `ansible.builtin.apt`, so the robust solution was changed to use `lock_timeout: 300`.
- The opening explanation said only one apt process can run at a time. This was tightened to describe apt/dpkg package database locks, which is more accurate.
- The post suggested stopping only the `unattended-upgrades` service and claimed this eliminates the deployment race entirely. Ubuntu automatic updates are triggered by `apt-daily.timer` and `apt-daily-upgrade.timer`, so the example now pauses and restarts those timers and the summary now says this reduces the chance of automatic updates starting during deployment.
- The `serial: 1` section implied it fixed apt contention from another Ansible task. The explanation now clarifies that apt locks are per host and that `serial` limits rolling deployments across hosts, while same-host package jobs should not run concurrently.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. The module reference was corrected.
- The Common Use Cases section referred to "this module" even though the post is about apt lock handling patterns, not a single module. Those references were changed to "these patterns."

## Review Notes
Local `ansible` and `ansible-doc` commands were not available in the workspace, so syntax and module behavior were verified against current official Ansible and Ubuntu documentation instead of local CLI help. The stale lock file removal example remains gated by `force_apt_unlock | default(false)` and correctly cautions that it should be used carefully.
