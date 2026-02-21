# How to Use Ansible Inventory Patterns to Target Specific Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Patterns, Host Targeting, DevOps

Description: Master Ansible inventory patterns to precisely target hosts using group names, wildcards, intersections, exclusions, and regex for safe and efficient automation.

---

One of the most important skills in Ansible is knowing how to target exactly the right hosts. Running a playbook against the wrong servers can bring down production, so Ansible gives you a rich pattern syntax for selecting hosts. You can target individual hosts, entire groups, intersections of groups, and everything in between.

## Basic Patterns

The simplest patterns are a hostname or a group name.

Given this inventory:

```ini
# inventory.ini
[webservers]
web1.example.com
web2.example.com
web3.example.com

[databases]
db1.example.com
db2.example.com

[cache]
redis1.example.com
redis2.example.com

[production:children]
webservers
databases
cache
```

Target patterns in action:

```bash
# Target a single host
ansible web1.example.com -i inventory.ini -m ping

# Target an entire group
ansible webservers -i inventory.ini -m ping

# Target all hosts
ansible all -i inventory.ini -m ping

# Target ungrouped hosts (hosts not in any named group)
ansible ungrouped -i inventory.ini -m ping
```

## Union (OR) - Combining Groups

Use a colon `:` to combine multiple groups or hosts. This gives you the union of all matches.

```bash
# All web servers AND all database servers
ansible 'webservers:databases' -i inventory.ini -m ping

# A specific host AND an entire group
ansible 'web1.example.com:databases' -i inventory.ini -m ping

# Three groups combined
ansible 'webservers:databases:cache' -i inventory.ini -m ping
```

In a playbook:

```yaml
# deploy.yml
# Target web servers and cache servers
- hosts: webservers:cache
  become: true
  tasks:
    - name: Update application config
      template:
        src: config.j2
        dest: /etc/app/config.yml
```

## Intersection (AND) - Hosts in Multiple Groups

Use `:&` to select hosts that belong to multiple groups simultaneously.

```bash
# Hosts that are in BOTH production AND webservers
ansible 'production:&webservers' -i inventory.ini -m ping

# Hosts in production AND databases AND us_east
ansible 'production:&databases:&us_east' -i inventory.ini -m ping
```

This is one of the most useful patterns for safe deployments:

```yaml
# deploy-prod-web.yml
# Only deploy to production web servers (intersection)
- hosts: production:&webservers
  become: true
  serial: 1
  tasks:
    - name: Deploy application
      include_role:
        name: webapp
```

## Exclusion (NOT) - Removing Hosts

Use `:!` to exclude hosts or groups from the selection.

```bash
# All production servers EXCEPT databases
ansible 'production:!databases' -i inventory.ini -m ping

# All web servers except web3
ansible 'webservers:!web3.example.com' -i inventory.ini -m ping

# Everything except cache servers
ansible 'all:!cache' -i inventory.ini -m ping
```

Exclusion is great for maintenance windows:

```yaml
# maintenance.yml
# Patch everything except the currently active load balancer
- hosts: all:!lb-active.example.com
  serial: 3
  become: true
  tasks:
    - name: Apply security patches
      apt:
        update_cache: true
        upgrade: safe
```

## Combining Patterns

You can chain union, intersection, and exclusion together:

```bash
# Production web servers, excluding the canary host
ansible 'production:&webservers:!web1.example.com' -i inventory.ini -m ping

# All servers in staging or development, but not databases
ansible 'staging:development:!databases' -i inventory.ini -m ping

# Web servers and cache servers that are in production
ansible 'webservers:cache:&production' -i inventory.ini -m ping
```

The evaluation order matters. Ansible processes patterns left to right:

```mermaid
graph LR
    A["Start: webservers"] --> B["Union: :databases"]
    B --> C["Intersect: :&production"]
    C --> D["Exclude: :!db2.example.com"]
    D --> E["Final host list"]
```

