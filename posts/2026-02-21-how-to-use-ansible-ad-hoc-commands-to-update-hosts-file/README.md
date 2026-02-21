# How to Use Ansible Ad Hoc Commands to Update Hosts File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Hosts File, DNS, Networking

Description: Learn how to manage and update /etc/hosts entries across your server fleet using Ansible ad hoc commands for consistent name resolution.

---

The `/etc/hosts` file is often overlooked, but it plays a critical role in internal service discovery, especially in environments without a full DNS infrastructure. When you add a new database server, migrate an internal service to a different IP, or need to override DNS for testing, updating `/etc/hosts` across your fleet needs to happen quickly and consistently. Ansible ad hoc commands make this straightforward.

## Checking Current Hosts File

Before making changes, see what is currently in the hosts file:

```bash
# View the hosts file on all servers
ansible all -a "cat /etc/hosts"

# Check if a specific entry exists
ansible all -m shell -a "grep 'db.internal' /etc/hosts" --one-line

# Count entries in the hosts file
ansible all -m shell -a "wc -l /etc/hosts" --one-line
```

## Adding a Hosts Entry with lineinfile

The `lineinfile` module is the best tool for adding or updating single entries in `/etc/hosts`:

```bash
# Add a new entry to /etc/hosts on all servers
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.50 db.internal db' state=present" --become

# Add an entry only if it does not already exist (lineinfile handles this by default)
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.51 cache.internal redis' state=present" --become

# Add multiple entries (run multiple commands)
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.50 db-primary.internal' state=present" --become
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.51 db-replica.internal' state=present" --become
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.52 cache.internal' state=present" --become
```

## Updating an Existing Entry

When a server's IP changes, you need to update the existing entry rather than add a duplicate:

```bash
# Update the IP for db.internal (match by hostname, replace the entire line)
ansible all -m lineinfile -a "path=/etc/hosts regexp='^.*db\.internal.*$' line='10.0.2.50 db.internal db' state=present" --become

# Update based on the old IP address
ansible all -m lineinfile -a "path=/etc/hosts regexp='^10\.0\.1\.50' line='10.0.2.50 db.internal db' state=present" --become
```

The `regexp` parameter matches the existing line, and the `line` parameter replaces it entirely. This ensures you do not end up with duplicate entries.

## Removing a Hosts Entry

When a server is decommissioned, remove its entry:

```bash
# Remove a specific entry by matching the hostname
ansible all -m lineinfile -a "path=/etc/hosts regexp='.*db-old\.internal.*' state=absent" --become

# Remove an entry by IP address
ansible all -m lineinfile -a "path=/etc/hosts regexp='^10\.0\.1\.99.*' state=absent" --become

# Verify the removal
ansible all -m shell -a "grep 'db-old' /etc/hosts || echo 'Entry removed'" --one-line
```

## Using the blockinfile Module for Multiple Entries

When you need to add a block of related entries, `blockinfile` is cleaner than multiple `lineinfile` calls:

```bash
# Add a managed block of entries
ansible all -m blockinfile -a "path=/etc/hosts block='# Application servers
10.0.1.10 app1.internal app1
10.0.1.11 app2.internal app2
10.0.1.12 app3.internal app3
# Database servers
10.0.1.50 db-primary.internal db-primary
10.0.1.51 db-replica.internal db-replica
# Cache servers
10.0.1.60 redis1.internal redis1
10.0.1.61 redis2.internal redis2' marker='# {mark} ANSIBLE MANAGED - Internal Services'" --become
```

The `blockinfile` module wraps your entries in marker comments:

```
# BEGIN ANSIBLE MANAGED - Internal Services
# Application servers
10.0.1.10 app1.internal app1
10.0.1.11 app2.internal app2
10.0.1.12 app3.internal app3
# Database servers
10.0.1.50 db-primary.internal db-primary
10.0.1.51 db-replica.internal db-replica
# Cache servers
10.0.1.60 redis1.internal redis1
10.0.1.61 redis2.internal redis2
# END ANSIBLE MANAGED - Internal Services
```

To update this block, run the same command with different content. The module replaces everything between the markers.

```bash
# Update the managed block (replaces the entire block between markers)
ansible all -m blockinfile -a "path=/etc/hosts block='# Application servers
10.0.1.10 app1.internal app1
10.0.1.11 app2.internal app2
10.0.1.12 app3.internal app3
10.0.1.13 app4.internal app4
# Database servers
10.0.2.50 db-primary.internal db-primary
10.0.2.51 db-replica.internal db-replica
# Cache servers
10.0.1.60 redis1.internal redis1
10.0.1.61 redis2.internal redis2
10.0.1.62 redis3.internal redis3' marker='# {mark} ANSIBLE MANAGED - Internal Services'" --become
```

## Removing a Managed Block

```bash
# Remove the entire managed block
ansible all -m blockinfile -a "path=/etc/hosts marker='# {mark} ANSIBLE MANAGED - Internal Services' state=absent" --become
```

