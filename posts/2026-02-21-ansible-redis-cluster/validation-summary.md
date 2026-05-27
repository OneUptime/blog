# Validation Summary: How to Use Ansible to Set Up Redis Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster
- Redis CLI
- Redis configuration
- Ansible playbooks
- Debian/Ubuntu APT repositories
- Linux sysctl and systemd

## Sources Consulted
- Redis Cluster scaling documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Open Source installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/
- Ansible apt_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible deb822_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/deb822_repository_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/command_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The post said a minimum Redis Cluster requires six nodes. Redis Cluster can be created with fewer nodes for non-replicated examples; six nodes is the common highly available layout with three masters and three replicas. Updated the wording to describe six nodes as the highly available deployment used by the guide.
- The installation example used `ansible.builtin.apt_key`, which depends on the deprecated `apt-key` utility. Replaced it with `ansible.builtin.deb822_repository` using `signed_by`, and added the required `python3-debian` dependency.
- The installation example installed `redis-server`, while Redis's current official APT instructions install the `redis` package from `packages.redis.io`. Updated the task to install `redis`.
- The node-add example claimed to add a new master and replica, but it only added one node and referenced an undefined `new_node_id` during resharding. Updated the example to add a new master, read its node ID from `CLUSTER NODES`, reshard to that ID, and add a replica with `--cluster-slave --cluster-master-id`.

## Review Notes
- The Redis and Ansible snippets are now aligned with current official documentation. I could not execute the playbooks locally because Ansible and redis-cli are not installed in this workspace, so validation was performed against official documentation and static review.
