# How to Use Ansible Playbook --list-hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Host Management, DevOps

Description: Learn how to use the ansible-playbook --list-hosts flag to preview which hosts a playbook will target before running it in production.

---

Before running a playbook, especially in production, you should verify that it will target the correct servers. The `--list-hosts` flag shows you exactly which hosts a playbook will affect without executing any tasks. This simple check has prevented countless incidents where a playbook was accidentally run against the wrong set of servers.

## Basic Usage

Run `--list-hosts` to see the target hosts:

```bash
# List all hosts that the playbook would target
ansible-playbook --list-hosts deploy.yml
```

Output:

```
playbook: deploy.yml

  play #1 (webservers): Deploy web application	TAGS: []
    pattern: ['webservers']
    hosts (3):
      web1.example.com
      web2.example.com
      web3.example.com

  play #2 (dbservers): Configure databases	TAGS: []
    pattern: ['dbservers']
    hosts (2):
      db1.example.com
      db2.example.com
```

This tells you that play #1 will run on 3 web servers and play #2 will run on 2 database servers.

## Why --list-hosts Matters

Consider this scenario:

```yaml
# oops.yml - Targeting the wrong group
---
- name: Remove old data
  hosts: all  # Meant to write 'staging' but wrote 'all'
  become: yes

  tasks:
    - name: Clean up old deployment artifacts
      file:
        path: /opt/releases/old
        state: absent
```

Running `--list-hosts` first would have shown every server in your inventory, catching the mistake before it deleted files from production systems.

```bash
# Check BEFORE running
ansible-playbook --list-hosts oops.yml
```

```
playbook: oops.yml

  play #1 (all): Remove old data	TAGS: []
    pattern: ['all']
    hosts (47):
      web1.example.com
      web2.example.com
      ...
      prod-db1.example.com
      prod-db2.example.com
```

Seeing 47 hosts instead of the expected 5 staging hosts immediately signals something is wrong.

## Using with Different Inventories

The host list depends on which inventory you specify:

```bash
# Check hosts in production inventory
ansible-playbook --list-hosts -i inventories/production/hosts.ini deploy.yml

# Check hosts in staging inventory
ansible-playbook --list-hosts -i inventories/staging/hosts.ini deploy.yml

# Check hosts in development inventory
ansible-playbook --list-hosts -i inventories/development/hosts.ini deploy.yml
```

This is critical for multi-environment setups where the same playbook runs against different inventories:

```bash
# Production shows:
# hosts (12): web1.example.com, web2.example.com, ...

# Staging shows:
# hosts (2): staging-web1.example.com, staging-web2.example.com
```

## Combining with --limit

The `--limit` flag restricts which hosts a playbook targets. Use `--list-hosts` to verify the limit works correctly:

```bash
# Limit to a single host
ansible-playbook --list-hosts --limit web1.example.com deploy.yml

# Limit to a subset using a pattern
ansible-playbook --list-hosts --limit "web[1:2].example.com" deploy.yml

# Limit using a group
ansible-playbook --list-hosts --limit staging deploy.yml

# Exclude specific hosts
ansible-playbook --list-hosts --limit 'all:!db1.example.com' deploy.yml
```

Output with limit:

```
playbook: deploy.yml

  play #1 (webservers): Deploy web application	TAGS: []
    pattern: ['webservers']
    hosts (1):
      web1.example.com
```

## Host Patterns in Playbooks

Different host patterns produce different results. Use `--list-hosts` to verify your patterns:

```yaml
# pattern-examples.yml - Various host targeting patterns
---
# Target a specific group
- name: Web servers only
  hosts: webservers
  tasks: []

# Target multiple groups
- name: Web and app servers
  hosts: webservers:appservers
  tasks: []

# Target intersection of groups (hosts in BOTH groups)
- name: Servers that are both web AND production
  hosts: webservers:&production
  tasks: []

# Target difference (in one group but not another)
- name: Web servers but not staging
  hosts: webservers:!staging
  tasks: []

# Target all hosts
- name: Everything
  hosts: all
  tasks: []

# Target with wildcards
- name: All servers starting with web
  hosts: web*
  tasks: []
```

Check each play's host resolution:

```bash
ansible-playbook --list-hosts pattern-examples.yml
```

```
playbook: pattern-examples.yml

  play #1 (webservers): Web servers only	TAGS: []
    pattern: ['webservers']
    hosts (3):
      web1.example.com
      web2.example.com
      web3.example.com

  play #2 (webservers:appservers): Web and app servers	TAGS: []
    pattern: ['webservers', 'appservers']
    hosts (5):
      web1.example.com
      web2.example.com
      web3.example.com
      app1.example.com
      app2.example.com

  play #3 (webservers:&production): Servers that are both web AND production	TAGS: []
    pattern: ['webservers', '&production']
    hosts (2):
      web1.example.com
      web2.example.com
```

## Practical Scenarios

### Rolling Deployment Verification

Before a rolling deployment, verify which servers will be affected:

