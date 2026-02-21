# How to Use Ansible Ad Hoc Commands with Inventory Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Inventory, Host Patterns

Description: Master Ansible inventory patterns to target specific hosts, groups, and combinations when running ad hoc commands across your infrastructure.

---

One of the most powerful aspects of Ansible ad hoc commands is the ability to precisely target which hosts you want to affect. The host pattern, the first argument after `ansible`, supports a rich pattern language that goes well beyond simple group names. Knowing these patterns lets you surgically target exactly the right machines without maintaining dozens of separate inventory groups.

## Basic Patterns

Let us start with the fundamentals. Every Ansible ad hoc command starts with a host pattern:

```bash
# Target all hosts in the inventory
ansible all -a "hostname"

# Target a specific group
ansible webservers -a "hostname"

# Target a single host
ansible web01 -a "hostname"
```

These are the patterns you probably already use daily. But there is much more available.

## Sample Inventory for Examples

To make the examples concrete, here is the inventory file we will reference throughout this post:

```ini
# /etc/ansible/hosts

[webservers]
web01 ansible_host=10.0.1.10
web02 ansible_host=10.0.1.11
web03 ansible_host=10.0.1.12

[dbservers]
db01 ansible_host=10.0.2.10
db02 ansible_host=10.0.2.11

[cacheservers]
cache01 ansible_host=10.0.3.10
cache02 ansible_host=10.0.3.11

[monitoring]
monitor01 ansible_host=10.0.4.10

[production:children]
webservers
dbservers
cacheservers

[staging]
staging-web01 ansible_host=10.0.10.10
staging-db01 ansible_host=10.0.10.11
```

## Union Pattern (OR Logic)

Use a colon `:` to combine multiple groups or hosts. This is the OR operation.

```bash
# Target both webservers AND dbservers
ansible 'webservers:dbservers' -a "hostname"

# Target multiple individual hosts
ansible 'web01:db01:cache01' -a "hostname"

# Mix groups and individual hosts
ansible 'webservers:monitor01' -a "hostname"
```

The quotes are important when using colons, because some shells may interpret the colon differently.

## Intersection Pattern (AND Logic)

Use `:&` to match only hosts that belong to BOTH groups.

```bash
# Target hosts that are in BOTH production AND dbservers
ansible 'production:&dbservers' -a "hostname"
```

This returns `db01` and `db02` because they are in both groups.

A practical use case: say you have groups based on function (webservers, dbservers) and also groups based on datacenter (dc1, dc2). You can target "web servers in datacenter 1":

```bash
# Webservers that are also in dc1
ansible 'webservers:&dc1' -a "hostname"
```

## Exclusion Pattern (NOT Logic)

Use `:!` to exclude hosts or groups from your selection.

```bash
# All production hosts EXCEPT dbservers
ansible 'production:!dbservers' -a "hostname"

# All hosts except monitoring
ansible 'all:!monitoring' -a "hostname"

# Webservers except web03
ansible 'webservers:!web03' -a "hostname"
```

## Combining Patterns

You can chain these operations together for precise targeting:

```bash
# All production servers except cache servers, plus monitoring
ansible 'production:!cacheservers:monitoring' -a "hostname"

# Webservers and dbservers, but not web03
ansible 'webservers:dbservers:!web03' -a "hostname"
```

## Wildcard Patterns

Asterisks work as wildcards in host names:

```bash
# All hosts starting with "web"
ansible 'web*' -a "hostname"

# All hosts ending with "01"
ansible '*01' -a "hostname"

# All staging hosts
ansible 'staging-*' -a "hostname"
```

## Regex Patterns

For more complex matching, use regex patterns prefixed with `~`:

```bash
# Match hosts starting with web or db
ansible '~(web|db).*' -a "hostname"

# Match hosts with a number in the name
ansible '~.*[0-9]+' -a "hostname"

# Match hosts in a specific IP range pattern
ansible '~10\.0\.1\.*' -a "hostname"
```

## Numeric Range Patterns

Ansible supports numeric ranges in square brackets for sequentially named hosts:

```bash
# Target web01 through web03
ansible 'web[01:03]' -a "hostname"

# Target hosts with alphabetic ranges
ansible 'web[a:c]' -a "hostname"
```

This is especially useful when your servers follow a predictable naming convention.

## Limiting Hosts at Runtime

The `--limit` flag (or `-l`) further restricts which hosts from the matched pattern actually get targeted:

```bash
# Start with all webservers but only run on web01
ansible webservers -a "hostname" --limit web01

# Use a pattern in the limit
ansible all -a "hostname" --limit 'web*'

# Exclude specific hosts with limit
ansible webservers -a "hostname" --limit '!web03'

# Limit to hosts from a file (one host per line)
ansible all -a "hostname" --limit @/tmp/failed_hosts.txt
```

The file-based limit is particularly useful for retrying failed hosts from a previous run.

## Using Inventory with Patterns

You can combine patterns with custom inventory files:

```bash
# Use patterns with a specific inventory
ansible 'webservers:&production' -i /path/to/production/inventory -a "hostname"

# Use patterns with multiple inventory sources
ansible 'webservers' -i inventory/staging -i inventory/production -a "hostname"
```

## Practical Scenarios

### Rolling Restarts

Target subsets of a group for rolling operations:

```bash
# Restart nginx on web01 and web02 first
ansible 'web[01:02]' -m service -a "name=nginx state=restarted" --become

# Then restart on web03 after verifying
ansible 'web03' -m service -a "name=nginx state=restarted" --become
```

### Excluding a Troubled Server

When one server is having issues and you want to skip it:

```bash
# Update all web servers except the broken one
ansible 'webservers:!web02' -m apt -a "upgrade=yes" --become
```

### Multi-Environment Operations

Target a service across environments:

```bash
# Check nginx status on all web-related hosts across all environments
ansible 'webservers:staging' -m shell -a "systemctl status nginx" --limit '*web*'
```

### First Host Only

Sometimes you want to test on just one host before rolling out:

```bash
# Run on the first host in the webservers group
ansible webservers[0] -a "hostname"

# Run on the last host
ansible webservers[-1] -a "hostname"

# Run on the first two hosts
ansible 'webservers[0:1]' -a "hostname"
```

Note: subscript notation like `[0]` uses zero-based indexing.

## Pattern Cheat Sheet

Here is a quick reference for all the patterns:

```bash
# All hosts
ansible all -a "hostname"

# Single group
ansible webservers -a "hostname"

# Union (OR)
ansible 'webservers:dbservers' -a "hostname"

# Intersection (AND)
ansible 'production:&webservers' -a "hostname"

# Exclusion (NOT)
ansible 'all:!monitoring' -a "hostname"

# Wildcard
ansible 'web*' -a "hostname"

# Regex
ansible '~(web|db).*' -a "hostname"

# Numeric range
ansible 'web[01:05]' -a "hostname"

# Index (first host)
ansible 'webservers[0]' -a "hostname"

# Limit flag
ansible all -a "hostname" --limit 'web*:!web03'
```

## Common Mistakes

A few things to watch out for when using patterns:

```bash
# WRONG: Shell interprets the brackets
ansible web[01:03] -a "hostname"

# RIGHT: Quote the pattern
ansible 'web[01:03]' -a "hostname"

# WRONG: Space after colon
ansible 'webservers: dbservers' -a "hostname"

# RIGHT: No space after colon
ansible 'webservers:dbservers' -a "hostname"
```

Always quote patterns that contain special characters like `*`, `[`, `]`, `:`, `!`, or `&`. Different shells handle these differently, and quoting prevents unexpected behavior.

## Wrapping Up

Inventory patterns are the targeting system of Ansible ad hoc commands. They let you go from "run this on everything" to "run this on production web servers in datacenter 2, except the canary host." Union, intersection, and exclusion operators cover most real-world targeting needs, while wildcards and regex handle the edge cases. Combine these with the `--limit` flag for even more precise runtime control. Master these patterns once, and you will use them in every ad hoc command, playbook run, and role execution going forward.