## Using the copy Module for Complete Replacement

If you want to maintain a canonical hosts file and push it everywhere:

```bash
# Push a complete hosts file to all servers
ansible all -m copy -a "src=./hosts dest=/etc/hosts owner=root group=root mode=0644 backup=yes" --become
```

The `backup=yes` parameter creates a timestamped backup before overwriting, so you can roll back if something goes wrong.

However, this approach has a downside: each server may need a slightly different hosts file (with its own hostname entry). For server-specific entries, `lineinfile` or `blockinfile` is better.

## Practical Scenarios

### Adding a New Database Server

When provisioning a new database replica:

```bash
# Step 1: Add the new host entry to all servers
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.53 db-replica-2.internal db-replica-2' state=present" --become

# Step 2: Verify the entry was added
ansible all -m shell -a "grep 'db-replica-2' /etc/hosts" --one-line

# Step 3: Test name resolution
ansible appservers -m shell -a "getent hosts db-replica-2.internal"
```

### Migrating a Service to a New IP

```bash
# Step 1: Check the current entry
ansible all -m shell -a "grep 'api.internal' /etc/hosts" --one-line

# Step 2: Dry run the update
ansible all -m lineinfile -a "path=/etc/hosts regexp='.*api\.internal.*' line='10.0.3.10 api.internal api'" --become --check --diff

# Step 3: Apply the update
ansible all -m lineinfile -a "path=/etc/hosts regexp='.*api\.internal.*' line='10.0.3.10 api.internal api'" --become

# Step 4: Verify
ansible all -m shell -a "getent hosts api.internal" --one-line
```

### Setting Up a Development Override

Temporarily point a domain to a different server for testing:

```bash
# Override api.example.com to point to the staging server
ansible dev_machines -m lineinfile -a "path=/etc/hosts line='10.0.5.10 api.example.com' state=present" --become

# Remove the override when done
ansible dev_machines -m lineinfile -a "path=/etc/hosts regexp='.*api\.example\.com.*' state=absent" --become
```

### Fleet-Wide Hosts File Audit

```bash
#!/bin/bash
# audit_hosts.sh - Compare /etc/hosts across all servers
# Usage: ./audit_hosts.sh

INVENTORY="inventory/production.ini"

echo "Hosts file audit - $(date)"
echo "=========================="

# Save hosts file from each server
ansible all -i "$INVENTORY" -m fetch -a "src=/etc/hosts dest=./hosts_audit/ flat=no" > /dev/null 2>&1

# Compare each hosts file to the first one
REFERENCE=""
for file in ./hosts_audit/*/etc/hosts; do
    HOST=$(echo "$file" | cut -d'/' -f3)
    if [ -z "$REFERENCE" ]; then
        REFERENCE="$file"
        echo "Reference host: $HOST"
        continue
    fi

    DIFF=$(diff "$REFERENCE" "$file" 2>/dev/null)
    if [ -n "$DIFF" ]; then
        echo ""
        echo "Differences on $HOST:"
        echo "$DIFF"
    fi
done

# Clean up
rm -rf ./hosts_audit/
```

## Handling IPv6 Entries

Do not forget about IPv6 entries:

```bash
# Add an IPv6 hosts entry
ansible all -m lineinfile -a "path=/etc/hosts line='fd00::10 app1.internal app1' state=present" --become

# Update an IPv6 entry
ansible all -m lineinfile -a "path=/etc/hosts regexp='^fd00::10' line='fd00::20 app1.internal app1' state=present" --become
```

## Safety Measures

The hosts file is critical. A bad entry can break DNS resolution and make servers unreachable. Always take precautions:

```bash
# Always create a backup before changes
ansible all -m copy -a "src=/etc/hosts dest=/etc/hosts.bak remote_src=yes" --become

# Use check mode to preview changes
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.50 db.internal' state=present" --become --check --diff

# Test on one server first
ansible web1.example.com -m lineinfile -a "path=/etc/hosts line='10.0.1.50 db.internal' state=present" --become

# Verify you can still reach the server after the change
ansible web1.example.com -m ping

# Then roll out to all
ansible all -m lineinfile -a "path=/etc/hosts line='10.0.1.50 db.internal' state=present" --become
```

## Rolling Back Changes

If a hosts file change causes problems:

```bash
# Restore from the backup we created
ansible all -m copy -a "src=/etc/hosts.bak dest=/etc/hosts remote_src=yes" --become

# Or remove the specific entry that is causing issues
ansible all -m lineinfile -a "path=/etc/hosts regexp='.*problematic-host.*' state=absent" --become
```

## Summary

Managing `/etc/hosts` across a server fleet with Ansible ad hoc commands ensures consistency and eliminates the risk of manual errors. Use `lineinfile` for individual entries, `blockinfile` for groups of related entries with managed markers, and `copy` when you want to push a complete canonical file. Always use `--check --diff` to preview changes, create backups before modifications, and test on a single host before rolling out to the entire fleet. These practices keep your internal name resolution reliable and your servers reachable.
