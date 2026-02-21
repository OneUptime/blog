# How to Use the community.general.redis Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Redis, Lookup Plugins, Caching

Description: Learn how to use the community.general.redis lookup plugin to read values from Redis directly in your Ansible playbooks for dynamic configuration.

---

Redis is everywhere in modern infrastructure. It serves as a cache, a session store, a message broker, and a lightweight configuration store. The `community.general.redis` lookup plugin lets you read values from Redis directly within your Ansible playbooks. This is useful when your infrastructure state or configuration lives in Redis and you need that data to drive your automation.

## Prerequisites

Install the required collection and Python library:

```bash
# Install the community.general collection
ansible-galaxy collection install community.general

# Install the redis Python library
pip install redis
```

You also need a running Redis instance that is accessible from your Ansible controller.

## Basic Usage

The simplest form reads a key from Redis.

This playbook fetches a configuration value stored in Redis:

```yaml
# playbook.yml - Read a value from Redis
---
- name: Fetch configuration from Redis
  hosts: localhost
  tasks:
    - name: Get application version from Redis
      ansible.builtin.debug:
        msg: "Current app version: {{ lookup('community.general.redis', 'app:current_version') }}"

    - name: Get maintenance mode flag
      ansible.builtin.debug:
        msg: "Maintenance mode: {{ lookup('community.general.redis', 'app:maintenance_mode') }}"
```

## Connection Parameters

By default, the plugin connects to Redis on `localhost:6379`. You can specify different connection settings.

```yaml
# playbook.yml - Redis connection options
---
- name: Connect to different Redis instances
  hosts: localhost
  tasks:
    # Connect to a remote Redis
    - name: Read from remote Redis
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.redis', 'mykey', host='redis.example.com', port=6379) }}"

    # Connect with authentication
    - name: Read from password-protected Redis
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.redis', 'mykey', host='redis.example.com', password='redis_secret') }}"

    # Connect to a specific database number
    - name: Read from Redis database 2
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.redis', 'mykey', host='redis.example.com', db=2) }}"
```

## Practical Example: Feature Flag System

Many teams store feature flags in Redis for real-time toggling. Your Ansible playbooks can read these flags to adjust deployment behavior.

First, populate Redis with your feature flags:

```bash
# Store feature flags in Redis
redis-cli SET "flags:enable_new_dashboard" "true"
redis-cli SET "flags:enable_beta_api" "false"
redis-cli SET "flags:max_upload_size" "50"
redis-cli SET "flags:maintenance_window" "2026-02-22T02:00:00Z"
```

Then read them in your playbook:

```yaml
# playbook.yml - Deploy based on Redis feature flags
---
- name: Feature-flag-driven deployment
  hosts: appservers
  vars:
    redis_host: "redis.internal.example.com"
    enable_new_dashboard: "{{ lookup('community.general.redis', 'flags:enable_new_dashboard', host=redis_host) }}"
    enable_beta_api: "{{ lookup('community.general.redis', 'flags:enable_beta_api', host=redis_host) }}"
    max_upload_size: "{{ lookup('community.general.redis', 'flags:max_upload_size', host=redis_host) }}"
  tasks:
    - name: Deploy new dashboard if enabled
      ansible.builtin.copy:
        src: dashboard-v2/
        dest: /opt/myapp/dashboard/
        mode: '0755'
      when: enable_new_dashboard | bool

    - name: Deploy stable dashboard if new is disabled
      ansible.builtin.copy:
        src: dashboard-v1/
        dest: /opt/myapp/dashboard/
        mode: '0755'
      when: not (enable_new_dashboard | bool)

    - name: Configure upload size limit
      ansible.builtin.lineinfile:
        path: /etc/myapp/config.yml
        regexp: '^max_upload_size:'
        line: "max_upload_size: {{ max_upload_size }}"
      notify: restart myapp

    - name: Deploy beta API module
      ansible.builtin.copy:
        src: api-beta/
        dest: /opt/myapp/api/
        mode: '0755'
      when: enable_beta_api | bool
```

## Configuration Store Pattern

