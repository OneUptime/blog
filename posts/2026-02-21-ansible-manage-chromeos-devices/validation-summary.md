# Validation Summary: How to Use Ansible to Manage ChromeOS Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ChromeOS
- Linux development environment on ChromeOS (Crostini)
- Debian package management
- OpenSSH
- Google Admin SDK Directory API
- Google Admin Console

## Sources Consulted
- Google Chromebook Help: Set up Linux on your Chromebook - https://support.google.com/chromebook/answer/9145439
- Google Chromebook Help: Access your development web servers from other devices - https://support.google.com/chromebook/answer/10057656
- ChromeOS for Developers: Port forwarding - https://developers.google.com/chromeos/app-development/develop/port-forwarding
- Google Workspace Admin SDK Directory API: ChromeOS devices - https://developers.google.com/workspace/admin/directory/v1/guides/manage-chrome-devices
- Ansible documentation: ansible.builtin.apt - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.pip - https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible documentation: ansible.builtin.uri - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible documentation: ansible.builtin.cron - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible documentation: ansible.builtin.file - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.user - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible documentation: ansible.builtin.service - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible documentation: community.general.git_config - https://docs.ansible.com/projects/ansible/latest/collections/community/general/git_config_module.html
- Ansible documentation: community.general.ufw - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The remote SSH example implied that installing `openssh-server` on Crostini was enough for a remote controller to connect on port 22. ChromeOS Linux requires port forwarding for inbound access from other devices, so the inventory and SSH setup were changed to use forwarded TCP port 2022 and the post now tells readers to enable ChromeOS Linux port forwarding.
- The development package list included `code`, but Visual Studio Code is not available from a default Debian apt repository under that package name without adding Microsoft's repository. The package was removed from the generic apt task.
- The playbook installed Python development tools globally with `ansible.builtin.pip`. On modern Debian systems, globally modifying the externally managed Python installation can fail unless a virtual environment or explicit override is used. The packages were moved to Debian packages where available.
- The summary said all Debian Ansible modules work in Crostini. That was too broad because Crostini is a container with ChromeOS boundaries. The wording now says standard Debian package and configuration modules generally work, subject to Crostini container boundaries.
- The Google Admin SDK URL used the older `www.googleapis.com` host. It was updated to the current documented `admin.googleapis.com` endpoint for ChromeOS device list requests.
- The UFW example used `community.general.ufw` without ensuring the `ufw` package was installed. The package list now includes `ufw`.
- The SSH restart handler used `sshd`, which is not the Debian service name. The handler now uses `ssh` on Debian and `sshd` otherwise.
- The scheduled scan example copied a script into `/opt/scripts` without creating the directory first and scheduled it for an `ansible` user that might not exist. The example now creates the directory and ensures the scan user exists before adding the cron entry.

## Review Notes
The corrected YAML snippets were parsed successfully with PyYAML. The post remains focused on Crostini and Google Admin API management; Docker inside Crostini may still require device-specific troubleshooting because Crostini is a containerized environment.