```yaml
# rolling-deploy.yml
---
- name: Rolling deployment
  hosts: webservers
  serial: 3

  tasks:
    - name: Deploy application
      copy:
        src: files/app.jar
        dest: /opt/myapp/
```

```bash
# Verify target hosts before deploying
ansible-playbook --list-hosts -i inventories/production/hosts.ini rolling-deploy.yml
```

### Canary Deployment Verification

For canary deployments, verify only the canary hosts are targeted first:

```bash
# First: verify canary hosts
ansible-playbook --list-hosts --limit canary deploy.yml

# Output shows only canary servers:
# hosts (1):
#   web1.example.com

# Satisfied? Run the canary deployment
ansible-playbook --limit canary deploy.yml

# Then verify full deployment targets
ansible-playbook --list-hosts deploy.yml

# Output shows all servers
```

### Disaster Recovery Verification

Before running DR procedures, triple-check the targets:

```bash
# CRITICAL: Verify DR targets before failover
echo "DR Failover Target Hosts:"
ansible-playbook --list-hosts -i inventories/dr/hosts.ini failover.yml

echo ""
echo "Are these the correct DR targets? (yes/no)"
read confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi
```

## Scripting with --list-hosts

Extract the host list programmatically:

```bash
#!/bin/bash
# get-hosts.sh - Extract host list from a playbook

PLAYBOOK="${1:-deploy.yml}"
INVENTORY="${2:-inventories/production/hosts.ini}"

# Extract just the hostnames (one per line)
HOSTS=$(ansible-playbook --list-hosts -i "$INVENTORY" "$PLAYBOOK" 2>/dev/null | \
    grep -E "^\s+\S+\.\S+" | \
    sed 's/^[[:space:]]*//')

echo "$HOSTS"
```

Use this in automation:

```bash
# Count total affected hosts
HOST_COUNT=$(./get-hosts.sh deploy.yml | wc -l)
echo "This deployment will affect $HOST_COUNT hosts"

# Generate a pre-deployment report
echo "Pre-Deployment Report" > report.txt
echo "===================" >> report.txt
echo "Playbook: deploy.yml" >> report.txt
echo "Date: $(date)" >> report.txt
echo "Target hosts ($HOST_COUNT):" >> report.txt
./get-hosts.sh deploy.yml >> report.txt
```

## Integration with Safety Scripts

Build a safety wrapper that always checks hosts before running:

```bash
#!/bin/bash
# safe-ansible.sh - Always verify hosts before execution

PLAYBOOK="$1"
shift

if [ -z "$PLAYBOOK" ]; then
    echo "Usage: $0 <playbook> [ansible-playbook args...]"
    exit 1
fi

echo "=== Target Host Verification ==="
ansible-playbook --list-hosts "$PLAYBOOK" "$@"
echo ""

HOST_COUNT=$(ansible-playbook --list-hosts "$PLAYBOOK" "$@" 2>/dev/null | grep -cE "^\s+\S")

echo "Total hosts: $HOST_COUNT"
echo ""

if [ "$HOST_COUNT" -gt 10 ]; then
    echo "WARNING: More than 10 hosts will be affected!"
fi

read -p "Proceed with execution? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
    ansible-playbook "$PLAYBOOK" "$@"
else
    echo "Execution cancelled."
fi
```

Usage:

```bash
# Always goes through the safety check
./safe-ansible.sh deploy.yml -i inventories/production/hosts.ini -e version=2.1.0
```

## Dynamic Inventory Verification

With dynamic inventories (AWS, GCP, Azure), `--list-hosts` is even more important because the host list changes as infrastructure scales:

```bash
# Verify which EC2 instances will be targeted
ansible-playbook --list-hosts -i aws_ec2.yml deploy.yml

# Output might show instances you didn't expect:
# hosts (8):
#   i-0a1b2c3d4e5f (10.0.1.10)
#   i-1b2c3d4e5f6g (10.0.1.11)
#   ...
```

## Combining with Other List Flags

Use multiple list flags together for a complete preview:

```bash
# List hosts AND tasks
ansible-playbook --list-hosts --list-tasks deploy.yml

# List hosts AND tags
ansible-playbook --list-hosts --list-tags deploy.yml
```

## Common Pitfalls

**Empty host list**: If `--list-hosts` shows no hosts, check your inventory path and group names:

```bash
# No hosts found
ansible-playbook --list-hosts deploy.yml
# Output: hosts (0):

# Debug: Check what groups exist in the inventory
ansible-inventory -i inventories/production/hosts.ini --list --yaml | head -20
```

**Wrong inventory file**: If the default inventory is not what you expect, always specify `-i`:

```bash
# This might use the wrong inventory from ansible.cfg
ansible-playbook --list-hosts deploy.yml

# Always be explicit in production
ansible-playbook --list-hosts -i inventories/production/hosts.ini deploy.yml
```

## Summary

The `--list-hosts` flag is a safety check that takes one second and can prevent serious incidents. Run it before every production deployment to verify the correct servers are targeted. Combine it with `--limit` to verify subset targeting, use it with different inventories to compare environments, and build it into wrapper scripts for mandatory verification. Make it a habit: list hosts first, then run the playbook.
