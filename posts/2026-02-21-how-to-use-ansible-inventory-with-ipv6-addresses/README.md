# How to Use Ansible Inventory with IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Networking, Inventory, SSH

Description: Learn how to configure Ansible inventory with IPv6 addresses, including proper syntax, connection settings, and common pitfalls.

---

IPv6 adoption is growing steadily, and more infrastructure now runs on dual-stack or IPv6-only networking. If your servers have IPv6 addresses, you need to know the correct syntax for Ansible inventory files, because the colons in IPv6 addresses conflict with the port separator syntax that Ansible uses. This post covers the exact syntax needed and the edge cases you will run into.

## The IPv6 Address Problem

IPv6 addresses use colons as delimiters (like `2001:db8::1`). This creates ambiguity in Ansible's INI inventory format, which also uses colons for ports (like `host:2222`). If you put a raw IPv6 address in your inventory, Ansible cannot tell where the address ends and a port number might begin.

## INI Format: Square Brackets Required

In the INI inventory format, IPv6 addresses must be wrapped in square brackets:

```ini
# inventory/hosts.ini
# IPv6 addresses in INI format need square brackets
[webservers]
web01 ansible_host=[2001:db8:1::10]
web02 ansible_host=[2001:db8:1::11]
web03 ansible_host=[2001:db8:1::12]

[databases]
db01 ansible_host=[2001:db8:2::30]
db02 ansible_host=[2001:db8:2::31]
```

If you want to use the IPv6 address as the inventory hostname itself (without an alias), you still need brackets:

```ini
[webservers]
[2001:db8:1::10]
[2001:db8:1::11]
[2001:db8:1::12]
```

## IPv6 with Non-Standard Ports

When combining IPv6 addresses with non-standard SSH ports, use the `ansible_port` variable separately. Do not try to combine them in the hostname:

```ini
# inventory/hosts.ini
# Correct: use ansible_port for the SSH port
[webservers]
web01 ansible_host=[2001:db8:1::10] ansible_port=2222
web02 ansible_host=[2001:db8:1::11] ansible_port=2222

# Wrong: do NOT try this URL-style syntax
# web01 ansible_host=[2001:db8:1::10]:2222
```

## YAML Format: Cleaner Syntax

The YAML inventory format handles IPv6 more naturally since it uses structured key-value pairs instead of positional syntax:

```yaml
# inventory/hosts.yml
all:
  children:
    webservers:
      hosts:
        web01:
          ansible_host: "2001:db8:1::10"
          ansible_port: 22
          ansible_user: deploy
        web02:
          ansible_host: "2001:db8:1::11"
          ansible_port: 22
          ansible_user: deploy
        web03:
          ansible_host: "2001:db8:1::12"
          ansible_port: 2222
          ansible_user: deploy
    databases:
      hosts:
        db01:
          ansible_host: "2001:db8:2::30"
          ansible_user: dbadmin
        db02:
          ansible_host: "2001:db8:2::31"
          ansible_user: dbadmin
```

In YAML, you can use the IPv6 address without square brackets since the format itself provides structure. Just make sure to quote the address if your YAML parser might misinterpret the colons.

## Dual-Stack Inventory (IPv4 and IPv6)

Many environments run dual-stack, where hosts are reachable on both IPv4 and IPv6. You can store both addresses and choose which one Ansible uses:

```yaml
# inventory/dual-stack.yml
all:
  children:
    webservers:
      hosts:
        web01:
          # Primary connection uses IPv6
          ansible_host: "2001:db8:1::10"
          # Store IPv4 as a custom variable for reference
          ipv4_address: "10.0.1.10"
          ansible_user: deploy
        web02:
          ansible_host: "2001:db8:1::11"
          ipv4_address: "10.0.1.11"
          ansible_user: deploy
```

To switch the entire inventory to IPv4, override `ansible_host` at the group level:

```yaml
# Force IPv4 for all webservers (useful for troubleshooting)
all:
  children:
    webservers:
      vars:
        # Uncomment to force IPv4 connections
        # ansible_host: "{{ ipv4_address }}"
      hosts:
        web01:
          ansible_host: "2001:db8:1::10"
          ipv4_address: "10.0.1.10"
```

## IPv6 Link-Local Addresses

Link-local IPv6 addresses (starting with `fe80::`) require a scope ID (the network interface name). This adds another layer of complexity:

```yaml
# inventory/link-local.yml
all:
  children:
    local_network:
      hosts:
        device01:
          # Link-local address with scope ID (interface name)
          ansible_host: "fe80::1%eth0"
          ansible_user: admin
        device02:
          ansible_host: "fe80::2%eth0"
          ansible_user: admin
```

In INI format with link-local:

```ini
[local_network]
device01 ansible_host=[fe80::1%25eth0] ansible_user=admin
device02 ansible_host=[fe80::2%25eth0] ansible_user=admin
```