## Using Patterns in Playbooks

The `hosts` field in a play accepts any pattern:

```yaml
# site.yml
# Multiple plays with different targeting patterns

# Base configuration for everything
- hosts: all
  become: true
  roles:
    - common

# Web tier (production web servers only)
- hosts: production:&webservers
  become: true
  roles:
    - nginx
    - webapp

# Database tier (all databases except read replicas)
- hosts: databases:!db_replicas
  become: true
  roles:
    - postgresql

# Cache tier
- hosts: cache
  become: true
  roles:
    - redis
```

## The --limit Flag

The `--limit` flag applies an additional filter on top of the playbook's `hosts` pattern:

```bash
# Playbook targets "webservers" but --limit narrows it to web1 only
ansible-playbook -i inventory.ini site.yml --limit web1.example.com

# Limit to a group
ansible-playbook -i inventory.ini site.yml --limit databases

# Limit with a pattern
ansible-playbook -i inventory.ini site.yml --limit 'webservers:!web3.example.com'

# Limit to hosts from a file (one hostname per line)
ansible-playbook -i inventory.ini site.yml --limit @retry_hosts.txt
```

The `@` prefix reads hostnames from a file. Ansible automatically creates `.retry` files with failed hosts, so you can rerun against just the failures:

```bash
# Rerun only on hosts that failed in the last run
ansible-playbook -i inventory.ini site.yml --limit @site.retry
```

## Indexed Selection

You can select specific hosts from a group by index:

```bash
# First host in webservers (0-indexed)
ansible 'webservers[0]' -i inventory.ini -m ping

# Last host in webservers
ansible 'webservers[-1]' -i inventory.ini -m ping

# First two hosts
ansible 'webservers[0:1]' -i inventory.ini -m ping

# Every other host (step of 2)
ansible 'webservers[0::2]' -i inventory.ini -m ping
```

This is useful for canary deployments:

```yaml
# canary-deploy.yml
# Deploy to just the first web server as a canary
- hosts: webservers[0]
  become: true
  tasks:
    - name: Deploy canary version
      include_role:
        name: webapp
      vars:
        canary: true
```

## Pattern Tips and Safety

Always preview which hosts a pattern matches before running a playbook:

```bash
# List matched hosts without running anything
ansible 'production:&webservers:!web1.example.com' -i inventory.ini --list-hosts

# Dry run the playbook
ansible-playbook -i inventory.ini site.yml --list-hosts
```

A few safety recommendations:

1. **Never use `all` in production playbooks** without a very good reason. Be explicit about which groups you target.

2. **Use `--limit` for one-off operations** rather than editing the playbook's `hosts` field.

3. **Combine `serial` with patterns** to limit blast radius. Even if the pattern matches 50 hosts, `serial: 5` processes them in batches of 5.

4. **Quote patterns on the command line.** The `!` and `&` characters have special meaning in most shells. Always wrap patterns in single quotes: `'production:!databases'`.

```yaml
# Safe deployment pattern
- hosts: production:&webservers
  serial: 2        # Deploy to 2 servers at a time
  max_fail_percentage: 25  # Stop if more than 25% fail
  become: true
  tasks:
    - name: Deploy application
      include_role:
        name: webapp
```

## Pattern Quick Reference

| Pattern | Meaning |
|---------|---------|
| `all` | Every host in inventory |
| `groupname` | All hosts in group |
| `host1:host2` | Union (OR) |
| `group1:&group2` | Intersection (AND) |
| `group1:!group2` | Exclusion (NOT) |
| `group1[0]` | First host in group |
| `group1[0:3]` | First 4 hosts in group |
| `~web.*` | Regex match |
| `*.example.com` | Wildcard match |

Ansible patterns give you surgical precision in targeting your infrastructure. Learn the syntax, always preview with `--list-hosts`, and combine patterns with `serial` for safe, controlled deployments.
