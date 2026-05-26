# Validation Summary: How to Use Ansible to Manage Container Orchestration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker Swarm
- Docker CLI
- community.docker Ansible collection
- Kubernetes
- kubernetes.core Ansible collection
- community.general Ansible collection
- UFW
- SSH service management

## Sources Consulted
- Docker CLI reference: docker swarm init: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker CLI reference: docker swarm join-token: https://docs.docker.com/reference/cli/docker/swarm/join-token/
- Docker Swarm guide: join nodes to a swarm: https://docs.docker.com/engine/swarm/join-nodes/
- Ansible community.docker.docker_stack module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_stack_module.html
- Ansible community.docker.docker_swarm_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_service_module.html
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible kubernetes.core.k8s_scale module documentation: https://docs.ansible.com/projects/ansible/devel/collections/kubernetes/core/k8s_scale_module.html
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html

## Issues Found
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the timezone module is provided by the `community.general` collection. Changed it to `community.general.timezone`.
- The Kubernetes `k8s_info` and `k8s_scale` examples targeted Deployments without explicitly setting `api_version`. Since Kubernetes Deployments are `apps/v1` resources, added `api_version: apps/v1` to both tasks.
- The SSH restart handler used `sshd`, which fails on Debian-family systems where the service is commonly named `ssh`. Updated the handler to select `ssh` on Debian-family hosts and `sshd` elsewhere.

## Review Notes
- The Docker Swarm CLI commands and Ansible `community.docker` module parameters are current and match the official documentation.
- The Docker stack example is valid for stack deployment. Future revisions could mention that `community.docker.docker_swarm_service` does not update services that are managed as part of a stack.
- The Kubernetes examples assume the controller has a working kubeconfig or equivalent Kubernetes authentication configuration.
