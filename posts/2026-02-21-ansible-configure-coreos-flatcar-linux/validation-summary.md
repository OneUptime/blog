# Validation Summary: How to Use Ansible to Configure CoreOS/Flatcar Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and modules
- Flatcar Container Linux
- CoreOS Container Linux migration context
- Docker and containerd
- systemd services and timers
- Flatcar automatic updates with update_engine and locksmithd
- Flatcar systemd-sysext extensions
- Linux sysctl configuration

## Sources Consulted
- Flatcar Container Linux overview and core tenets: https://www.flatcar.org/docs
- Flatcar Ignition documentation: https://www.flatcar.org/docs/latest/provisioning/ignition/
- Flatcar systemd-sysext documentation: https://www.flatcar.org/docs/latest/provisioning/sysext/
- Flatcar update.conf specification: https://www.flatcar.org/docs/latest/setup/releases/update-conf/
- Flatcar update and reboot strategies: https://www.flatcar.org/docs/latest/setup/releases/update-strategies/
- Flatcar Docker customization documentation: https://www.flatcar.org/docs/latest/container-runtimes/customizing-docker/
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible sysctl module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Docker logging driver and daemon.json documentation: https://docs.docker.com/engine/logging/configure/
- systemd.timer documentation: https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html

## Issues Found
- The post described Flatcar as having a read-only root filesystem. Flatcar's base OS partition is read-only and immutable, while user-writable locations such as `/etc` are used for configuration. Updated the wording to "read-only OS partition."
- The post claimed all software runs in containers. Flatcar user applications generally run as containers, but OS-level additions can also be provided through system extensions. Updated the claim to include system extensions.
- The post listed Ignition/cloud-init for initial provisioning. Current Flatcar provisioning uses Ignition, usually generated from Butane; cloud-config/coreos-cloudinit is legacy. Updated the provisioning wording.
- The Python bootstrap example installed Alpine Python in a container and copied only parts of it to `/opt/bin`, which would not reliably produce a working host Python interpreter because the copied binary depends on Alpine runtime libraries. Replaced it with Flatcar's official `python` system extension workflow and pointed `ansible_python_interpreter` at `/usr/bin/python3`.
- The update window example used `LOCKSMITHD_REBOOT_WINDOW_START=02:00`, but Flatcar's documented examples include a weekday in the locksmith maintenance window syntax. Changed it to `LOCKSMITHD_REBOOT_WINDOW_START="Thu 02:00"`.
- The Docker daemon configuration wrote to `/etc/docker/daemon.json` without ensuring the parent directory exists. Added a directory task before the copy task.
- The infrastructure workflow used package installation and UFW, which do not fit Flatcar's no-package-manager model. Replaced the package task with a Docker runtime check and replaced UFW usage with a systemd-managed iptables example.
- The scheduling example used cron. Flatcar is systemd-centered and cron should not be assumed. Replaced it with a systemd service and timer.
- The scheduling example copied a script into `/opt/scripts` without creating the directory. Added an Ansible file task to create it first.

## Review Notes
The snippets were checked for YAML syntax locally. The `ansible.posix.sysctl` example is valid, but it requires the `ansible.posix` collection to be available on the Ansible control node.
