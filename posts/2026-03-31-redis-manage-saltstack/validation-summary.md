# Validation Summary: How to Manage Redis with SaltStack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- SaltStack (Salt States, Pillars, Jinja templating, Orchestration, Execution Modules)
- Redis Sentinel (orchestration example)

## Sources Consulted
- SaltStack official documentation for salt.modules.redismod: https://docs.saltproject.io/en/3006/ref/modules/all/salt.modules.redismod.html
- SaltStack source code (salt/modules/redismod.py) on GitHub for function signature verification
- SaltStack documentation for state modules (pkg, file, service): https://docs.saltproject.io/en/latest/ref/states/all/
- SaltStack Pillar documentation: https://docs.saltproject.io/en/latest/topics/pillar/
- SaltStack Orchestration documentation: https://docs.saltproject.io/en/latest/topics/orchestrate/orchestrate_runner.html
- Redis configuration directive reference: https://redis.io/docs/management/config/

## Issues Found

1. **Incorrect Redis execution module function name (`redis.get` → `redis.get_key`)**: The post used `salt 'redis-server-01' redis.get mykey` but the Salt Redis execution module exposes the function as `get_key`, not `get`. Fixed to `redis.get_key mykey`.

2. **Incorrect `redis.flushdb` argument syntax (`redis.flushdb 0` → `redis.flushdb db=0`)**: The post passed `0` as a positional argument to `redis.flushdb`, but the function signature is `flushdb(host=None, port=None, db=None, password=None)`. Passing `0` positionally would assign it to the `host` parameter, not `db`. Fixed to use the keyword argument form `redis.flushdb db=0`.

3. **Misleading "Audit module" reference**: The post referenced "Salt's Audit module" but the commands shown (`cmd.run` and `state.apply test=True`) are standard Salt remote execution and dry-run features, not a specific Audit module. The open-source SaltStack does not have a dedicated "Audit module." Fixed the description to "Salt's remote execution and dry-run mode."

## Review Notes
- The Salt State file syntax (pkg.installed, file.managed, service.running with requisites) is correct and follows best practices.
- The Pillar structure and top.sls targeting are correct.
- The Jinja template correctly uses `pillar.get()` and dict `.get()` methods with sensible defaults. Jinja2's lowercase `false` is correct (unlike Python's `False`).
- The orchestration state for Redis Sentinel deployment uses correct `salt.state` syntax with proper `require` requisites for ordered deployment.
- The `salt-run state.orchestrate` command is correct.
- The `state.apply redis test=True` dry-run syntax is correct.
- The post is Debian/Ubuntu-centric (package name `redis-server`, service name `redis-server`). On RHEL/CentOS the package and service names differ (`redis`), but this is acceptable as the post doesn't claim cross-distribution support.
