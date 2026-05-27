# Validation Summary: How to Use Ansible to Install Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and inventory
- Redis Open Source installation
- Debian/Ubuntu APT repositories
- RHEL-compatible RPM repositories
- systemd service management
- Linux sysctl tuning
- Redis source builds

## Sources Consulted
- Redis Open Source Linux installation docs: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/
- Redis archived Linux installation docs: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Redis source installation docs: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-from-source/
- Redis administration setup tips: https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- Redis latency and Transparent Huge Pages guidance: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Ansible `apt_key` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `apt` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `apt_repository` examples and signed keyring guidance: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `yum_repository` module docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible `yum` redirect to `dnf` docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_module.html
- Ansible `systemd_service` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.posix.sysctl` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The Debian/Ubuntu snippets used `ansible.builtin.apt_key`, but Ansible documents that the underlying `apt-key` command is deprecated and removed in modern Debian versions. Replaced it with a downloaded keyring file and an APT repository entry using `signed-by`.
- The Debian/Ubuntu package task installed `redis-server`, while current Redis package repository docs use the `redis` package. Updated the package name while keeping the Debian service name as `redis-server`.
- The multi-OS playbook used an invalid Redis RPM base URL pattern, `https://packages.redis.io/rpm/rhel$releasever/$basearch`. Updated it to the documented Rocky/Alma-compatible repository layout, `https://packages.redis.io/rpm/rockylinux{{ ansible_distribution_major_version }}`.
- The article referred to RHEL/CentOS 8+ support, but CentOS 8 is outdated and Redis's current RPM repository docs name Rocky Linux and AlmaLinux. Updated platform wording to RHEL-compatible systems such as Rocky Linux and AlmaLinux.
- The multi-OS playbook installed Redis on Debian but then always started the `redis` service. Updated it to choose `redis-server` on Debian-family hosts and `redis` on RedHat-family hosts.
- The verification playbook always checked `redis-server`, which is wrong for RPM and source installs. Added a service-name variable with a Debian/RPM default.
- The source-install systemd unit referenced `/etc/redis/redis.conf`, but the playbook never created that directory or installed the config file. Added tasks to create `/etc/redis` and copy the Redis source `redis.conf`.
- The post used `ansible.posix.sysctl` without listing the required `ansible.posix` collection. Added it to the prerequisites.
- Updated systemd examples to use the current `ansible.builtin.systemd_service` module name.

## Review Notes
The playbook snippets were checked for YAML syntax after editing. The post still does not show applying the `redis_maxmemory` and `redis_maxmemory_policy` variables from the basic install example; that is acceptable for an installation-focused post, but a future configuration post should wire those into `redis.conf` explicitly.
