# Validation Summary: How to Use Ansible to Manage GPG Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- GnuPG/GPG key generation, import, export, ownertrust, and deletion
- APT repository signing keys
- RPM/YUM repository signing keys
- Kubernetes, Docker, and HashiCorp package repository keys

## Sources Consulted
- Ansible `ansible.builtin.rpm_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rpm_key_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible facts and magic variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- GnuPG unattended key generation documentation: https://www.gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
- GnuPG input/output and `--with-colons` documentation: https://gnupg.org/documentation/manuals/gnupg/GPG-Input-and-Output.html
- GnuPG trust values documentation: https://www.gnupg.org/documentation/manuals/gnupg/Trust-Values.html
- GnuPG configuration options documentation: https://www.gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html
- Docker RPM repository metadata: https://download.docker.com/linux/centos/docker-ce.repo
- HashiCorp RPM repository metadata: https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
- Kubernetes releases page: https://kubernetes.io/releases/
- Kubernetes package repository keys under `pkgs.k8s.io`

## Issues Found
- The repository-key example used one `url` field for both Debian and Red Hat hosts, which meant the `rpm_key` task would try to import Debian/Ubuntu key URLs on Red Hat systems. I split the variable into `apt_url` and `rpm_url`, and used the documented RPM key URLs for Docker, HashiCorp, and Kubernetes.
- The Kubernetes repository key example referenced `v1.29`, which is no longer one of the currently maintained Kubernetes minor releases on 2026-05-27. I updated the example to `v1.34`, matching the current latest release line shown on the official Kubernetes releases page.
- The public-key distribution example used `hostvars['backup_primary']`, but `backup_primary` is normally an inventory group in this playbook. I changed it to `hostvars[groups['backup_primary'][0]]` so it resolves the first host in that group.
- The key-rotation example extracted all matching `pub` expiration fields, which can produce multiple lines if several keys match the same user ID. I changed the command to emit the first primary-key expiration value only.
- The days-until-expiration calculation assumed the GnuPG expiration field was always populated. I added an explicit non-expiring-key fallback so keys without an expiration do not break the Jinja expression.

## Review Notes
The examples still use shell commands for several GPG operations because Ansible core does not provide full first-party GPG key lifecycle modules. For production use, these snippets would benefit from fingerprint verification before trusting imported user keys and from more explicit backup and rotation validation steps.
