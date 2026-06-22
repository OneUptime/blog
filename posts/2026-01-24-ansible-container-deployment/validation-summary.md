# Validation Summary: How to Configure Ansible for Container Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.docker Ansible collection
- kubernetes.core Ansible collection
- Docker Engine
- Docker Compose
- Kubernetes Deployments, Services, ConfigMaps, and Namespaces
- Container registries
- Ansible Vault

## Sources Consulted
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible `community.docker.docker_compose_v2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible `community.docker.docker_compose_v2_pull` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_pull_module.html
- Ansible `community.docker.docker_login` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_login_module.html
- Ansible `community.docker.docker_network` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible `community.docker.docker_container_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_info_module.html
- Ansible `community.docker.docker_container_exec` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_exec_module.html
- Ansible `kubernetes.core.k8s` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible collection installation and listing documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html and https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_listing.html
- Docker Compose file reference for the obsolete top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker Compose pull task used `community.docker.docker_compose_v2` with `state: present`, which runs Compose up behavior rather than being a pull-only task. Changed it to `community.docker.docker_compose_v2_pull` with `policy: always`.
- The Compose deployment task used `recreate: smart`, but `docker_compose_v2` supports `always`, `never`, and `auto`. Changed it to `auto`.
- The Compose template used the top-level `version: '3.8'` field, which Docker Compose now treats as obsolete and ignores. Removed the field.
- The minimum `community.docker` collection version was too low for the newly used `docker_compose_v2_pull` module. Updated it to `>=3.6.0`, the version where that module was introduced.
- The Kubernetes rolling update task used `state: present` with a partial Deployment definition. Changed it to `state: patched` so the example explicitly patches an existing Deployment instead of implying the partial object can create a Deployment.
- The build-and-deploy example attempted to tag the image as `latest` without putting `:latest` in the `repository` parameter. Updated the tag task to use `repository: "{{ registry }}/{{ app_name }}:latest"` and `force_tag: yes`.
- The production deploy play referenced `hostvars['build_servers']`, but `hostvars` is keyed by host name, not group name. Changed the example to set the image tag with `set_fact` and read it from the first host in `groups['build_servers']`.
- The configuration summary table omitted the separate Compose pull module after the pull task was corrected. Added `docker_compose_v2_pull`.

## Review Notes
- The Docker image build example uses `community.docker.docker_image`, which remains valid, but the official documentation notes that this module builds through the Docker daemon API and does not use BuildKit/buildx. For BuildKit-specific workflows, `community.docker.docker_image_build` would be more appropriate.
- The container health-check example assumes the inspected container has Docker health status data. That is valid for containers/images configured with Docker health checks, but containers without a health check will not have `State.Health`.
