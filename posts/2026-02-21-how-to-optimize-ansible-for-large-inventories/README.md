# How to Optimize Ansible for Large Inventories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Performance, Scaling

Description: Optimize Ansible for large inventories with thousands of hosts using inventory plugins, caching, and playbook structuring techniques.

---

Ansible was designed for simplicity, and that simplicity works well at small scale. But when your inventory grows to thousands or tens of thousands of hosts, performance problems emerge. Inventory loading gets slow, memory usage climbs, and playbook execution drags. This post covers the specific techniques I have used to keep Ansible responsive at scale.

## The Problem with Large Inventories

A static inventory file with 5,000 hosts is surprisingly painful. Ansible parses the entire file at startup, builds host objects in memory, resolves all group memberships, and merges all variable layers. On a 10,000-host inventory, just loading the inventory can take 15-30 seconds before any task runs.

Dynamic inventories from cloud providers have their own issues: API rate limits, pagination delays, and the overhead of fetching metadata for every host.

## Use Inventory Caching

For dynamic inventories, caching prevents redundant API calls:

```ini
# ansible.cfg - Enable inventory caching
[inventory]
cache = true
cache_plugin = jsonfile
cache_connection = /var/cache/ansible/inventory
cache_timeout = 3600
```

Create the cache directory:

```bash
# Create inventory cache directory
mkdir -p /var/cache/ansible/inventory
chmod 700 /var/cache/ansible/inventory
```

With caching, the first run fetches from the cloud API, and subsequent runs use the cached data. This can cut inventory loading from 30+ seconds to under 1 second.

## Use limit to Target Subsets

Never run against all hosts when you only need a subset:

```bash
# Bad: processes all 5000 hosts even though only webservers are targeted
ansible-playbook deploy.yml

# Better: limit to specific hosts
ansible-playbook deploy.yml --limit webservers

# Even better: limit to specific hosts within a group
ansible-playbook deploy.yml --limit "web-[01:10].example.com"
```

The `--limit` flag reduces the number of hosts Ansible needs to process. For a targeted deployment to 10 out of 5,000 hosts, this makes a massive difference.

## Split Large Inventories

Instead of one monolithic inventory file, split by function or region:

```
inventories/
  production/
    us-east/
      hosts.yml
      group_vars/
    us-west/
      hosts.yml
      group_vars/
    eu-west/
      hosts.yml
      group_vars/
  staging/
    hosts.yml
    group_vars/
```

Then target specific subsets:

```bash
# Only load the US-East inventory
ansible-playbook deploy.yml -i inventories/production/us-east/

# Or combine specific inventories
ansible-playbook deploy.yml -i inventories/production/us-east/ -i inventories/production/us-west/
```

## Optimize Group Variables

With large inventories, group variable resolution can be expensive. Ansible merges variables from every group a host belongs to, in a specific precedence order. Deep group hierarchies with many variable files slow this down.

```yaml
# Bad: deep group hierarchy with many layers
all:
  children:
    datacenters:
      children:
        us_east:
          children:
            us_east_prod:
              children:
                us_east_prod_web:
                  children:
                    us_east_prod_web_tier1:
                      hosts:
                        web01:

# Better: flat group structure
all:
  children:
    region_us_east:
      hosts:
        web01:
    env_prod:
      hosts:
        web01:
    role_web:
      hosts:
        web01:
```

The flat structure has fewer levels of variable merging. Each host might belong to 3-4 groups instead of 6-7 nested groups.

## Use Constructed Inventory for Dynamic Groups

Instead of defining groups statically, use the `constructed` inventory plugin to build groups on the fly:

```yaml
# inventories/constructed.yml
plugin: constructed
strict: false
keyed_groups:
  # Create groups based on OS family
  - prefix: os
    key: ansible_os_family
  # Create groups based on region tag
  - prefix: region
    key: tags.region
    default_value: unknown
groups:
  # Create a group for large instances
  big_instances: ansible_memtotal_mb | default(0) | int > 16384
compose:
  # Create a variable from existing data
  datacenter: tags.datacenter | default('unknown')
```

This avoids maintaining large static group definitions and keeps the inventory lean.

## Tune Forks for Your Inventory Size

The fork count should scale with your inventory:

```ini
# ansible.cfg - Scale forks with inventory size
[defaults]
forks = 100
```

But be aware that high fork counts with large inventories can exhaust memory on the control node. Monitor your control node:

```bash
# Watch memory during a large playbook run
watch -n 2 "free -m && echo '---' && ps aux | grep ansible | wc -l"
```

A formula that works well:

```
forks = min(host_count, available_ram_gb * 10, cpu_cores * 25)
```

## Disable Unnecessary Variable Lookups

Ansible loads variables from multiple sources by default: host_vars, group_vars, extra vars, role defaults, etc. For large inventories, the filesystem lookups add up:

