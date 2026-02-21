# How to Use Ansible Ad Hoc Commands to Check Uptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Uptime, Server Monitoring

Description: Learn how to use Ansible ad hoc commands to quickly check system uptime across your entire infrastructure without writing playbooks.

---

When you manage dozens or hundreds of servers, checking uptime across all of them becomes a routine but important task. Maybe you just finished a maintenance window and want to confirm which servers rebooted. Or perhaps you are investigating why a particular service was interrupted and need to correlate it with server restarts. Ansible ad hoc commands are perfect for these quick, one-off checks.

## What Are Ansible Ad Hoc Commands?

Ad hoc commands let you run a single Ansible task against your inventory without writing a full playbook. Think of them as the command-line equivalent of running a quick shell command, but across multiple machines simultaneously. The basic syntax is:

```bash
# Basic ad hoc command structure
ansible <host-pattern> -m <module> -a "<module-arguments>"
```

The `-m` flag specifies the module and `-a` passes arguments to that module.

## Checking Uptime with the Command Module

The simplest way to check uptime is using the `command` module, which is actually the default module in Ansible.

```bash
# Check uptime on all hosts in your inventory
ansible all -m command -a "uptime"
```

Since `command` is the default module, you can shorten this:

```bash
# Shorthand version - command module is implied
ansible all -a "uptime"
```

Typical output looks like this:

```
web01 | CHANGED | rc=0 >>
 14:23:45 up 45 days,  3:12,  2 users,  load average: 0.15, 0.10, 0.05

web02 | CHANGED | rc=0 >>
 14:23:45 up 12 days,  7:45,  1 user,  load average: 0.32, 0.28, 0.22

db01 | CHANGED | rc=0 >>
 14:23:46 up 90 days, 14:33,  3 users,  load average: 1.05, 0.98, 0.87
```

## Targeting Specific Host Groups

You rarely want to check every single server at once. Most of the time you are looking at a specific group.

```bash
# Check uptime only on web servers
ansible webservers -a "uptime"

# Check uptime on database servers
ansible dbservers -a "uptime"

# Check uptime on a single host
ansible web01 -a "uptime"
```

This assumes your inventory file has these groups defined:

```ini
# /etc/ansible/hosts or your custom inventory file
[webservers]
web01 ansible_host=192.168.1.10
web02 ansible_host=192.168.1.11

[dbservers]
db01 ansible_host=192.168.1.20
db02 ansible_host=192.168.1.21
```

## Using the Shell Module for More Detail

The `command` module does not support pipes or shell features. If you want to parse the uptime output or combine it with other commands, use the `shell` module instead.

```bash
# Get uptime in seconds using /proc/uptime (Linux only)
ansible all -m shell -a "cat /proc/uptime | awk '{print \$1}' "
```

This returns the raw uptime in seconds, which is easier to parse programmatically.

```bash
# Get uptime with hostname for easier identification
ansible all -m shell -a "echo $(hostname): $(uptime -p)"
```

The `-p` flag on uptime gives a human-readable format like "up 2 weeks, 3 days, 7 hours, 12 minutes."

## Using the Setup Module for Structured Data

For more structured uptime data, the `setup` module (which gathers Ansible facts) is excellent.

```bash
# Get the uptime in seconds as an Ansible fact
ansible all -m setup -a "filter=ansible_uptime_seconds"
```

This returns clean JSON output:

```json
web01 | SUCCESS => {
    "ansible_facts": {
        "ansible_uptime_seconds": 3888720
    },
    "changed": false
}
```

You can also filter for multiple related facts:

```bash
# Get date/time facts that include uptime info
ansible all -m setup -a "filter=ansible_date_time"
```

## Checking Uptime with a Custom Inventory

If you do not use the default inventory file, specify yours with `-i`:

```bash
# Use a custom inventory file
ansible all -i /path/to/my/inventory -a "uptime"

# Use a dynamic inventory script
ansible all -i /path/to/dynamic_inventory.py -a "uptime"
```

## Finding Servers That Rebooted Recently

Here is a practical scenario: after a maintenance window, you want to find servers that have been up for less than an hour.

```bash
# Find servers with uptime less than 3600 seconds (1 hour)
ansible all -m shell -a "awk '{if (\$1 < 3600) print \"RECENTLY REBOOTED: \" \$1 \" seconds\"; else print \"OK: \" \$1 \" seconds\"}' /proc/uptime"
```

For a cleaner approach, you can filter results:

```bash
# Only show servers up for less than 1 day (86400 seconds)
ansible all -m shell -a "uptime_secs=$(awk '{print int(\$1)}' /proc/uptime); if [ \$uptime_secs -lt 86400 ]; then echo \"UP \${uptime_secs}s - RECENTLY REBOOTED\"; fi"
```

## Parallelism with Forks

When checking uptime across hundreds of servers, you want results fast. The `-f` flag controls how many hosts Ansible contacts simultaneously.

```bash
# Check uptime on all hosts with 50 parallel connections
ansible all -f 50 -a "uptime"
```

The default is 5 forks, which is conservative. For a read-only operation like checking uptime, bumping this up is perfectly safe.

## Handling Unreachable Hosts

Sometimes hosts are down or unreachable. Ansible will report these separately:

```
web03 | UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: ssh: connect to host 192.168.1.12 port 22: Connection timed out",
    "unreachable": true
}
```

You can reduce the timeout to speed things up when you expect some hosts to be offline:

```bash
# Set a 5-second SSH timeout instead of the default 10
ansible all -a "uptime" -T 5
```

## Saving Output to a File

For auditing purposes, you might want to save uptime data to a file:

```bash
# Save uptime output with timestamps
ansible all -a "uptime" | tee uptime_report_$(date +%Y%m%d).txt
```

## Using Become for Privileged Access

On some locked-down systems, even the `uptime` command might require specific permissions, or you might want to check additional details:

```bash
# Run with sudo privileges
ansible all -a "uptime" --become --become-user=root
```

## Practical Script for Regular Checks

Here is a simple wrapper script you could add to your toolkit:

```bash
#!/bin/bash
# check_uptime.sh - Quick uptime check across infrastructure
# Usage: ./check_uptime.sh [group] [inventory]

GROUP=${1:-all}
INVENTORY=${2:-/etc/ansible/hosts}

echo "=== Uptime Report: $(date) ==="
echo "Target: $GROUP"
echo "================================"

ansible "$GROUP" -i "$INVENTORY" -m setup -a "filter=ansible_uptime_seconds" \
  -f 50 --one-line 2>/dev/null | sort -t'>' -k2 -n

echo "================================"
echo "Report complete."
```

## Quick Reference

Here is a summary of the most useful commands:

```bash
# Basic uptime check
ansible all -a "uptime"

# Uptime in seconds (structured)
ansible all -m setup -a "filter=ansible_uptime_seconds"

# Uptime with custom inventory
ansible all -i hosts.ini -a "uptime"

# Fast parallel check
ansible all -f 50 -a "uptime"

# Pretty uptime format
ansible all -a "uptime -p"
```

## Wrapping Up

Ad hoc commands are one of Ansible's most underappreciated features. For quick operational checks like uptime verification, they save you from writing throwaway playbooks or SSH-ing into machines one at a time. The `command` module handles simple cases, the `shell` module covers anything needing pipes or shell features, and the `setup` module gives you structured data you can pipe into other tools. Start with the basics and build up from there as your needs grow.
