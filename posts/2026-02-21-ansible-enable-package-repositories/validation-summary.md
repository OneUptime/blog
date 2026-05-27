# Validation Summary: How to Use Ansible to Enable Package Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.yum_repository
- ansible.builtin.apt_repository
- ansible.builtin.deb822_repository
- ansible.builtin.rpm_key
- community.general.rhsm_repository
- APT repositories and signing keys
- YUM/DNF repositories
- RHEL, CentOS Stream, Debian, and Ubuntu package management

## Sources Consulted
- Ansible yum_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible apt_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_repository_module.html
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible rpm_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rpm_key_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- community.general.rhsm_repository module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/rhsm_repository_module.html
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- NGINX Open Source installation documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/
- Red Hat DNF repository management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Debian sources.list manual page: https://manpages.debian.org/unstable/apt/sources.list.5.en.html
- CentOS Stream 9 CRB repository mirror: https://mirror.stream.centos.org/9-stream/CRB/

## Issues Found
- The Debian/Ubuntu repository description only mentioned `.list` files and omitted DEB822 `.sources` files. Updated the wording to include both formats and clarify that `apt_repository` manages traditional one-line sources.
- The RHEL CodeReady Builder example used `dnf config-manager --set-enabled crb`, which is not the correct subscribed RHEL repository ID. Replaced it with `community.general.rhsm_repository` and the `codeready-builder-for-rhel-{{ ansible_distribution_major_version }}-{{ ansible_architecture }}-rpms` repo ID pattern.
- The CentOS Stream example used CentOS Stream 8 PowerTools and `mirrorlist.centos.org`, which is outdated. Replaced it with a CentOS Stream 9 CRB example using the current Stream mirror path.
- The APT examples used `ansible.builtin.apt_key`, whose underlying `apt-key` command is deprecated and removed in modern Debian versions. Replaced those examples with `/etc/apt/keyrings`, `get_url`, and `signed-by` repository definitions.
- The EPEL example imported the GPG key from a URL but configured `yum_repository.gpgkey` to use a local file that the playbook did not create. Updated `gpgkey` to the EPEL key URL.
- The repository priority example installed `yum-plugin-priorities` with `dnf`, which is misleading for modern DNF-based systems. Removed the plugin installation task and kept the repository `priority` option.
- The wrap-up said to always import GPG keys before adding repositories, which does not match the modern APT `signed-by` pattern. Changed it to configure GPG keys before adding repositories.

## Review Notes
The post is technically relevant and remains useful after the corrections. A future improvement would be adding a DEB822-specific example with `ansible.builtin.deb822_repository`, since Ansible now provides that module and modern APT documentation prefers DEB822 sources.
