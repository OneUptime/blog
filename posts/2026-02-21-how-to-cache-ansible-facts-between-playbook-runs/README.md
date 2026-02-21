# How to Cache Ansible Facts Between Playbook Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Caching, Performance, DevOps

Description: Learn how to configure Ansible fact caching to persist facts between playbook runs and dramatically improve execution speed.

---

Every time you run an Ansible playbook, it gathers facts from every target host. In large environments, this gets repetitive and slow. If you ran a playbook 10 minutes ago, the OS version, IP address, and memory size of your servers have not changed. Fact caching lets Ansible remember these facts between runs, skipping the gathering step entirely when cached data is still fresh.

## How Fact Caching Works

When fact caching is enabled, Ansible stores the gathered facts in a backend (file, Redis, memcached, or others). On the next run, if the cached facts are newer than the configured timeout, Ansible uses the cached version instead of connecting to each host to gather fresh facts.

This works alongside the `gathering = smart` setting in `ansible.cfg`. With smart gathering, Ansible checks the cache first and only gathers facts if they are missing or expired.

## Setting Up JSON File Cache

The simplest caching backend is the JSON file cache. It writes one JSON file per host to a directory on the Ansible control node.

```ini
# ansible.cfg
# Configures JSON file-based fact caching with 24-hour TTL
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
```

The `fact_caching_timeout` is in seconds. 86400 seconds equals 24 hours. After that period, facts are considered stale and will be re-gathered.

Create the cache directory before running playbooks.

```bash
# Create the cache directory with proper permissions
mkdir -p /tmp/ansible_facts_cache
chmod 700 /tmp/ansible_facts_cache
```

After running a playbook, you can see the cached facts.

```bash
# List cached fact files (one per host)
ls -la /tmp/ansible_facts_cache/
# -rw-r--r-- 1 user user 45232 Feb 21 10:30 web-01
# -rw-r--r-- 1 user user 44891 Feb 21 10:30 web-02
# -rw-r--r-- 1 user user 43567 Feb 21 10:30 db-01

# View cached facts for a specific host (pretty-printed)
python3 -m json.tool /tmp/ansible_facts_cache/web-01 | head -20
```

## Setting Up Redis Cache

For multi-user environments or when you have multiple Ansible control nodes, Redis is a better choice. All control nodes share the same cache, and Redis handles concurrency properly.

First, install the Redis Python library on the control node.

```bash
# Install the Redis client library for Python
pip install redis
```

Then configure Ansible to use Redis.

```ini
# ansible.cfg
# Configures Redis-based fact caching
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = localhost:6379:0
fact_caching_timeout = 86400
fact_caching_prefix = ansible_facts_
```

The connection string format is `host:port:database_number`. The prefix helps identify Ansible's keys in Redis if you use the same Redis instance for other things.

You can verify the cache is working with the Redis CLI.

```bash
# Check that Ansible stored facts in Redis
redis-cli KEYS "ansible_facts_*"
# 1) "ansible_facts_web-01"
# 2) "ansible_facts_web-02"
# 3) "ansible_facts_db-01"

# Check the TTL on a cached fact
redis-cli TTL "ansible_facts_web-01"
# (integer) 85432
```

## Setting Up Memcached Cache

Memcached is another option for distributed caching.

```bash
# Install the memcached client library
pip install python-memcached
```

```ini
# ansible.cfg
# Configures memcached-based fact caching
[defaults]
gathering = smart
fact_caching = memcached
fact_caching_connection = ['localhost:11211']
fact_caching_timeout = 86400
fact_caching_prefix = ansible_facts_
```

## Smart Gathering

The `gathering = smart` setting is what ties caching together. Here is how the three gathering modes interact with caching.

```ini
# gathering = implicit (default)
# Always gathers facts. Cache is populated but never read.
# Useless for performance.

# gathering = explicit
# Never gathers facts unless gather_facts: yes is set.
# Cache is irrelevant because facts are never gathered automatically.

# gathering = smart
# Checks cache first. Only gathers if cache is empty or expired.
# This is what you want for fact caching.
```

A complete `ansible.cfg` for a production setup looks like this.

```ini
# ansible.cfg
# Production configuration with Redis fact caching
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = redis.internal:6379:0
fact_caching_timeout = 3600
fact_caching_prefix = ansible_

# Also bump forks for large inventories
forks = 20

# Enable pipelining for additional speed
[ssh_connection]
pipelining = True
```

## Choosing the Right Cache Timeout

