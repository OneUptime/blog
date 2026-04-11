# How to Manage Redis with SaltStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SaltStack, Configuration Management, Automation, Infrastructure

Description: Learn how to manage Redis with SaltStack - covering state files, Pillar configuration, Jinja templating, and orchestrating Redis deployments across multiple minions.

---

SaltStack's event-driven automation makes it well-suited for managing Redis at scale. States define desired configuration, Pillars store sensitive data, and Salt's remote execution capabilities let you manage hundreds of Redis nodes simultaneously.

## Install Redis via Salt State

Create a state file for Redis installation:

```yaml
# /srv/salt/redis/init.sls
redis-package:
  pkg.installed:
    - name: redis-server

redis-config:
  file.managed:
    - name: /etc/redis/redis.conf
    - source: salt://redis/files/redis.conf.jinja
    - template: jinja
    - user: redis
    - group: redis
    - mode: '0640'
    - require:
      - pkg: redis-package

redis-service:
  service.running:
    - name: redis-server
    - enable: true
    - watch:
      - file: redis-config
```

## Store Sensitive Configuration in Pillars

```yaml
# /srv/pillar/redis.sls
redis:
  password: "YourStrongPassword123!"
  maxmemory: "2gb"
  maxmemory_policy: "allkeys-lru"
  bind_address: "127.0.0.1"
  port: 6379
  appendonly: false
```

```yaml
# /srv/pillar/top.sls
base:
  'redis-*':
    - redis
```

## Create a Jinja Configuration Template

```jinja
{# /srv/salt/redis/files/redis.conf.jinja #}
{% set redis = pillar.get('redis', {}) %}

bind {{ redis.get('bind_address', '127.0.0.1') }}
port {{ redis.get('port', 6379) }}

requirepass {{ redis.get('password', '') }}

maxmemory {{ redis.get('maxmemory', '1gb') }}
maxmemory-policy {{ redis.get('maxmemory_policy', 'allkeys-lru') }}

loglevel notice
logfile /var/log/redis/redis-server.log

{% if redis.get('appendonly', false) %}
appendonly yes
appendfsync everysec
{% else %}
appendonly no
{% endif %}

save 900 1
save 300 10
save 60 10000
```

## Apply States to Minions

```bash
# Apply to a single minion
salt 'redis-server-01' state.apply redis

# Apply to all Redis servers
salt 'redis-*' state.apply redis

# Test run without applying changes
salt 'redis-*' state.apply redis test=True
```

## Use Salt Execution Modules for Redis

Salt has built-in Redis execution modules:

```bash
# Check Redis info from Salt master
salt 'redis-*' redis.info

# Get a specific key
salt 'redis-server-01' redis.get_key mykey

# Flush a specific database
salt 'redis-server-01' redis.flushdb db=0

# Get the number of keys in a database
salt 'redis-server-01' redis.dbsize
```

## Orchestrate a Redis Sentinel Setup

```yaml
# /srv/salt/orch/redis_sentinel.sls
deploy_redis_primary:
  salt.state:
    - tgt: 'redis-primary-*'
    - sls:
      - redis
      - redis.primary

deploy_redis_replicas:
  salt.state:
    - tgt: 'redis-replica-*'
    - sls:
      - redis
      - redis.replica
    - require:
      - salt: deploy_redis_primary

deploy_redis_sentinel:
  salt.state:
    - tgt: 'redis-sentinel-*'
    - sls:
      - redis.sentinel
    - require:
      - salt: deploy_redis_replicas
```

```bash
# Run the orchestration
salt-run state.orchestrate orch.redis_sentinel
```

## Monitor Compliance

Use Salt's remote execution and dry-run mode to verify Redis configuration compliance:

```bash
# Check all Redis servers have correct maxmemory
salt 'redis-*' cmd.run "redis-cli CONFIG GET maxmemory"

# Verify no unauthorized config changes
salt 'redis-*' state.apply redis test=True
```

## Summary

SaltStack manages Redis through state files that define desired configuration, Pillars that store environment-specific values and secrets, and Jinja templates for dynamic config generation. Salt's execution modules provide direct Redis introspection from the Salt master, and orchestration states allow ordered multi-node deployments. The event-driven reactor system can also trigger automatic Redis reconfiguration in response to infrastructure events.
