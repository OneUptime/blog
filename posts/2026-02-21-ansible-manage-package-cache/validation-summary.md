# Validation Summary: How to Use Ansible to Manage Package Cache

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt
- ansible.builtin.dnf
- APT / apt-get
- DNF / YUM
- Linux package cache configuration
- Docker image package-cache cleanup

## Sources Consulted
- Ansible documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.dnf module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- DNF command reference - https://dnf.readthedocs.io/en/latest/command_ref.html
- DNF configuration reference - https://dnf.readthedocs.io/en/latest/conf_ref.html
- Ubuntu manpage: apt.conf(5) - https://manpages.ubuntu.com/manpages/jammy/man5/apt.conf.5.html
- Ubuntu manpage: apt-get(8) - https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-get.8.html

## Issues Found
- The APT pre-warming example used `download_only: true` with `ansible.builtin.apt`, but the official Ansible APT module does not support a `download_only` parameter. Changed the example to update the APT cache with `ansible.builtin.apt` and then run `apt-get --download-only install -y ...` through `ansible.builtin.command`.
- The DNF cache update example used `ansible.builtin.dnf` with only `update_cache: true` and described it as equivalent to `dnf makecache`. The Ansible documentation describes `update_cache` as applying to package transactions with `state=present` or `state=latest`, so the standalone cache-refresh example was changed to `dnf makecache`.
- The APT configuration example described `APT::Cache-Limit` as limiting downloaded package cache size. The apt.conf documentation says `APT::Cache-Limit` limits APT's memory-mapped package metadata cache, not downloaded `.deb` archives. Removed that setting from the example and adjusted the comment around periodic cache cleanup.
- The cache-purpose explanation implied that both package managers always keep downloaded packages. DNF's `keepcache` behavior is configurable, so the wording was adjusted to say downloaded packages may be kept depending on configuration.

## Review Notes
The remaining Ansible examples use current fully qualified module names and documented options. The DNF examples intentionally use `ansible.builtin.command` for cache cleaning and rebuilding because Ansible's DNF module does not provide direct clean-cache parameters equivalent to `dnf clean all` or `dnf clean metadata`.
