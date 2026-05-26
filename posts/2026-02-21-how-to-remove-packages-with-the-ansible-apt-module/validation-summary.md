# Validation Summary: How to Remove Packages with the Ansible apt Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible `ansible.builtin.apt` module
- Ansible `ansible.builtin.package_facts` module
- Ansible `ansible.builtin.service` module
- Debian/Ubuntu APT package management
- `apt-get remove`, `purge`, `autoremove`, `autoclean`, and `clean`

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.package_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Debian `apt-get(8)` manpage: https://manpages.debian.org/bookworm/apt/apt-get.8.en.html
- Local `apt-get --help` output from apt 2.8.3

## Issues Found
- The purge section overstated what `apt-get purge` removes by implying it always removes systemd service files and package-created data directories. Updated it to say purge removes package-managed configuration files and any additional state only when package maintainer scripts explicitly remove it.
- The cache cleanup section recommended `ansible.builtin.command` with `apt-get clean` for full cache cleanup. Current Ansible supports `ansible.builtin.apt` with `clean: yes`, so the example was updated and an ansible-core 2.13 compatibility note was added.
- The conditional removal snippet checked `ansible_facts.packages` before showing the required `package_facts` task. Moved package fact gathering before both conditional examples.
- The service migration explanation said stopping Apache would fail if Apache was already stopped. The Ansible service module treats `state: stopped` as idempotent, so the wording was corrected to say failures are expected when the service is missing or not installed.

## Review Notes
The remaining examples use supported Ansible module parameters and valid YAML task/playbook structure. The post uses `yes` for booleans, which is accepted by Ansible YAML, though newer examples often use `true`.