```ini
# ansible.cfg - Speed up variable loading
[defaults]
# Only look for variable files in specific locations
vars_plugins_enabled = host_group_vars

# Disable vault auto-decrypt if not using vault
# (this skips vault header checks on every file)
```

## Use serial for Staged Execution

With thousands of hosts, running all tasks on all hosts simultaneously is impractical. Use `serial` to process in batches:

```yaml
---
# Process 100 hosts at a time
- hosts: all
  serial: 100
  tasks:
    - name: Update system packages
      apt:
        upgrade: dist
        update_cache: true
```

Or use a percentage:

```yaml
---
# Process 10% of hosts at a time
- hosts: all
  serial: "10%"
  tasks:
    - name: Rolling restart
      service:
        name: myapp
        state: restarted
```

## Optimize Fact Gathering for Scale

Fact gathering is proportional to host count. At 5,000 hosts, even with 100 forks, gathering facts takes minutes:

```ini
# ansible.cfg - Minimize fact overhead at scale
[defaults]
gathering = smart
fact_caching = redis
fact_caching_connection = redis.internal:6379:0
fact_caching_timeout = 86400
gather_subset = min
```

Or disable facts and use cached infrastructure data:

```yaml
---
# Skip facts entirely, use inventory variables
- hosts: all
  gather_facts: false
  tasks:
    - name: Deploy using inventory data only
      template:
        src: config.j2
        dest: /etc/myapp/config.yml
      # Template uses inventory_hostname and group_vars, not ansible_* facts
```

## Use Patterns to Reduce Host Scope

Ansible's pattern syntax lets you narrow the host scope in your playbook:

```yaml
---
# Only target webservers in the us-east region
- hosts: "webservers:&us_east"
  tasks:
    - name: Deploy to US East webservers
      copy:
        src: app.tar.gz
        dest: /opt/app/

# Exclude maintenance hosts
- hosts: "all:!maintenance"
  tasks:
    - name: Run health checks
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
```

## Parallel Inventory Scripts

If you use custom inventory scripts, ensure they can run quickly. Slow inventory scripts block everything:

```python
#!/usr/bin/env python3
# fast_inventory.py - Optimized custom inventory script

import json
import sys
import os
import time

CACHE_FILE = "/tmp/ansible-custom-inventory-cache.json"
CACHE_TTL = 3600  # 1 hour

def load_cache():
    """Load cached inventory if fresh enough."""
    if os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        if time.time() - mtime < CACHE_TTL:
            with open(CACHE_FILE) as f:
                return json.load(f)
    return None

def fetch_inventory():
    """Fetch inventory from source (database, API, etc.)."""
    # Replace with your actual inventory source
    inventory = {
        "webservers": {
            "hosts": ["web-01", "web-02", "web-03"],
            "vars": {"http_port": 80}
        },
        "_meta": {
            "hostvars": {
                "web-01": {"ansible_host": "10.0.1.10"},
                "web-02": {"ansible_host": "10.0.1.11"},
                "web-03": {"ansible_host": "10.0.1.12"}
            }
        }
    }
    return inventory

def save_cache(inventory):
    """Save inventory to cache file."""
    with open(CACHE_FILE, 'w') as f:
        json.dump(inventory, f)

if __name__ == '__main__':
    if '--list' in sys.argv:
        inventory = load_cache()
        if inventory is None:
            inventory = fetch_inventory()
            save_cache(inventory)
        print(json.dumps(inventory))
    elif '--host' in sys.argv:
        print(json.dumps({}))
```

The key optimization is caching the inventory response so repeated calls do not hit the backend every time.

## Memory Optimization

Large inventories consume significant memory. Each host object in Ansible's memory includes all its variables, facts, and group memberships:

```bash
# Estimate memory usage per host
# Roughly 50-100 KB per host with facts, 5-10 KB without facts
# 5000 hosts with facts: ~250-500 MB
# 5000 hosts without facts: ~25-50 MB
```

Strategies to reduce memory:

1. Disable fact gathering (`gather_facts: false`)
2. Minimize group_vars and host_vars
3. Avoid storing large data in `set_fact`
4. Use `--limit` to reduce the active host set

```yaml
# Bad: stores large output in memory for every host
- name: Get all logs
  command: journalctl --no-pager
  register: all_logs

# Better: process and discard
- name: Check for errors in logs
  shell: journalctl --no-pager | grep -c ERROR
  register: error_count
  changed_when: false
```

## Summary

Optimizing Ansible for large inventories requires attention to every layer: inventory loading, variable resolution, fact gathering, connection management, and memory usage. The most impactful changes are inventory caching, targeted host selection with `--limit`, minimal fact gathering, and appropriate fork counts. Start with these fundamentals and tune from there based on your specific scale and constraints.