The cache timeout should match how quickly your environment changes. Here are some guidelines.

```yaml
# Timeout recommendations based on use case

# Development environment - facts change often
# fact_caching_timeout = 300  (5 minutes)

# Staging environment - moderate change rate
# fact_caching_timeout = 3600  (1 hour)

# Production environment - infrastructure is stable
# fact_caching_timeout = 86400  (24 hours)

# Immutable infrastructure - servers are replaced, not updated
# fact_caching_timeout = 604800  (7 days)
```

## Forcing Fact Refresh

Sometimes you need fresh facts even though the cache has not expired. There are several ways to force a refresh.

```bash
# Option 1: Clear the entire file cache
rm -rf /tmp/ansible_facts_cache/*

# Option 2: Clear cache for specific hosts
rm /tmp/ansible_facts_cache/web-01
rm /tmp/ansible_facts_cache/web-02

# Option 3: Clear Redis cache
redis-cli KEYS "ansible_facts_*" | xargs redis-cli DEL
```

You can also force fact gathering in a playbook by explicitly calling the setup module.

```yaml
# force-refresh-facts.yml
# Forces fresh fact gathering regardless of cache
---
- name: Force fresh fact gathering
  hosts: all
  gather_facts: no
  tasks:
    - name: Gather facts and update cache
      ansible.builtin.setup:

    - name: Use the fresh facts
      ansible.builtin.debug:
        msg: "Fresh IP: {{ ansible_facts['default_ipv4']['address'] }}"
```

## YAML File Cache

If you prefer YAML over JSON for the file cache, Ansible supports that too.

```ini
# ansible.cfg
# Uses YAML format for the file cache
[defaults]
gathering = smart
fact_caching = yaml
fact_caching_connection = /tmp/ansible_facts_cache
fact_caching_timeout = 86400
```

The YAML files are more human-readable than JSON, which can be useful for debugging.

## Measuring Cache Performance

Here is how to benchmark the difference caching makes.

```bash
# First run - cache is cold, facts are gathered
time ansible-playbook site.yml
# real    1m42s

# Second run - cache is warm, facts are read from cache
time ansible-playbook site.yml
# real    0m38s
```

For a more detailed breakdown, enable the profile_tasks callback.

```ini
# ansible.cfg
[defaults]
callbacks_enabled = profile_tasks
```

```bash
# Run with profiling to see per-task timing
ansible-playbook site.yml
# The "Gathering Facts" task should show near-zero time on cached runs
```

## Handling Cache Invalidation After Infrastructure Changes

When you make infrastructure changes outside of Ansible (like changing an IP address or adding a disk), the cache becomes stale. Build cache invalidation into your change workflow.

```yaml
# invalidate-cache-after-change.yml
# Clears fact cache and re-gathers after infrastructure changes
---
- name: Invalidate and refresh facts
  hosts: "{{ target_hosts }}"
  gather_facts: no
  tasks:
    - name: Clear cached facts for target hosts
      ansible.builtin.file:
        path: "/tmp/ansible_facts_cache/{{ inventory_hostname }}"
        state: absent
      delegate_to: localhost

    - name: Gather fresh facts
      ansible.builtin.setup:

    - name: Confirm fresh facts
      ansible.builtin.debug:
        msg: "Refreshed facts for {{ inventory_hostname }} - IP: {{ ansible_facts['default_ipv4']['address'] }}"
```

## Cache with Multiple Ansible Projects

If you have multiple Ansible projects on the same control node, use different cache paths or prefixes to avoid conflicts.

```ini
# project-a/ansible.cfg
[defaults]
fact_caching = jsonfile
fact_caching_connection = /var/cache/ansible/project-a

# project-b/ansible.cfg
[defaults]
fact_caching = jsonfile
fact_caching_connection = /var/cache/ansible/project-b
```

Or with Redis, use different database numbers or prefixes.

```ini
# project-a uses Redis DB 0
fact_caching_connection = localhost:6379:0
fact_caching_prefix = project_a_

# project-b uses Redis DB 1
fact_caching_connection = localhost:6379:1
fact_caching_prefix = project_b_
```

## Summary

Fact caching is a significant performance optimization for Ansible, especially in environments with many hosts. Combine `gathering = smart` with a caching backend (jsonfile for single-user, Redis for teams) and a reasonable timeout. For a 200-host inventory, caching can cut playbook execution time by 30-60% on subsequent runs. Just remember to invalidate the cache when the infrastructure changes outside of Ansible's control.
