# Validation Summary: How to Use Ansible for Container Orchestration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker Engine
- Docker Compose
- community.docker Ansible collection
- Kubernetes
- kubeadm
- kubernetes.core Ansible collection
- Calico

## Sources Consulted
- Ansible community.docker.docker_compose_v2 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html
- Ansible community.docker.docker_container module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.docker.docker_prune module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_prune_module.html
- Ansible ansible.builtin.apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Docker Engine install on Ubuntu documentation: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker dockerd CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm cluster creation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Calico self-managed on-premises installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises

## Issues Found
- The Docker installation role used `ansible.builtin.apt_key`, which relies on the deprecated `apt-key` workflow. Replaced it with `/etc/apt/keyrings/docker.asc` managed by `ansible.builtin.get_url` and a `signed-by` apt repository entry, matching current Docker and Ansible guidance.
- The Docker package list omitted `docker-buildx-plugin`, which Docker includes in the current recommended Ubuntu install command. Added it alongside `docker-ce`, `docker-ce-cli`, `containerd.io`, and `docker-compose-plugin`.
- The `community.docker.docker_compose_v2` task used `recreate: smart`, but the module only supports `always`, `never`, and `auto`. Changed the default branch to `auto`.
- The Compose template included top-level `version: "3.8"`, which Docker Compose now treats as obsolete and only informational. Removed it so the example follows the current Compose Specification.
- The Calico manifest URL was pinned to v3.26.0. Updated it to v3.32.0, the current version shown in Calico documentation at review time.

## Review Notes
- The Docker daemon metrics example binds to `0.0.0.0:9323`; this is syntactically valid, but production deployments should restrict or firewall that endpoint.
- Calico documentation recommends the Tigera Operator for new clusters, while the single `calico.yaml` manifest remains documented as a maintained compatibility option for smaller or simple installations.
