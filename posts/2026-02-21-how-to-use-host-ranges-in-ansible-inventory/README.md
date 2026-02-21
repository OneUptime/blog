# How to Use Host Ranges in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Host Ranges, DevOps, Automation

Description: Learn how to use numeric and alphabetic range patterns in Ansible inventory to define large groups of hosts without listing each one individually.

---

When you manage dozens or hundreds of servers that follow a naming convention, listing each one individually in your inventory file gets tedious fast. Ansible supports range patterns that let you define large sets of hosts in a single line. If your servers are named `web-01` through `web-50`, you do not need 50 lines in your inventory.

## Numeric Ranges

The most common use case is numeric ranges. Ansible uses the `[start:end]` syntax inside hostnames.

```ini
# inventory.ini
# Define 10 web servers using a numeric range
[webservers]
web-[01:10].example.com

# This expands to:
# web-01.example.com
# web-02.example.com
# web-03.example.com
# ... through ...
# web-10.example.com
```

The leading zero in `01` is important. It tells Ansible to zero-pad the numbers. `[01:10]` produces `01, 02, 03, ..., 10`, while `[1:10]` produces `1, 2, 3, ..., 10` (no padding).

Verify the expansion:

```bash
# List all hosts that the range pattern generates
ansible-inventory -i inventory.ini --list | python3 -m json.tool
```

## Ranges with Different Padding

```ini
# inventory.ini
# No zero-padding: server-1 through server-50
[cluster_a]
server-[1:50].example.com

# Two-digit zero-padding: node-001 through node-100
[cluster_b]
node-[001:100].example.com

# Three-digit padding: worker-0001 through worker-0500
[cluster_c]
worker-[0001:0500].example.com
```

The padding is determined by how many digits you use for the start value. `001` means three-digit padding, `0001` means four-digit padding.

## Alphabetic Ranges

Ansible also supports alphabetic ranges for servers named with letters.

```ini
# inventory.ini
# Alphabetic range: app-a through app-f
[app_servers]
app-[a:f].example.com

# This expands to:
# app-a.example.com
# app-b.example.com
# app-c.example.com
# app-d.example.com
# app-e.example.com
# app-f.example.com
```

Alphabetic ranges work with both lowercase and uppercase letters:

```ini
# inventory.ini
# Uppercase range
[racks]
rack-[A:H]-switch.datacenter.local
```

This produces `rack-A-switch.datacenter.local` through `rack-H-switch.datacenter.local`.

## Combining Multiple Ranges

You can use ranges in different parts of the hostname to create matrix-style expansions. However, each host line only supports one range. To create a matrix, you need multiple lines or a different approach.

```ini
# inventory.ini
# Servers across three racks, five per rack
[datacenter]
rack1-srv-[01:05].dc.local
rack2-srv-[01:05].dc.local
rack3-srv-[01:05].dc.local
```

This gives you 15 hosts total. If the rack numbering also follows a pattern, you would still need separate lines because Ansible does not support nested ranges in a single line.

## Ranges in YAML Inventory

YAML inventory does not have the same range syntax built in. You need to list hosts explicitly or use a plugin. However, you can use the range pattern in the hostname key:

```yaml
# inventory.yml
# YAML inventory does not natively expand ranges
# But you can reference them in specific ways
all:
  children:
    webservers:
      hosts:
        web-[01:10].example.com:
```

Note that YAML inventory support for range patterns depends on your Ansible version. In newer versions (2.10+), this works. In older versions, you may need to stick with INI format for ranges or list hosts individually.

## Ranges with Host Variables

You can apply variables to range-generated hosts at the group level:

```ini
# inventory.ini
[webservers]
web-[01:20].example.com

[webservers:vars]
ansible_user=deploy
http_port=80
```

All 20 hosts get the same group variables. If specific hosts need different values, use `host_vars` files:

```yaml
# host_vars/web-01.example.com.yml
# Override for the first web server (canary deployment target)
canary_host: true
http_port: 8080
```

## Ranges with IP Addresses

Ranges work with IP addresses too, which is handy when you have a contiguous block of IPs:

```ini
# inventory.ini
# Range of IP addresses
[lab_servers]
192.168.1.[10:30]

# This expands to 192.168.1.10 through 192.168.1.30
```

For a full subnet block:

```ini
# inventory.ini
# An entire /24 subnet range
[office_network]
10.10.5.[1:254]
```

## Ranges with Steps

Ansible does not natively support step values in ranges (like "every other host"). If you need that, use a workaround with multiple ranges or a dynamic inventory script.

For example, to get only even-numbered hosts:

```ini
# inventory.ini
# Separate groups for even and odd numbered servers
[even_servers]
srv-[02:02].example.com
srv-[04:04].example.com
srv-[06:06].example.com
srv-[08:08].example.com
srv-[10:10].example.com
```

This is ugly but functional. For complex patterns, a dynamic inventory script or the `constructed` inventory plugin is a better approach.

## Practical Example: Multi-Tier Application

Here is a realistic inventory using ranges for a web application with multiple tiers:

```ini
# inventory.ini
# Production infrastructure with ranges

# 20 web servers behind a load balancer
[webservers]
web-[001:020].prod.example.com

[webservers:vars]
ansible_user=deploy
nginx_worker_processes=auto
app_port=8080

# 3 database servers (primary + 2 replicas)
[databases]
db-[01:03].prod.example.com

[databases:vars]
ansible_user=dbadmin
pg_version=16

# 6 cache servers in two groups
[cache_primary]
cache-[01:03].prod.example.com

[cache_replica]
cache-[04:06].prod.example.com

[cache:children]
cache_primary
cache_replica

[cache:vars]
redis_maxmemory=8gb

# 10 worker nodes for background jobs
[workers]
worker-[01:10].prod.example.com

[workers:vars]
ansible_user=worker
celery_concurrency=8

# Monitoring stack
[monitoring]
prometheus-[01:02].prod.example.com
grafana-01.prod.example.com

# Everything is in production
[production:children]
webservers
databases
cache
workers
monitoring

[production:vars]
env=production
log_level=warn
```

## Testing Range Expansion

Always verify your ranges expand as expected before running playbooks:

```bash
# Show all hosts in the webservers group
ansible webservers -i inventory.ini --list-hosts

# Count the hosts
ansible webservers -i inventory.ini --list-hosts | wc -l

# Show the full inventory graph
ansible-inventory -i inventory.ini --graph
```

## Using Ranges with limit

You can combine ranges with the `--limit` flag to target a subset of range-generated hosts:

```bash
# Only run against the first 5 web servers
ansible-playbook -i inventory.ini site.yml --limit 'web-[001:005].prod.example.com'

# Run against a single host from the range
ansible-playbook -i inventory.ini site.yml --limit web-003.prod.example.com
```

## When Not to Use Ranges

Ranges work best when your infrastructure follows strict naming conventions. They fall short when:

- Server names are inconsistent (e.g., some use dashes, others use underscores)
- You have gaps in the numbering (servers 1-10 exist, but 5 and 7 were decommissioned)
- Different servers in the range need very different configurations

For environments with irregular naming or frequent changes, dynamic inventory that pulls from a CMDB or cloud provider API is usually a better fit.

## Wrapping Up

Host ranges are a simple but effective tool for keeping your inventory files compact. They work best in environments with consistent naming conventions and large numbers of similar servers. Combine them with group variables and `host_vars` overrides for individual hosts that need special treatment, and you can manage hundreds of servers with an inventory file that stays readable.
