# How to Use Ansible Ad Hoc Commands to List Listening Ports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Networking, Port Scanning

Description: Use Ansible ad hoc commands to quickly list all listening ports across your servers for security audits and troubleshooting.

---

Knowing which ports are open and listening on your servers is fundamental to both security and troubleshooting. Maybe a developer says their app is not responding, and you need to verify the process is actually listening. Or your security team wants a quick audit of all open ports across the fleet. Instead of logging into each server individually, Ansible ad hoc commands let you pull this information from every machine in seconds.

## Basic Port Listing with Netstat

The classic tool for listing ports is `netstat`. Here is how to use it via an Ansible ad hoc command:

```bash
# List all listening TCP ports across all servers
ansible all -m shell -a "netstat -tlnp"
```

We use the `shell` module here instead of `command` because some systems alias netstat or because we might want to pipe the output later. The flags mean:

- `-t` - Show TCP connections
- `-l` - Show only listening sockets
- `-n` - Show numeric addresses (skip DNS resolution for speed)
- `-p` - Show the process using each port

## Using ss Instead of Netstat

On modern Linux distributions, `ss` has replaced `netstat` and is significantly faster, especially on servers with thousands of connections.

```bash
# List listening TCP ports using ss
ansible all -m shell -a "ss -tlnp"
```

The flags are identical to netstat. Here is what typical output looks like:

```
web01 | CHANGED | rc=0 >>
State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN  0       128     0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=1234,fd=3))
LISTEN  0       511     0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=5678,fd=6))
LISTEN  0       511     0.0.0.0:443         0.0.0.0:*          users:(("nginx",pid=5678,fd=7))
```

## Including UDP Ports

TCP is not the whole picture. Many services use UDP (DNS, SNMP, syslog, etc.).

```bash
# List both TCP and UDP listening ports
ansible all -m shell -a "ss -tulnp"

# List only UDP listening ports
ansible all -m shell -a "ss -ulnp"
```

## Filtering for Specific Ports

When you are troubleshooting a specific service, you do not need the full listing.

```bash
# Check if port 80 is listening on web servers
ansible webservers -m shell -a "ss -tlnp | grep ':80 '"

# Check if MySQL port 3306 is listening on database servers
ansible dbservers -m shell -a "ss -tlnp | grep ':3306 '"

# Check if Redis is listening
ansible cacheservers -m shell -a "ss -tlnp | grep ':6379 '"
```

Note the space after the port number in the grep pattern. This prevents false matches, for example, `:80 ` will not match `:8080`.

## Checking Specific Ports with the Wait_for Module

Ansible has a built-in module specifically designed to check if a port is open:

```bash
# Check if port 443 is open on web servers (fails if not listening)
ansible webservers -m wait_for -a "port=443 timeout=3"
```

This command will return SUCCESS if the port is listening and FAILED if it is not, making it perfect for automated checks:

```bash
# Check if PostgreSQL is accepting connections
ansible dbservers -m wait_for -a "port=5432 timeout=5 state=started"
```

## Getting Process Information

Knowing a port is open is only half the story. You usually want to know what process owns it.

```bash
# Get detailed process info for all listening ports (requires root)
ansible all -m shell -a "ss -tlnp" --become
```

Without `--become`, the process column might show up empty because non-root users cannot see process details for services they do not own.

For even more detail:

```bash
# Show listening ports with full process tree
ansible all -m shell -a "ss -tlnp | awk 'NR>1 {print \$4, \$6}'" --become
```

## Comparing Ports Against Expected Configuration

A practical security exercise is comparing actual listening ports against what you expect. Here is a quick way to do that:

```bash
# List only the port numbers, sorted, for easy comparison
ansible all -m shell -a "ss -tlnp | awk 'NR>1 {split(\$4,a,\":\"); print a[length(a)]}' | sort -n | uniq"
```

This extracts just the port numbers, sorts them numerically, and removes duplicates.

