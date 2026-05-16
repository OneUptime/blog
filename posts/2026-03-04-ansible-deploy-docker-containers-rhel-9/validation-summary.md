# Validation Summary: How to Use Ansible to Deploy Docker Containers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Docker Engine / Docker CE
- Docker Compose
- Ansible
- community.docker Ansible collection
- firewalld
- Nginx, Redis, and PostgreSQL containers

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose secrets - https://docs.docker.com/reference/compose-file/secrets/
- Ansible Community Documentation: community.docker collection - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/
- Ansible Community Documentation: docker_image module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible Community Documentation: docker_container module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible Community Documentation: docker_network module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible Community Documentation: docker_compose_v2 module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Red Hat Documentation: Building, running, and managing containers in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- firewalld Documentation: Add a Service - https://firewalld.org/documentation/howto/add-a-service.html

## Issues Found
- The Docker installation playbook did not remove `runc`, which Docker's RHEL installation documentation lists as a conflicting package. Added `runc` to the removal list.
- The dependency task listed `device-mapper-persistent-data` and `lvm2` as required dependencies, but current Docker RHEL installation documentation only requires `dnf-plugins-core` before adding the repository. Updated the task to install repository tooling only.
- The Docker package list omitted `docker-buildx-plugin`, which is part of Docker's current recommended RHEL package install command. Added `docker-buildx-plugin`.
- The Compose file used the obsolete top-level `version` field. Removed `version: "3.8"` so the snippet uses the current Compose Specification style.
- The Compose example mounted `./nginx.conf` but the playbook never created that file, which would make the deployment fail or behave unexpectedly. Removed the missing bind mount.
- The PostgreSQL service referenced `/run/secrets/db_password` without declaring or granting a Compose secret. Replaced it with an explicit example `POSTGRES_PASSWORD` value so the Compose stack can start as written.
- The closing paragraph claimed the `community.docker` collection provides modules for every Docker operation. Narrowed this to "many common Docker operations" to avoid an overbroad technical claim.

## Review Notes
The tutorial remains a Docker-on-RHEL compatibility guide. Red Hat's native RHEL container tooling is Podman-based, and the post correctly notes that Podman should be considered for new RHEL projects. The example PostgreSQL password is intentionally a placeholder and should be replaced with a real secret-management approach in production.