Note the `%25` encoding for the percent sign in INI format. Some versions of Ansible handle this differently, so test thoroughly with link-local addresses.

## SSH Configuration for IPv6

Make sure your SSH configuration supports IPv6. Add these settings to `~/.ssh/config` or configure them through Ansible:

```
# ~/.ssh/config
# Enable IPv6 for SSH connections
Host *
    AddressFamily inet6
```

Or if you want to prefer IPv6 but fall back to IPv4:

```
Host *
    AddressFamily any
```

In your Ansible configuration:

```ini
# ansible.cfg
[ssh_connection]
# Pass AddressFamily to SSH for IPv6 support
ssh_args = -o AddressFamily=inet6
```

## IPv6 Ranges in Inventory

For a range of IPv6 addresses, you cannot use the same range syntax as IPv4. Instead, list them explicitly or use a dynamic approach:

```yaml
# inventory/ipv6-hosts.yml
all:
  children:
    ipv6_servers:
      hosts:
        server-01:
          ansible_host: "2001:db8:1::1"
        server-02:
          ansible_host: "2001:db8:1::2"
        server-03:
          ansible_host: "2001:db8:1::3"
        server-04:
          ansible_host: "2001:db8:1::4"
        server-05:
          ansible_host: "2001:db8:1::5"
```

For large IPv6 inventories, generate them with a script:

```python
#!/usr/bin/env python3
# generate_ipv6_inventory.py
# Generate YAML inventory for a range of IPv6 hosts

import yaml

prefix = "2001:db8:1::"
hosts = {}

for i in range(1, 51):
    hostname = f"server-{i:03d}"
    hosts[hostname] = {
        'ansible_host': f"{prefix}{i:x}",
        'ansible_user': 'deploy',
    }

inventory = {
    'all': {
        'children': {
            'ipv6_servers': {
                'hosts': hosts
            }
        }
    }
}

print(yaml.dump(inventory, default_flow_style=False))
```

## IPv6 with Proxy Jump Hosts

When using IPv6 with bastion hosts, the SSH ProxyJump syntax needs careful formatting:

```yaml
# inventory/ipv6-proxy.yml
all:
  children:
    bastion:
      hosts:
        jump01:
          ansible_host: "2001:db8:0::1"
          ansible_user: admin
    internal:
      hosts:
        internal01:
          ansible_host: "2001:db8:1::10"
          ansible_user: deploy
          # IPv6 bastion address in ProxyJump
          ansible_ssh_common_args: '-o ProxyJump=admin@[2001:db8:0::1]'
        internal02:
          ansible_host: "2001:db8:1::11"
          ansible_user: deploy
          ansible_ssh_common_args: '-o ProxyJump=admin@[2001:db8:0::1]'
```

Note the square brackets around the IPv6 address in the ProxyJump directive. Without them, SSH cannot parse the address correctly.

## Testing IPv6 Connectivity

Verify that Ansible can reach your IPv6 hosts:

```bash
# Test basic connectivity
ansible -i inventory/hosts.yml webservers -m ping -vvvv

# The verbose output shows the actual SSH command, including the IPv6 address
# Look for lines like: SSH: EXEC ssh -o AddressFamily=inet6 deploy@2001:db8:1::10
```

If ping fails, check these common issues:

```bash
# Verify the host is reachable at the network level
ping6 2001:db8:1::10

# Check that SSH is listening on IPv6
ssh -6 deploy@2001:db8:1::10

# Verify the address format in your inventory
ansible-inventory -i inventory/hosts.yml --host web01
```

## group_vars for IPv6-Specific Settings

Create group variables that apply to all IPv6 hosts:

```yaml
# inventory/group_vars/ipv6_servers.yml
# Connection settings for IPv6 hosts
ansible_ssh_common_args: "-o AddressFamily=inet6"

# Firewall rules should use ip6tables
firewall_cmd: ip6tables

# NTP servers accessible over IPv6
ntp_servers:
  - "2001:db8:ntp::1"
  - "2001:db8:ntp::2"
```

## Common Mistakes

The most common mistake is forgetting the square brackets in INI format. This causes Ansible to misparse the address:

```ini
# Wrong
web01 ansible_host=2001:db8:1::10

# Correct
web01 ansible_host=[2001:db8:1::10]
```

Another common issue is using the colon-port syntax with IPv6. Always use `ansible_port` as a separate variable when working with IPv6 addresses.

Finally, make sure your control node has IPv6 connectivity to the target hosts. Ansible does not automatically fall back to IPv4 if IPv6 fails; it simply reports a connection error.

Working with IPv6 in Ansible inventory requires a bit more attention to syntax than IPv4, especially in the INI format. The YAML format is more forgiving and generally easier to read with IPv6 addresses. Whichever format you use, always verify your inventory with `ansible-inventory --host` before running playbooks.
