# Validation Summary: How to Install Packages with the Ansible apt Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.get_url
- ansible.builtin.debconf
- ansible.builtin.service
- APT package management
- Debian and Ubuntu package installation
- YAML playbooks

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.debconf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/debconf_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ubuntu package details for `php8.3` and `libapache2-mod-php`: https://packages.ubuntu.com/noble/php8.3 and https://packages.ubuntu.com/noble/libapache2-mod-php
- Ubuntu package details for Docker-related packages: https://packages.ubuntu.com/noble/docker.io and https://packages.ubuntu.com/noble/docker-compose-v2
- Slack `.deb` download URL, verified with HTTP HEAD request: https://downloads.slack-edge.com/releases/linux/4.35.126/prod/x64/slack-desktop-4.35.126-amd64.deb

## Issues Found
- The standalone cache-update example installed `docker-ce` and `docker-compose-plugin`, which require Docker's external apt repository and will not work on a stock Ubuntu apt configuration. Changed the example package list to `curl` and `wget`.
- The `state: latest` example included `libssl3`, which is release-specific and is not the current package name on all supported Ubuntu releases. Removed `libssl3` from the example.
- The `.deb` installation section described the package as local without clarifying that `ansible.builtin.apt` expects the `deb` path on the target host. Updated the wording and added the documented `xz-utils` requirement.
- The LAMP example pinned PHP 8.2 package names, which can fail on Ubuntu releases where the default PHP version differs. Replaced versioned PHP packages with the default PHP metapackages.

## Review Notes
The core Ansible `apt` examples for `state: present`, list installs, `update_cache`, `cache_valid_time`, `state: latest`, exact package versions, `state: fixed`, `install_recommends`, debconf preseeding, and service handlers match current official Ansible documentation.
