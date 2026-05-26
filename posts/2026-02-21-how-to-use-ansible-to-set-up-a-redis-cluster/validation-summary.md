# Validation Summary: How to Use Ansible to Set Up a Redis Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Redis Open Source
- Redis Cluster
- redis-cli
- Linux sysctl and Transparent Huge Pages tuning
- YAML and Jinja2 configuration templates

## Sources Consulted
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Cluster scaling and creation guide: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible import_playbook documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible role reuse documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html

## Issues Found
- Removed the unused `redis_version: "7.2"` variable because the shown `apt` task installs the distribution's `redis-server` package and does not pin or install Redis 7.2.
- Changed the Transparent Huge Pages task from `ansible.builtin.command` to `ansible.builtin.shell` because Ansible's command module does not process shell redirection such as `>`.
- Added the missing `roles/redis_cluster/handlers/main.yml` handler for `restart redis`; without it, the template task's `notify: restart redis` would fail when the role runs.
- Added `-p {{ redis_port }}` to Redis CLI verification and cluster-state commands so the examples work when `redis_port` is configured to a non-default port.
- Added `run_once: true` to the cluster existence and stabilization checks in the cluster creation task file so the one-time cluster creation flow consistently evaluates state from the same node.
- Replaced the playbook-level `include_tasks` path with `include_role` and `tasks_from: create-cluster`, which correctly loads a task file from the role regardless of the playbook directory.

## Review Notes
- The Redis Cluster architecture explanation is accurate: Redis Cluster uses 16,384 hash slots, and Redis documentation recommends a six-node deployment with three masters and three replicas for a practical minimal highly available cluster.
- The `redis-cli --cluster create ... --cluster-replicas 1` usage is consistent with Redis documentation. In production, operators should also ensure the Redis data port and cluster bus port are reachable between nodes.
