# How to Use Ansible Inventory Caching for Dynamic Inventories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Caching, Dynamic Inventory, Performance, DevOps

Description: Learn how to enable and configure Ansible inventory caching to speed up dynamic inventory plugins and reduce API calls.

---

Dynamic inventory plugins query external APIs every time you run an Ansible command. If you have hundreds of instances in AWS, Azure, or GCP, each invocation means waiting for API responses before anything else happens. Ansible's built-in inventory caching solves this by storing the inventory data locally and reusing it for subsequent runs within a configurable time window. This post covers how to set it up and tune it for your environment.

## The Performance Problem

Without caching, here is what happens every time you run `ansible-playbook`:

1. Ansible invokes the dynamic inventory plugin
2. The plugin queries the cloud provider API (or whatever external source)
3. The API response is parsed into inventory data
4. Ansible can finally start the playbook

For a large AWS environment, step 2 alone can take 30-60 seconds. If you are iterating on a playbook and running it multiple times, that adds up fast. Multiply that by multiple inventory sources and you might be waiting minutes before anything useful happens.

```mermaid
graph LR
    A[ansible-playbook] --> B[Inventory Plugin]
    B --> C[API Call - 30-60s]
    C --> D[Parse Response]
    D --> E[Start Playbook]
```

With caching:

```mermaid
graph LR
    A[ansible-playbook] --> B[Inventory Plugin]
    B --> C{Cache valid?}
    C -->|Yes| D[Read from cache - instant]
    C -->|No| E[API Call - 30-60s]
    E --> F[Write to cache]
    F --> D
    D --> G[Start Playbook]
```

## Enabling Inventory Caching

Caching is configured in `ansible.cfg`. Here is the basic setup:

```ini
# ansible.cfg
[inventory]
# Enable caching for inventory plugins
cache = true

# Use JSON files for the cache backend
cache_plugin = ansible.builtin.jsonfile

# Directory to store cache files
cache_connection = /tmp/ansible_inventory_cache

# Cache TTL in seconds (3600 = 1 hour)
cache_timeout = 3600
```

That is it for the global configuration. But each inventory plugin also needs to opt in to caching in its own config file.

## Configuring Caching for AWS EC2

Here is a complete AWS EC2 inventory config with caching enabled:

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2

# Enable caching for this specific plugin
cache: true
cache_plugin: ansible.builtin.jsonfile
cache_connection: /tmp/ansible_inventory_cache
cache_timeout: 3600

keyed_groups:
  - key: tags.Environment
    prefix: env
    separator: "_"
  - key: instance_type
    prefix: type
    separator: "_"

compose:
  ansible_host: private_ip_address
  ansible_user: "'ec2-user'"

filters:
  instance-state-name: running
```

The cache settings in the plugin file override the global settings in `ansible.cfg`, which lets you set different TTLs for different inventory sources.

## Cache Backend Options

Ansible supports several cache backends. The right choice depends on your setup.

**jsonfile** is the simplest and works everywhere:

```ini
[inventory]
cache = true
cache_plugin = ansible.builtin.jsonfile
cache_connection = /tmp/ansible_inventory_cache
cache_timeout = 3600
```

**yaml** stores cached data as YAML files (human-readable but slightly slower):

```ini
[inventory]
cache = true
cache_plugin = ansible.builtin.yaml
cache_connection = /tmp/ansible_inventory_cache
cache_timeout = 3600
```

**Redis** is useful when multiple control nodes need to share a cache:

```ini
[inventory]
cache = true
cache_plugin = community.general.redis
cache_connection = redis.example.com:6379:0
cache_timeout = 3600
```

Install the Redis cache plugin dependency:

```bash
# Install the redis Python package required by the cache plugin
pip install redis

# Install the community.general collection
ansible-galaxy collection install community.general
```

**memcached** is another shared cache option:

```ini
[inventory]
cache = true
cache_plugin = community.general.memcached
cache_connection = memcached.example.com:11211
cache_timeout = 3600
```

## Setting Different TTLs per Source

In a multi-cloud environment, you might want different cache durations for different sources. AWS instances might change rarely (long TTL), while a Kubernetes cluster changes frequently (short TTL):

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
cache: true
cache_plugin: ansible.builtin.jsonfile
cache_connection: /tmp/ansible_cache
# AWS instances rarely change, cache for 2 hours
cache_timeout: 7200
regions:
  - us-east-1
```

```yaml
# inventory/k8s.yml
plugin: kubernetes.core.k8s
cache: true
cache_plugin: ansible.builtin.jsonfile
cache_connection: /tmp/ansible_cache
# Kubernetes pods change frequently, cache for 5 minutes
cache_timeout: 300
```