Use Redis as a centralized configuration store that multiple teams and services share.

```yaml
# playbook.yml - Redis as centralized config store
---
- name: Configure application from Redis config store
  hosts: appservers
  vars:
    redis_host: "config-redis.internal.example.com"
    app_name: "myapp"
    env: "{{ target_env | default('staging') }}"

    # Read all config values from Redis
    db_host: "{{ lookup('community.general.redis', app_name + ':' + env + ':db_host', host=redis_host) }}"
    db_port: "{{ lookup('community.general.redis', app_name + ':' + env + ':db_port', host=redis_host) }}"
    cache_ttl: "{{ lookup('community.general.redis', app_name + ':' + env + ':cache_ttl', host=redis_host) }}"
    log_level: "{{ lookup('community.general.redis', app_name + ':' + env + ':log_level', host=redis_host) }}"
    worker_count: "{{ lookup('community.general.redis', app_name + ':' + env + ':worker_count', host=redis_host) }}"
  tasks:
    - name: Template application configuration
      ansible.builtin.template:
        src: app_config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0644'
      notify: restart myapp

    - name: Configure worker service
      ansible.builtin.template:
        src: worker.service.j2
        dest: /etc/systemd/system/myapp-worker.service
        mode: '0644'
      notify:
        - reload systemd
        - restart workers
```

## Deployment State Tracking

Track deployment state in Redis so multiple playbooks can coordinate.

```yaml
# playbook.yml - Deployment coordination via Redis
---
- name: Coordinated deployment
  hosts: appservers
  vars:
    redis_host: "deploy-redis.internal.example.com"
  tasks:
    - name: Check if another deployment is in progress
      ansible.builtin.set_fact:
        deploy_lock: "{{ lookup('community.general.redis', 'deploy:lock', host=redis_host) | default('') }}"

    - name: Abort if deployment is locked
      ansible.builtin.fail:
        msg: "Another deployment is in progress: {{ deploy_lock }}"
      when: deploy_lock | length > 0

    - name: Check current deployed version
      ansible.builtin.set_fact:
        current_version: "{{ lookup('community.general.redis', 'deploy:current_version', host=redis_host) | default('unknown') }}"

    - name: Show deployment info
      ansible.builtin.debug:
        msg: "Current version: {{ current_version }}, deploying: {{ new_version }}"

    - name: Proceed with deployment
      ansible.builtin.debug:
        msg: "Deployment proceeding..."
```

## Reading Multiple Keys

You can look up multiple keys in a single call:

```yaml
# playbook.yml - Read multiple Redis keys
---
- name: Fetch multiple Redis keys
  hosts: localhost
  vars:
    redis_host: "redis.internal.example.com"
  tasks:
    - name: Get multiple values
      ansible.builtin.debug:
        msg: "{{ lookup('community.general.redis', 'key1', 'key2', 'key3', host=redis_host, wantlist=True) }}"

    - name: Process multiple values
      ansible.builtin.set_fact:
        config_values: "{{ lookup('community.general.redis', 'config:db_host', 'config:db_port', 'config:db_name', host=redis_host, wantlist=True) }}"

    - name: Use the retrieved values
      ansible.builtin.debug:
        msg: "DB: {{ config_values[0] }}:{{ config_values[1] }}/{{ config_values[2] }}"
```

## Service Health Integration

Check service health status stored in Redis by monitoring systems.

```yaml
# playbook.yml - Check service health before deployment
---
- name: Health-aware deployment
  hosts: appservers
  vars:
    redis_host: "monitoring-redis.internal.example.com"
  tasks:
    - name: Check cluster health from Redis
      ansible.builtin.set_fact:
        cluster_health: "{{ lookup('community.general.redis', 'health:cluster:status', host=redis_host) | default('unknown') }}"

    - name: Check database health
      ansible.builtin.set_fact:
        db_health: "{{ lookup('community.general.redis', 'health:database:status', host=redis_host) | default('unknown') }}"

    - name: Abort deployment if infrastructure is unhealthy
      ansible.builtin.fail:
        msg: |
          Infrastructure health check failed:
          Cluster: {{ cluster_health }}
          Database: {{ db_health }}
      when: cluster_health != 'healthy' or db_health != 'healthy'

    - name: Deploy if everything is healthy
      ansible.builtin.debug:
        msg: "All systems healthy, proceeding with deployment"
```

