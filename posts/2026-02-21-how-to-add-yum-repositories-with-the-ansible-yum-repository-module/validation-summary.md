# Validation Summary: How to Add YUM Repositories with the Ansible yum_repository Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.yum_repository
- ansible.builtin.dnf
- ansible.builtin.yum
- ansible.builtin.rpm_key
- YUM and DNF repository configuration
- RHEL, CentOS, Fedora EPEL, and Docker RPM repositories

## Sources Consulted
- Ansible yum_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible rpm_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rpm_key_module.html
- Docker Engine on CentOS documentation: https://docs.docker.com/engine/install/centos/
- Docker Engine on RHEL documentation: https://docs.docker.com/engine/install/rhel/
- Docker CentOS repository file: https://download.docker.com/linux/centos/docker-ce.repo
- Docker RHEL repository file: https://download.docker.com/linux/rhel/docker-ce.repo
- Fedora EPEL metalink endpoint: https://mirrors.fedoraproject.org/metalink?repo=epel-9&arch=x86_64
- DNF configuration reference for repository options: https://man7.org/linux/man-pages/man5/dnf.conf.5.html

## Issues Found
- The EPEL example used `https://dl.fedoraproject.org/pub/epel/$releasever/$basearch/`, which is not the valid EPEL 8/9 repository root layout. Changed the example to use Fedora's EPEL metalink pattern, which resolves to the appropriate mirrors for the release and architecture.
- The Docker workflow was labeled for RHEL/CentOS but used Docker's CentOS repository URL. Updated the comment to scope the example to CentOS.
- The Docker prerequisite package list used older guidance (`yum-utils`, `device-mapper-persistent-data`, and `lvm2`). Updated it to `dnf-plugins-core`, matching current Docker CentOS installation documentation.
- The parameter table listed `gpgcheck` as defaulting to `yes`. Ansible documents no module default; if unset, yum/dnf uses the system setting or system default. Updated the table default to "System setting."

## Review Notes
The examples use boolean values such as `yes` and `no`, which remain accepted YAML booleans and are common in Ansible playbooks. For RHEL-specific Docker installs, Docker now publishes a separate `https://download.docker.com/linux/rhel/docker-ce.repo` repository file; the post's Docker example is now explicitly scoped to CentOS.