## Invalidating the Cache

Sometimes you need to force a fresh inventory pull. There are several ways to do this:

```bash
# Delete the cache files manually
rm -rf /tmp/ansible_inventory_cache/*

# Use the --flush-cache flag on the command line
ansible-playbook -i inventory/aws_ec2.yml --flush-cache site.yml

# Or with ansible-inventory
ansible-inventory -i inventory/aws_ec2.yml --flush-cache --list
```

The `--flush-cache` flag tells Ansible to ignore the existing cache and fetch fresh data from the source. The new data gets written back to the cache for subsequent runs.

## Cache Management Script

For teams that need more control over cache invalidation, here is a helper script:

```bash
#!/bin/bash
# manage_cache.sh
# Manage Ansible inventory cache

CACHE_DIR="/tmp/ansible_inventory_cache"

case "$1" in
    status)
        echo "Cache directory: $CACHE_DIR"
        echo "Cache files:"
        ls -lh "$CACHE_DIR" 2>/dev/null || echo "  No cache files found"
        echo ""
        echo "Total cache size:"
        du -sh "$CACHE_DIR" 2>/dev/null || echo "  0"
        ;;
    clear)
        echo "Clearing inventory cache..."
        rm -rf "$CACHE_DIR"/*
        echo "Cache cleared"
        ;;
    refresh)
        echo "Refreshing inventory cache..."
        rm -rf "$CACHE_DIR"/*
        ansible-inventory -i inventory/ --list > /dev/null
        echo "Cache refreshed"
        ;;
    age)
        echo "Cache file ages:"
        for f in "$CACHE_DIR"/*; do
            if [ -f "$f" ]; then
                age=$(($(date +%s) - $(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null)))
                echo "  $(basename $f): ${age}s old"
            fi
        done
        ;;
    *)
        echo "Usage: $0 {status|clear|refresh|age}"
        exit 1
        ;;
esac
```

## Caching in CI/CD Pipelines

In CI/CD pipelines, you typically want a fresh inventory for deployment but can cache for repeated validation steps:

```yaml
# .gitlab-ci.yml
variables:
  ANSIBLE_INVENTORY_CACHE: /tmp/ansible_cache

stages:
  - validate
  - deploy

validate:
  stage: validate
  script:
    # First run populates cache
    - ansible-inventory -i inventory/ --list > /dev/null
    # Subsequent commands use cache
    - ansible-playbook -i inventory/ --check site.yml
    - ansible-lint playbooks/

deploy:
  stage: deploy
  script:
    # Force fresh inventory for actual deployment
    - ansible-playbook -i inventory/ --flush-cache site.yml
```

## Monitoring Cache Effectiveness

You can measure the performance difference with and without caching:

```bash
# Time a run without cache
time ansible-inventory -i inventory/aws_ec2.yml --flush-cache --list > /dev/null

# Time a subsequent run with cache
time ansible-inventory -i inventory/aws_ec2.yml --list > /dev/null
```

In my experience, a cached run typically completes in under a second, while an uncached run against AWS with multiple regions can take 30-90 seconds.

## Cache File Structure

When using the jsonfile backend, the cache directory contains one file per inventory source:

```bash
# Look at what is in the cache
ls -la /tmp/ansible_inventory_cache/
# -rw-r--r-- 1 user user 45K Feb 21 10:30 aws_ec2_us_east_1
# -rw-r--r-- 1 user user 12K Feb 21 10:30 aws_ec2_us_west_2
```

Each file contains the serialized inventory data in JSON format. You can inspect it for debugging:

```bash
# Pretty-print a cache file to see what was cached
python3 -m json.tool /tmp/ansible_inventory_cache/aws_ec2_us_east_1
```

## Best Practices

Set your cache TTL based on how frequently your infrastructure changes. For mostly-static environments, 1-2 hours is reasonable. For auto-scaling environments, keep it under 10 minutes.

Always use `--flush-cache` for actual deployments. You do not want to deploy to a stale inventory.

Use the Redis or memcached backend if you have multiple control nodes or run Ansible from a CI/CD cluster. The jsonfile backend does not work when different machines need to share cache data.

Clean up old cache files periodically. The jsonfile backend does not auto-clean expired entries; it just ignores them on read. A simple cron job can handle this:

```bash
# Crontab entry to clean cache files older than 24 hours
0 * * * * find /tmp/ansible_inventory_cache -type f -mmin +1440 -delete
```

Inventory caching is one of the simplest performance optimizations you can make for Ansible workflows that use dynamic inventory. It takes a few lines of configuration and can cut minutes off every playbook run.
