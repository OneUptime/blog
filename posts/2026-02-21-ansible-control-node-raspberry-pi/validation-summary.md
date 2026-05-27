# Validation Summary: How to Set Up Ansible Control Node on Raspberry Pi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Raspberry Pi OS
- Linux package management with apt and pip
- Python virtual environments
- SSH keys and ssh-copy-id
- Ansible inventories, configuration, playbooks, modules, callbacks, and fact caching
- Cron scheduling
- systemd-timesyncd

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible callback plugins documentation: https://docs.ansible.com/ansible/latest/plugins/callback.html
- ansible.builtin.default callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- ansible.posix.timer callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Debian crontab(5) manual: https://manpages.debian.org/bookworm/cron/crontab.5.en.html
- Raspberry Pi OS installation documentation: https://www.raspberrypi.com/documentation/installation/installing-images/
- Raspberry Pi OS documentation source noting Debian base: https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/os/rpi-os-introduction.adoc
- Ubuntu / Launchpad PPA documentation: https://documentation.ubuntu.com/launchpad/user/how-to/packaging/ppa-install/

## Issues Found
- The apt section recommended using the Ubuntu Ansible PPA on Raspberry Pi OS. Raspberry Pi OS is Debian-based, while PPAs are Ubuntu/Launchpad repositories, so I replaced the PPA commands with guidance to use the pip method when the Raspberry Pi OS repositories are too old.
- The Ansible configuration used `stdout_callback = yaml`, but the YAML stdout callback has been superseded by the default callback's `callback_result_format = yaml` setting in current Ansible. I changed the snippet to `stdout_callback = ansible.builtin.default` and `callback_result_format = yaml`.
- The Ansible configuration used `callback_whitelist`, which is outdated in current Ansible configuration. I changed it to `callbacks_enabled` and used the current fully qualified callback names `ansible.posix.timer` and `ansible.posix.profile_tasks`.
- The examples assumed the old `pi` username. Current Raspberry Pi OS setups require the user to create a username, so I changed the control-node default remote user and `ssh-copy-id` examples to use a placeholder username instead of assuming `pi`.
- The maintenance playbook referenced `../templates/timesyncd.conf.j2`, but the guide never created that template. I changed the task to use `ansible.builtin.copy` with inline content so the playbook is self-contained.
- The cron examples used `source` directly even though cron runs commands under `/bin/sh` unless another shell is configured, and they redirected logs to `/var/log`, which a regular user's crontab typically cannot write. I changed the cron entries to run through `/bin/bash -lc` and write logs under `$HOME/ansible`.

## Review Notes
Most examples are technically sound after the fixes. I could not run an Ansible syntax check in this workspace because Ansible is not installed, but the playbook and configuration snippets were reviewed against the current official Ansible documentation.