## Checking Ports on Specific Interfaces

Servers often have multiple network interfaces, and a service might only listen on one of them.

```bash
# Find services listening on all interfaces (0.0.0.0)
ansible all -m shell -a "ss -tlnp | grep '0.0.0.0:'"

# Find services listening only on localhost
ansible all -m shell -a "ss -tlnp | grep '127.0.0.1:'"

# Find services listening on a specific IP
ansible all -m shell -a "ss -tlnp | grep '10.0.1.5:'"
```

## Using Ansible Facts for Port Information

The `setup` module collects some network-related facts, though it does not directly list listening ports. You can combine facts with port checks:

```bash
# Get all network interface information
ansible all -m setup -a "filter=ansible_interfaces"

# Get IP addresses for all interfaces
ansible all -m setup -a "filter=ansible_all_ipv4_addresses"
```

## Scanning for Unexpected Ports

Security teams love this one. Find any servers listening on ports that are not in your approved list:

```bash
# Find servers with unexpected ports (anything not 22, 80, 443)
ansible webservers -m shell -a "ss -tlnp | awk 'NR>1 {split(\$4,a,\":\"); port=a[length(a)]; if (port!=22 && port!=80 && port!=443) print port, \$6}'" --become
```

## Running Against a Large Fleet

When checking ports across hundreds of servers, increase parallelism and reduce timeout:

```bash
# Fast scan with high parallelism and short timeout
ansible all -f 100 -T 5 -m shell -a "ss -tlnp" --become
```

## Generating a Port Audit Report

Here is a practical script that generates a CSV report of all listening ports across your infrastructure:

```bash
#!/bin/bash
# port_audit.sh - Generate a CSV of all listening ports
# Usage: ./port_audit.sh [group]

GROUP=${1:-all}
OUTPUT="port_audit_$(date +%Y%m%d_%H%M%S).csv"

echo "hostname,protocol,address,port,process" > "$OUTPUT"

ansible "$GROUP" -m shell -a "ss -tulnp | awk 'NR>1 {split(\$4,a,\":\"); print \$1\",\"a[1]\",\"a[length(a)]\",\"\$6}'" \
  --become -f 50 2>/dev/null | while read line; do
    if [[ "$line" == *"|"*"CHANGED"* ]]; then
        current_host=$(echo "$line" | cut -d'|' -f1 | tr -d ' ')
    elif [[ "$line" != "" && "$line" != *">>"* ]]; then
        echo "$current_host,$line" >> "$OUTPUT"
    fi
done

echo "Report saved to $OUTPUT"
```

## Working with IPv6 Ports

Do not forget about IPv6. Many services listen on IPv6 by default:

```bash
# Show IPv6 listening ports
ansible all -m shell -a "ss -tlnp | grep '\\[::'"

# Show all listening ports including IPv6
ansible all -m shell -a "ss -6 -tlnp"
```

## Quick Reference

```bash
# All TCP listening ports
ansible all -m shell -a "ss -tlnp" --become

# All TCP and UDP listening ports
ansible all -m shell -a "ss -tulnp" --become

# Check specific port
ansible all -m wait_for -a "port=80 timeout=3"

# Filter for a service
ansible all -m shell -a "ss -tlnp | grep nginx" --become

# Port numbers only, sorted
ansible all -m shell -a "ss -tlnp | awk 'NR>1 {split(\$4,a,\":\"); print a[length(a)]}' | sort -nu"
```

## Wrapping Up

Listing listening ports across your infrastructure is one of those tasks that comes up constantly, whether for troubleshooting, security audits, or verifying deployments. Ansible ad hoc commands turn what would be a tedious SSH-into-each-box exercise into a single command. Use `ss` on modern systems, `netstat` on older ones, and the `wait_for` module when you just need a pass/fail check on a specific port. Combine these with increased parallelism via `-f` and you can audit hundreds of servers in seconds.
