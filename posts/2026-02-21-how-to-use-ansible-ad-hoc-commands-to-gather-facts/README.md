# How to Use Ansible Ad Hoc Commands to Gather Facts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Facts, System Information

Description: Learn how to use Ansible ad hoc commands with the setup module to gather system facts like OS, memory, network, and disk information from remote hosts.

---

Ansible facts are structured data about your remote hosts: operating system, IP addresses, memory, CPU count, disk layout, and much more. Normally, Ansible gathers facts automatically at the start of every playbook run. But you can also gather facts on demand using ad hoc commands, which is incredibly useful for inventory auditing, troubleshooting, and capacity planning.

## The Setup Module

The `setup` module is what Ansible uses internally to gather facts. When you run it as an ad hoc command, you get a full dump of all discovered information about the target hosts.

```bash
# Gather all facts from all hosts
ansible all -m setup
```

This produces a massive JSON output with hundreds of facts. On a typical Linux host, the output runs over 500 lines. You rarely want all of it at once.

## Filtering Facts

The `filter` parameter lets you narrow down the output to specific facts:

```bash
# Get only the OS distribution info
ansible all -m setup -a "filter=ansible_distribution*"

# Get only memory information
ansible all -m setup -a "filter=ansible_mem*"

# Get only network interface details
ansible all -m setup -a "filter=ansible_default_ipv4"

# Get only the hostname
ansible all -m setup -a "filter=ansible_hostname"

# Get CPU information
ansible all -m setup -a "filter=ansible_processor*"

# Get disk mount information
ansible all -m setup -a "filter=ansible_mounts"
```

The filter parameter accepts shell-style glob patterns, so `ansible_distribution*` matches `ansible_distribution`, `ansible_distribution_version`, `ansible_distribution_release`, and so on.

## Practical Examples

### Auditing OS Versions Across Your Fleet

When you need to know what operating systems you are running across your infrastructure:

```bash
# Get OS distribution and version from all servers
ansible all -m setup -a "filter=ansible_distribution*" --one-line
```

Output:

```
web1 | SUCCESS => {"ansible_facts": {"ansible_distribution": "Ubuntu", "ansible_distribution_major_version": "22", "ansible_distribution_release": "jammy", "ansible_distribution_version": "22.04"}}
web2 | SUCCESS => {"ansible_facts": {"ansible_distribution": "Ubuntu", "ansible_distribution_major_version": "22", "ansible_distribution_release": "jammy", "ansible_distribution_version": "22.04"}}
db1 | SUCCESS => {"ansible_facts": {"ansible_distribution": "Rocky", "ansible_distribution_major_version": "9", "ansible_distribution_release": "Blue Onyx", "ansible_distribution_version": "9.3"}}
```

### Checking Memory Across Servers

Before deploying a memory-hungry application, check available memory:

```bash
# Get memory details from all hosts
ansible all -m setup -a "filter=ansible_memtotal_mb"
```

Output:

```
web1 | SUCCESS => {
    "ansible_facts": {
        "ansible_memtotal_mb": 7963
    }
}
web2 | SUCCESS => {
    "ansible_facts": {
        "ansible_memtotal_mb": 15927
    }
}
db1 | SUCCESS => {
    "ansible_facts": {
        "ansible_memtotal_mb": 31854
    }
}
```

### Getting IP Addresses

Find the primary IP address of each server:

```bash
# Get the default IPv4 address and interface
ansible all -m setup -a "filter=ansible_default_ipv4"
```

Output:

```
web1 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "10.0.1.10",
            "alias": "eth0",
            "broadcast": "10.0.1.255",
            "gateway": "10.0.1.1",
            "interface": "eth0",
            "macaddress": "02:42:0a:00:01:0a",
            "mtu": 1500,
            "netmask": "255.255.255.0",
            "network": "10.0.1.0",
            "type": "ether"
        }
    }
}
```

### Disk Space Inventory

Check disk mounts and available space:

```bash
# Get mount point information from database servers
ansible databases -m setup -a "filter=ansible_mounts"
```

This returns detailed information for each mount point including device, mount point, filesystem type, total size, and available space.

## Gathering Specific Fact Subsets

You can speed up fact gathering by collecting only specific categories of facts using the `gather_subset` parameter:

