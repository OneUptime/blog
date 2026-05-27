# Validation Summary: How to Use Ansible to Set Up Docker Registry Mirror

## Status
validated

## Post Type
Tutorial / Infrastructure guide

## Technologies Covered
- Ansible
- Docker Engine
- Docker Registry / CNCF Distribution
- Docker Hub registry mirrors
- TLS certificates for Docker registries

## Sources Consulted
- Docker Docs: Mirror the Docker Hub library - https://docs.docker.com/docker-hub/image-library/mirror/
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/pulls/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Verify repository client with certificates - https://docs.docker.com/engine/security/certificates/
- Docker Hub: registry official image - https://hub.docker.com/_/registry
- CNCF Distribution: Configuring a registry - https://distribution.github.io/distribution/about/configuration/
- Ansible Documentation: community.docker.docker_container module - https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible Documentation: ansible.builtin.slurp module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/slurp_module.html
- Ansible Documentation: filters for manipulating data - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html

## Issues Found
- The introduction described mirroring Docker Hub or another remote registry as if Docker Engine's `registry-mirrors` workflow applied equally to all registries. Updated the wording to focus on Docker Hub, matching Docker's mirror documentation.
- The rate-limit section said a mirror counts as a single pull regardless of the number of nodes. Updated this to "rate limit reduction" because Docker Hub mirrors reduce repeated upstream pulls for cached content but remain subject to Docker Hub fair use policy and current pull limits.
- The reliability wording implied cached images are always available during an outage. Softened this to say cached content may still be available locally.
- The examples used `registry:2.8` and mounted configuration at `/etc/docker/registry/config.yml`. Updated them to the current official `registry:3` image and the documented `/etc/distribution/config.yml` configuration path.
- The TLS mirror playbook wrote `/opt/registry-mirror/config/config.yml` without first creating the config directory. Added explicit creation of the data, config, and certificate directories.
- The secure client playbook referenced an external `templates/daemon.json.j2` file that was not shown in the post. Replaced it with the same inline `daemon.json` merge pattern used in the non-TLS client example.
- The multiple-registry example used GHCR and Quay as if they were transparent Docker Engine registry mirrors. Reworked the section to show multiple Docker Hub mirror instances and noted that `registry-mirrors` is for Docker Hub mirrors.
- The cleanup command used the old registry image and configuration path. Updated it to `registry:3 garbage-collect /etc/distribution/config.yml`.

## Review Notes
The playbooks are illustrative and assume Docker Engine, the `community.docker` Ansible collection, and valid TLS certificate files are already present. The cache catalog and disk usage tasks are useful health checks, but they should not be treated as complete registry observability.
