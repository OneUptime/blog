# Validation Summary: How to Manage Redis with Ansible Playbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2
- Ansible (with FQCNs / ansible.builtin modules)
- systemd service management
- Ansible Vault for secret management
- Jinja2 templating

## Sources Consulted
- Redis 7.2 configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis `save` directive multi-pair syntax (valid in Redis 7.0+): https://raw.githubusercontent.com/redis/redis/7.2/redis.conf
- Ansible `template` module `validate` parameter: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `package` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible `systemd` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- Redis CLI authentication (`-a` flag): https://redis.io/docs/latest/develop/connect/cli/
- Redis daemonize behavior with systemd: https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/

## Issues Found

1. **`daemonize yes` incompatible with systemd**: The Redis config template used `daemonize yes`, but the service is managed via systemd (`ansible.builtin.systemd`). Redis 7.x packages ship systemd units with `Type=notify`, which requires the process to stay in the foreground. Changed to `daemonize no`.

2. **Invalid `validate` parameter on template task**: The configure task used `validate: "redis-server --test-memory 1"`. The Ansible `template` module's `validate` parameter requires `%s` to reference the temporary file path. Additionally, `--test-memory` tests memory allocation, not config file validity. Redis has no built-in config validation flag. Removed the `validate` line.

3. **Missing redis-cli authentication**: The group variables set `redis_requirepass: "{{ vault_redis_password }}"`, but all `redis-cli` commands (PING, CONFIG REWRITE, REPLICAOF, BGSAVE, LASTSAVE) were invoked without the `-a` flag. These would fail with `NOAUTH Authentication required`. Added conditional authentication (`{{ '-a ' + redis_requirepass if redis_requirepass else '' }}`) to all redis-cli commands, handling both password-set and no-password scenarios.

4. **`--tags configure` with no tags defined**: The "Running the Playbooks" section included `ansible-playbook ... --tags configure`, but no tags were defined in any of the shown tasks or role includes. This command would execute nothing. Removed the misleading example.

## Review Notes
- The `redis_version: "7.2"` variable is defined in group_vars but never used in any task. The installation uses package manager defaults rather than pinning to a specific version. This is not incorrect but could be confusing to readers who expect version pinning.
- The "Reload Redis" handler runs `CONFIG REWRITE`, which writes in-memory config to disk — the opposite of what "reload" typically means (re-read config from disk). Redis does not support a config reload; a restart is required. The handler is not invoked anywhere in the shown code, so this is not a runtime issue, but the naming could mislead readers.
- The `redis_persistence` dict is only defined in group_vars, not in role defaults. If the role were used without those group_vars, the template would fail on undefined `redis_persistence`. For a standalone role, these should have defaults.
- The `ansible_date_time.epoch` used in the backup playbook's `until` condition is gathered at fact-collection time, not at task execution time. For long-running plays, this could cause the comparison to be inaccurate. In practice for this use case the window is small enough that it works.
