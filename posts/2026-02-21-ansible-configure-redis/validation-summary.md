# Validation Summary: How to Use Ansible to Configure Redis

## Status
validated

## Post Type
Tutorial / configuration management guide

## Technologies Covered
- Redis configuration
- Redis CLI
- Ansible playbooks
- Ansible Vault
- Jinja2 templates
- systemd-managed services

## Sources Consulted
- Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis example redis.conf: https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- Redis CONFIG SET command: https://redis.io/docs/latest/commands/config-set/
- Redis CONFIG REWRITE command: https://redis.io/docs/latest/commands/config-rewrite/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/index.html

## Issues Found
- The Jinja2 template emitted no `save` directive when `redis_save_rules` was empty. Redis documents `save ""` as the way to disable RDB snapshotting, so the development example's `redis_save_rules: []` would not reliably mean "No persistence in dev." Updated the template to render `save ""` when the rule list is empty.
- The Jinja2 template rendered boolean Redis directives with `| lower`, which produces `true` or `false` for Ansible booleans. Redis configuration examples document these directives with `yes` or `no`, so the template now renders explicit `yes`/`no` values for `replica-read-only` and lazy-free options.
- The `redis-cli` Ansible examples passed the Redis password with `-a`. Redis CLI documentation recommends `REDISCLI_AUTH` for automatic password authentication, and Ansible's command module supports `argv` for safer argument handling. Updated the runtime and validation tasks to use `argv` plus `REDISCLI_AUTH`.
- The common-mistakes section implied `tcp-keepalive` is unset by default. Redis has defaulted it to a reasonable value since Redis 3.2.1, so the wording now warns against disabling it or setting it too high.

## Review Notes
- The `ansible.builtin.systemd` module name used in the post is still supported as a backward-compatible alias, though current Ansible documentation names `ansible.builtin.systemd_service` as the clearer module name.
- The service name `redis-server` and paths such as `/etc/redis/redis.conf` match common Debian/Ubuntu packaging but can differ on other distributions.
- `CONFIG REWRITE` changes the configuration file used by the running Redis server. In an Ansible-managed workflow, the corresponding Ansible variables and template should also be updated so future deployments do not overwrite the runtime change.