```bash
# Gather only network facts (much faster than full gather)
ansible all -m setup -a "gather_subset=network"

# Gather only hardware facts
ansible all -m setup -a "gather_subset=hardware"

# Gather only virtual machine facts
ansible all -m setup -a "gather_subset=virtual"

# Gather minimal facts (just the basics)
ansible all -m setup -a "gather_subset=min"

# Exclude specific subsets (gather everything except hardware)
ansible all -m setup -a "gather_subset=all,!hardware"
```

Available subsets include: `all`, `min`, `hardware`, `network`, `virtual`, `ohai`, `facter`.

## Saving Facts to Files

For auditing and documentation, save fact output to files:

```bash
# Save facts for each host as separate JSON files in a directory
ansible all -m setup --tree /tmp/facts/

# View a specific host's facts
cat /tmp/facts/web1 | python3 -m json.tool

# Extract specific information from saved facts
cat /tmp/facts/web1 | python3 -c "
import json, sys
data = json.load(sys.stdin)
facts = data['ansible_facts']
print('Hostname:', facts['ansible_hostname'])
print('OS:', facts['ansible_distribution'], facts['ansible_distribution_version'])
print('Memory:', facts['ansible_memtotal_mb'], 'MB')
print('CPUs:', facts['ansible_processor_vcpus'])
"
```

## Building an Inventory Report

Here is a shell script that uses ad hoc fact gathering to generate a quick infrastructure report:

```bash
#!/bin/bash
# generate_inventory_report.sh
# Creates a CSV inventory report using Ansible fact gathering

INVENTORY="inventory/production.ini"
OUTPUT="infrastructure_report.csv"
FACTS_DIR="/tmp/ansible_facts_$$"

echo "hostname,ip_address,os,os_version,memory_mb,cpus,disk_total_gb" > "$OUTPUT"

# Gather facts and save to files
ansible all -m setup -i "$INVENTORY" --tree "$FACTS_DIR" > /dev/null 2>&1

# Process each fact file
for fact_file in "$FACTS_DIR"/*; do
    hostname=$(basename "$fact_file")
    python3 -c "
import json, sys

with open('$fact_file') as f:
    data = json.load(f)

facts = data.get('ansible_facts', {})
hostname = facts.get('ansible_hostname', 'unknown')
ip = facts.get('ansible_default_ipv4', {}).get('address', 'unknown')
os_name = facts.get('ansible_distribution', 'unknown')
os_ver = facts.get('ansible_distribution_version', 'unknown')
mem = facts.get('ansible_memtotal_mb', 0)
cpus = facts.get('ansible_processor_vcpus', 0)

# Calculate total disk space
mounts = facts.get('ansible_mounts', [])
total_disk = sum(m.get('size_total', 0) for m in mounts) / (1024**3)

print(f'{hostname},{ip},{os_name},{os_ver},{mem},{cpus},{total_disk:.1f}')
" >> "$OUTPUT"
done

# Clean up
rm -rf "$FACTS_DIR"

echo "Report saved to $OUTPUT"
echo "Summary:"
wc -l "$OUTPUT"
```

## Custom Facts

Besides the built-in facts, Ansible can collect custom facts from files on the remote hosts. These files live in `/etc/ansible/facts.d/` and can be INI, JSON, or executable scripts.

```bash
# First, create a custom fact file on the remote hosts
ansible webservers -m copy -a "content='[app]\nversion=2.5.1\nenv=production\n' dest=/etc/ansible/facts.d/app.fact" --become

# Now gather facts and filter for local facts
ansible webservers -m setup -a "filter=ansible_local"
```

Output includes your custom facts:

```json
{
    "ansible_facts": {
        "ansible_local": {
            "app": {
                "app": {
                    "version": "2.5.1",
                    "env": "production"
                }
            }
        }
    }
}
```

## Performance Tips

Fact gathering can be slow on large inventories. Here are ways to speed it up:

```bash
# Increase parallelism
ansible all -m setup -f 50

# Gather only minimum facts
ansible all -m setup -a "gather_subset=min" -f 50

# Use the JSON callback for faster output processing
ANSIBLE_STDOUT_CALLBACK=json ansible all -m setup -a "filter=ansible_hostname" -f 50
```

For very large inventories (1000+ hosts), consider using fact caching in your `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 3600
```

## Summary

Ansible fact gathering via ad hoc commands gives you instant visibility into your infrastructure. Use the `setup` module with filters to extract specific information, `gather_subset` to collect only the categories you need, and the `--tree` flag to save facts for offline analysis. Whether you are auditing OS versions, checking capacity, or building inventory reports, ad hoc fact gathering is one of the most practical tools in the Ansible toolkit.
