# Validation Summary: How to Install Docker with Ansible on CentOS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Docker Engine
- Docker Compose plugin
- CentOS Stream
- Red Hat Enterprise Linux
- yum/dnf package management
- systemd
- firewalld
- SELinux

## Sources Consulted
- Docker Docs: Install Docker Engine on CentOS, https://docs.docker.com/engine/install/centos/
- Docker Docs: Install Docker Engine on RHEL, https://docs.docker.com/engine/install/rhel/
- Docker Docs: Packet filtering and firewalls, https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: OverlayFS storage driver, https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Ansible Documentation: ansible.builtin.yum module, https://docs.ansible.com/projects/ansible/7/collections/ansible/builtin/yum_module.html
- Ansible Documentation: ansible.builtin.systemd_service module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Documentation: ansible.builtin.pip module, https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/pip_module.html
- Ansible Documentation: ansible.posix.firewalld module, https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible Documentation: ansible.posix.selinux module, https://docs.ansible.com/ansible/latest/collections/ansible/posix/selinux_module.html

## Issues Found
- The post claimed coverage for CentOS 7 and CentOS Stream 8. Docker's current official CentOS instructions only list maintained CentOS Stream releases, so I changed the scope to maintained CentOS Stream and RHEL releases and removed the CentOS 7-specific example tasks.
- The playbook used the CentOS Docker repository for RHEL hosts. Docker publishes separate CentOS and RHEL repository paths, so I added a distribution-aware `docker_repo_os` variable in the main playbook and separate CentOS/RHEL repository commands in the version-aware example.
- The prerequisite package examples used older packages such as `yum-utils`, `device-mapper-persistent-data`, and `lvm2`. Current Docker RPM repository setup uses `dnf-plugins-core`, so I updated the package lists.
- The playbook added `docker0` to the firewalld `trusted` zone. Current Docker documentation says Docker creates its own `docker` firewalld zone and inserts bridge interfaces automatically, so I replaced that task and the troubleshooting note with a check/report of Docker's built-in firewalld integration.
- The post said `buildah` conflicts with Docker and removed it in the playbook. Docker's current RHEL conflict list includes `podman` and `runc`, not `buildah`, so I removed `buildah` from the claim and removal task.
- The reusable role metadata listed EL 7 even though the post no longer targets CentOS 7. I updated the supported EL versions to 8, 9, and 10.

## Review Notes
Docker Engine 29.0 and later uses the containerd image store by default on fresh installations; explicitly setting `"storage-driver": "overlay2"` remains documented, but future revisions could explain when to keep Docker's default storage backend instead.
