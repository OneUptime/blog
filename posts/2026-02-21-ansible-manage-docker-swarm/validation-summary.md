# Validation Summary: How to Use Ansible to Manage Docker Swarm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible inventory patterns
- Ansible playbooks
- community.docker collection
- Docker Engine
- Docker Swarm
- Docker Swarm services, nodes, labels, and join tokens

## Sources Consulted
- Ansible community.docker.docker_swarm module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_module.html
- Ansible community.docker.docker_swarm_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_info_module.html
- Ansible community.docker.docker_swarm_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_swarm_service_module.html
- Ansible community.docker.docker_node module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_node_module.html
- Ansible community.docker.docker_network module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- Docker Swarm node documentation: https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Docker Swarm join-token documentation: https://docs.docker.com/reference/cli/docker/swarm/join-token/
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
- The swarm initialization and join examples checked `can_talk_to_docker`, which can be true even when a node is already in Swarm mode but is not a manager. Changed the conditions to check `docker_swarm_active` so already-joined worker nodes are not incorrectly rejoined.
- The Docker package installation task installed only `docker-ce`. Updated it to include the Docker CLI, containerd, and `python3-docker`, and added a note that Docker's apt repository must already be configured. The Ansible Docker modules require the Docker SDK for Python on the target host.
- The health-check example accessed nested Docker API fields such as `Status.State` and `Spec.Availability`, but `docker_swarm_info` only returns those structures when verbose output is requested. Added `verbose_output: true`.
- The node removal example used `community.docker.docker_node` with unsupported `state: absent` and `force` parameters. Replaced it with `community.docker.docker_swarm` using `state: remove` and a prior lookup of the target node ID.

## Review Notes
The service deployment, overlay network, node label, update/rollback, restart policy, resource limit/reservation, and token rotation examples align with the current `community.docker` module documentation. The examples still assume Debian/Ubuntu package management and an already configured Docker apt repository.
