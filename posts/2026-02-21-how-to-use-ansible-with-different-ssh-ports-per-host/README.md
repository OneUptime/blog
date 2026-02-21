# How to Use Ansible with Different SSH Ports per Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Port Configuration, Inventory

Description: Configure Ansible to connect to hosts running SSH on different ports using inventory variables, SSH config files, and group settings.

---

Not every server runs SSH on port 22. Security teams often change the default SSH port to reduce automated scanning noise. Cloud providers sometimes use non-standard ports. Legacy systems might have their own conventions. When your infrastructure has mixed SSH ports, Ansible needs to know which port to use for each host. There are several ways to handle this, from simple inventory variables to SSH config files.

## Setting the Port in Inventory

The most direct approach is setting `ansible_port` per host:

```ini
# inventory/hosts
[webservers]
web01 ansible_host=10.0.1.10 ansible_port=22
web02 ansible_host=10.0.1.11 ansible_port=2222
web03 ansible_host=10.0.1.12 ansible_port=22

[dbservers]
db01 ansible_host=10.0.2.10 ansible_port=5522
db02 ansible_host=10.0.2.11 ansible_port=5522

[jumpboxes]
jump01 ansible_host=203.0.113.50 ansible_port=443
```

In this inventory, web servers use mixed ports, database servers all use port 5522, and the jump box uses port 443 (useful for getting through corporate firewalls that only allow HTTPS traffic).

## Setting the Port Per Group

If all hosts in a group use the same port:

```ini
# inventory/hosts
[dbservers]
db01 ansible_host=10.0.2.10
db02 ansible_host=10.0.2.11
db03 ansible_host=10.0.2.12

[dbservers:vars]
ansible_port=5522
```

This is cleaner than repeating the port on every host line.

## Using Group Variables Files

For larger inventories, use group_vars:

```yaml
# group_vars/dbservers.yml
ansible_port: 5522
ansible_user: dbadmin
ansible_ssh_private_key_file: ~/.ssh/db_key
```

```yaml
# group_vars/webservers.yml
ansible_port: 22
ansible_user: deploy
ansible_ssh_private_key_file: ~/.ssh/web_key
```

```yaml
# group_vars/cloud_instances.yml
ansible_port: 2222
ansible_user: ubuntu
```

## Using Host Variables Files

For per-host configuration that is too complex for the inventory file:

```yaml
# host_vars/web02.yml
ansible_port: 2222
ansible_user: admin
custom_note: "This server uses non-standard SSH port"
```

```yaml
# host_vars/jump01.yml
ansible_port: 443
ansible_user: jumpuser
ansible_ssh_private_key_file: ~/.ssh/jump_key
```

## YAML Inventory Format

If you prefer YAML inventories, ports are set as host variables:

```yaml
# inventory/hosts.yml
all:
  children:
    webservers:
      hosts:
        web01:
          ansible_host: 10.0.1.10
          ansible_port: 22
        web02:
          ansible_host: 10.0.1.11
          ansible_port: 2222
        web03:
          ansible_host: 10.0.1.12
          ansible_port: 22
      vars:
        ansible_user: deploy

    dbservers:
      hosts:
        db01:
          ansible_host: 10.0.2.10
        db02:
          ansible_host: 10.0.2.11
      vars:
        ansible_port: 5522
        ansible_user: dbadmin

    legacy:
      hosts:
        old-server:
          ansible_host: 10.0.5.100
          ansible_port: 8022
          ansible_user: root
```

## Using the SSH Config File

For complex environments, an SSH config file keeps your Ansible inventory clean:

```bash
# ~/.ssh/config

# Web servers
Host web01
    HostName 10.0.1.10
    Port 22
    User deploy

Host web02
    HostName 10.0.1.11
    Port 2222
    User deploy

Host web03
    HostName 10.0.1.12
    Port 22
    User deploy

# Database servers
Host db*
    Port 5522
    User dbadmin

Host db01
    HostName 10.0.2.10

Host db02
    HostName 10.0.2.11

# Jump box
Host jump01
    HostName 203.0.113.50
    Port 443
    User jumpuser
```

Tell Ansible to use this SSH config:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -F ~/.ssh/config
```

Now your inventory can be simple, since SSH handles the port mapping:

```ini
# inventory/hosts - Clean, no port info needed
[webservers]
web01
web02
web03

[dbservers]
db01
db02

[jumpboxes]
jump01
```

## Command Line Port Override

For one-off operations on a non-standard port:

```bash
# Override port for all hosts
ansible all -m ping -e "ansible_port=2222"