## Environment Configuration Matrix

Store per-environment configurations in Redis and retrieve them dynamically.

```bash
# Populate Redis with environment configs
redis-cli SET "env:production:replicas" "5"
redis-cli SET "env:production:cpu_limit" "2000m"
redis-cli SET "env:production:memory_limit" "4Gi"
redis-cli SET "env:staging:replicas" "2"
redis-cli SET "env:staging:cpu_limit" "500m"
redis-cli SET "env:staging:memory_limit" "1Gi"
```

```yaml
# playbook.yml - Environment config from Redis
---
- name: Deploy with environment-specific settings from Redis
  hosts: appservers
  vars:
    redis_host: "config-redis.internal.example.com"
    env: "{{ target_env | default('staging') }}"
    replicas: "{{ lookup('community.general.redis', 'env:' + env + ':replicas', host=redis_host) }}"
    cpu_limit: "{{ lookup('community.general.redis', 'env:' + env + ':cpu_limit', host=redis_host) }}"
    memory_limit: "{{ lookup('community.general.redis', 'env:' + env + ':memory_limit', host=redis_host) }}"
  tasks:
    - name: Show configuration for environment
      ansible.builtin.debug:
        msg: |
          Environment: {{ env }}
          Replicas: {{ replicas }}
          CPU Limit: {{ cpu_limit }}
          Memory Limit: {{ memory_limit }}

    - name: Deploy with these settings
      ansible.builtin.template:
        src: deployment.yml.j2
        dest: /opt/deployments/{{ env }}/deployment.yml
        mode: '0644'
```

## Error Handling

Handle missing keys and connection failures:

```yaml
# playbook.yml - Resilient Redis lookups
---
- name: Handle Redis errors gracefully
  hosts: localhost
  vars:
    redis_host: "redis.internal.example.com"
  tasks:
    # Use default for missing keys
    - name: Read with fallback for missing key
      ansible.builtin.set_fact:
        config_value: "{{ lookup('community.general.redis', 'possibly:missing:key', host=redis_host) | default('fallback_value') }}"

    # Block/rescue for connection failures
    - name: Try reading from Redis
      block:
        - name: Fetch critical config
          ansible.builtin.set_fact:
            critical_config: "{{ lookup('community.general.redis', 'app:critical:setting', host=redis_host) }}"
      rescue:
        - name: Redis unavailable, use local fallback
          ansible.builtin.set_fact:
            critical_config: "{{ lookup('file', 'fallback_config.txt') }}"
        - name: Warn about fallback
          ansible.builtin.debug:
            msg: "WARNING: Redis unavailable, using local fallback configuration"
```

## Tips and Best Practices

1. **Key naming conventions**: Use colon-separated hierarchical keys like `app:env:component:setting`. This makes keys organized and easy to manage.

2. **Connection pooling**: Each lookup creates a new connection to Redis. If you are fetching many values, consider using a script that reads all needed keys at once and stores them in a local cache file.

3. **Data types**: The Redis lookup returns string values only. It reads keys set with `SET`, not complex Redis data structures like hashes, lists, or sets. For complex types, use the `redis` module or a custom script.

4. **Security**: If Redis contains sensitive data, ensure network-level access control and use Redis AUTH. The password parameter in the lookup passes credentials in plaintext within the playbook, so store it in Ansible Vault.

5. **Availability**: Redis is an in-memory store. If Redis restarts or is unavailable, your playbook will fail. Always have a fallback plan for critical deployments.

6. **TTL awareness**: Redis keys can have expiration times. A key that exists when you run the playbook might not exist next time. Handle missing keys with defaults.

The `community.general.redis` lookup plugin turns Redis from a backend service into a dynamic data source for your automation. It is particularly powerful in environments where configuration is managed centrally and needs to be consumed by multiple tools, including Ansible.