# Override port for a specific host
ansible web02 -m ping -e "ansible_port=2222"
```

## Hostname:Port Notation

Ansible also supports the `hostname:port` notation directly in the inventory:

```ini
# inventory/hosts - Using colon notation
[webservers]
web01:22
web02:2222
web03:22

[dbservers]
db01:5522
db02:5522
```

However, this notation does not work when the host is an IPv6 address. For IPv6, always use `ansible_port`:

```ini
# IPv6 hosts - Must use ansible_port
[ipv6_servers]
v6server ansible_host=2001:db8::1 ansible_port=2222
```

## Dynamic Inventory with Mixed Ports

When using dynamic inventory scripts, include the port in the host variables:

```json
{
    "webservers": {
        "hosts": ["web01", "web02", "web03"]
    },
    "_meta": {
        "hostvars": {
            "web01": {
                "ansible_host": "10.0.1.10",
                "ansible_port": 22
            },
            "web02": {
                "ansible_host": "10.0.1.11",
                "ansible_port": 2222
            },
            "web03": {
                "ansible_host": "10.0.1.12",
                "ansible_port": 22
            }
        }
    }
}
```

## Practical Example: Multi-Environment Inventory

A realistic setup with different ports across environments:

```
inventory/
  production/
    hosts
    group_vars/
      all.yml
      webservers.yml
      dbservers.yml
  staging/
    hosts
    group_vars/
      all.yml
```

```yaml
# inventory/production/group_vars/all.yml
ansible_port: 2222  # Production uses non-standard port everywhere
ansible_user: automation
```

```yaml
# inventory/staging/group_vars/all.yml
ansible_port: 22  # Staging uses standard port
ansible_user: vagrant
```

```ini
# inventory/production/hosts
[webservers]
prod-web01 ansible_host=10.0.1.10
prod-web02 ansible_host=10.0.1.11

[dbservers]
prod-db01 ansible_host=10.0.2.10 ansible_port=5522
```

```bash
# Run against production
ansible-playbook -i inventory/production site.yml

# Run against staging
ansible-playbook -i inventory/staging site.yml
```

## Verifying Port Configuration

Check which port Ansible will use for each host:

```bash
# Show the port for a specific host
ansible web02 -m debug -a "var=ansible_port"

# Show port for all hosts
ansible all -m debug -a "var=ansible_port"

# Show the full connection details with -vvvv
ansible web02 -m ping -vvvv 2>&1 | grep "EXEC ssh"
```

In the `-vvvv` output, look for the `-p` flag or `Port` option:

```
<web02> SSH: EXEC ssh ... -o Port=2222 ... 10.0.1.11
```

## Setting a Default Port

If most of your hosts use a non-standard port, set it as the global default:

```ini
# ansible.cfg
[defaults]
remote_port = 2222
```

Then override for hosts that use the standard port:

```ini
# inventory/hosts
[standard_port_hosts]
special01 ansible_host=10.0.1.50 ansible_port=22
```

## Handling Port Changes

When changing SSH ports on live servers, be careful about the order of operations:

```yaml
# change_ssh_port.yml
---
- name: Change SSH port on servers
  hosts: all
  become: yes
  vars:
    new_ssh_port: 2222

  tasks:
    # Add the new port to sshd_config
    - name: Add new SSH port
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Port '
        line: "Port {{ new_ssh_port }}"
        validate: 'sshd -t -f %s'

    # Open the new port in the firewall BEFORE changing
    - name: Open new SSH port in firewall
      ufw:
        rule: allow
        port: "{{ new_ssh_port }}"
        proto: tcp

    # Restart sshd (this will NOT break the current connection)
    - name: Restart sshd
      service:
        name: sshd
        state: restarted

    # Verify the new port works
    - name: Test new port
      wait_for:
        port: "{{ new_ssh_port }}"
        host: "{{ ansible_host }}"
        timeout: 10
      delegate_to: localhost
      become: no

    # Close the old port (optional)
    - name: Close old SSH port in firewall
      ufw:
        rule: deny
        port: "22"
        proto: tcp
      when: new_ssh_port != 22
```

After running this playbook, update your inventory to use the new port.

## Wrapping Up

Managing different SSH ports across your infrastructure is a common requirement, and Ansible handles it well through multiple mechanisms. For simple cases, `ansible_port` in the inventory is enough. For complex environments with many hosts, use group_vars files or an SSH config file to keep things organized. The SSH config approach has the added benefit of working for manual SSH connections too, not just Ansible. Whichever method you choose, verify the port configuration with `-vvvv` to confirm Ansible is connecting to the right port on each host.
