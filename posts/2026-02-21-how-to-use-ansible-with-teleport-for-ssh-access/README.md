# How to Use Ansible with Teleport for SSH Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Teleport, SSH, Security, DevOps

Description: Integrate Ansible with Gravitational Teleport for certificate-based SSH access with full session recording and audit logging

---

Teleport is an identity-aware access proxy that provides certificate-based SSH access, session recording, and RBAC for infrastructure. If your organization uses Teleport to manage SSH access, you can still use Ansible for configuration management. The trick is getting Ansible to route its SSH connections through Teleport instead of connecting directly.

This guide covers the setup from scratch, including Teleport configuration, Ansible inventory, and the wrapper scripts that make everything work together.

## How Teleport Changes SSH Access

In a standard Ansible setup, your controller connects directly to target hosts via SSH using keys or passwords. With Teleport in the picture, the flow changes:

1. You authenticate with Teleport (via `tsh login`)
2. Teleport issues short-lived SSH certificates
3. Ansible uses these certificates to connect to nodes registered in Teleport
4. All sessions are recorded and auditable

The short-lived certificates are the key security benefit. Instead of long-lived SSH keys sitting on disk, you get certificates that expire in hours.

## Prerequisites

Before integrating Ansible with Teleport, you need:

- A running Teleport cluster (proxy and auth server)
- Target nodes enrolled in Teleport
- The `tsh` CLI installed on your Ansible controller
- A Teleport user with permissions to access the target nodes

```bash
# Install tsh on the Ansible controller (Ubuntu/Debian)
curl https://goteleport.com/static/install.sh | bash -s 14.0.0

# Verify installation
tsh version

# Log in to your Teleport cluster
tsh login --proxy=teleport.example.com --user=ansible-svc
```

## Method 1: Using tsh as the SSH Command

The simplest approach is telling Ansible to use `tsh ssh` instead of the regular `ssh` command.

```ini
# ansible.cfg
# Route all SSH connections through Teleport's tsh command
[defaults]
inventory = inventory/teleport_hosts.ini

[ssh_connection]
ssh_executable = /usr/local/bin/tsh
scp_if_ssh = true
```

Your inventory uses the Teleport node names rather than IP addresses.

```ini
# inventory/teleport_hosts.ini
# Hosts are identified by their Teleport node names
[webservers]
web-prod-01 ansible_user=root
web-prod-02 ansible_user=root

[databases]
db-prod-01 ansible_user=ubuntu
```

This method works but has limitations. The `tsh ssh` command does not support all the same flags as OpenSSH, which can cause issues with some Ansible operations.

## Method 2: Using Teleport's OpenSSH Configuration

A more robust approach is to use Teleport's ability to generate an OpenSSH configuration. This lets Ansible use the regular SSH client while routing through Teleport's proxy.

```bash
# Generate OpenSSH config for Teleport nodes
tsh config > ~/.tsh/teleport_ssh_config

# The generated config looks something like:
# Host *.teleport.example.com
#     HostName %h
#     ProxyCommand /usr/local/bin/tsh proxy ssh %r@%h:%p
#     UserKnownHostsFile /path/to/known_hosts
#     CertificateFile /path/to/cert
#     IdentityFile /path/to/key
```

Then point Ansible at this SSH config.

```ini
# ansible.cfg
# Use the Teleport-generated SSH config
[ssh_connection]
ssh_args = -F ~/.tsh/teleport_ssh_config -o StrictHostKeyChecking=no
```

## Method 3: ProxyCommand Approach

For the most control, you can use Teleport's proxy command directly in your Ansible configuration.

```ini
# ansible.cfg
# Use Teleport's proxy command for SSH connections
[ssh_connection]
ssh_args = -o ProxyCommand="tsh proxy ssh %r@%h:%p" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
pipelining = true
```

With this approach, your inventory can reference nodes by their Teleport-registered hostnames.

```ini
# inventory/hosts.ini
[all:vars]
ansible_user=root

[webservers]
web-prod-01.teleport.example.com
web-prod-02.teleport.example.com
```

## Dynamic Inventory with Teleport

Teleport maintains a registry of all enrolled nodes. You can build a dynamic inventory script that queries Teleport for available hosts.

```python
#!/usr/bin/env python3
# inventory/teleport_inventory.py
# Dynamic inventory script that pulls hosts from Teleport
import json
import subprocess
import sys

def get_teleport_nodes():
    """Query Teleport for all registered nodes."""
    result = subprocess.run(
        ['tsh', 'ls', '--format=json'],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        sys.stderr.write(f"Error querying Teleport: {result.stderr}\n")
        return []
    return json.loads(result.stdout)

def build_inventory():
    """Build Ansible inventory from Teleport nodes."""
    nodes = get_teleport_nodes()
    inventory = {
        '_meta': {'hostvars': {}},
        'all': {'hosts': [], 'children': ['ungrouped']},
        'ungrouped': {'hosts': []}
    }

    for node in nodes:
        hostname = node.get('spec', {}).get('hostname', '')
        labels = node.get('metadata', {}).get('labels', {})

        # Add to all hosts
        inventory['all']['hosts'].append(hostname)

        # Group by environment label
        env = labels.get('env', 'ungrouped')
        if env not in inventory:
            inventory[env] = {'hosts': []}
            inventory['all']['children'].append(env)
        inventory[env]['hosts'].append(hostname)

        # Set host variables
        inventory['_meta']['hostvars'][hostname] = {
            'ansible_user': labels.get('ansible_user', 'root'),
            'teleport_labels': labels
        }

    return inventory

if __name__ == '__main__':
    if '--list' in sys.argv:
        print(json.dumps(build_inventory(), indent=2))
    elif '--host' in sys.argv:
        print(json.dumps({}))
```

Make it executable and test it.

```bash
# Make the inventory script executable
chmod +x inventory/teleport_inventory.py

# Test the dynamic inventory
./inventory/teleport_inventory.py --list

# Use it with Ansible
ansible-playbook -i inventory/teleport_inventory.py playbooks/deploy.yml
```

## Automating Teleport Login for CI/CD

In automated environments, you cannot interactively log in to Teleport. Use machine identity (bot) tokens instead.

```bash
# Create a Teleport bot for Ansible
tctl bots add ansible-bot --roles=ansible-access --token=bot-join-token

# On the Ansible controller, start the bot agent
tbot start \
  --destination-dir=/opt/teleport/ansible-certs \
  --token=bot-join-token \
  --auth-server=teleport.example.com:443 \
  --join-method=token
```

Then configure Ansible to use the bot-generated certificates.

```ini
# ansible.cfg for CI/CD with Teleport bot certs
[ssh_connection]
ssh_args = -o ProxyCommand="tsh proxy ssh --cert-file=/opt/teleport/ansible-certs/ssh_client -o IdentityFile=/opt/teleport/ansible-certs/identity %r@%h:%p"
```

## A Complete Playbook Example

Here is a full playbook that works with Teleport-managed nodes.

```yaml
# playbooks/deploy-app.yml
# Deploy application to Teleport-managed servers
---
- name: Deploy application
  hosts: webservers
  become: true
  gather_facts: true

  tasks:
    - name: Ensure app directory exists
      ansible.builtin.file:
        path: /opt/myapp
        state: directory
        owner: www-data
        mode: '0755'

    - name: Copy application files
      ansible.builtin.copy:
        src: files/app/
        dest: /opt/myapp/
        owner: www-data
        mode: '0644'

    - name: Install dependencies
      ansible.builtin.pip:
        requirements: /opt/myapp/requirements.txt
        virtualenv: /opt/myapp/venv

    - name: Restart application service
      ansible.builtin.systemd:
        name: myapp
        state: restarted
        enabled: true
```

## Troubleshooting Common Issues

When Ansible and Teleport do not play nicely together, check these things.

```bash
# Verify your Teleport session is active
tsh status

# If expired, log in again
tsh login --proxy=teleport.example.com

# Test direct SSH through Teleport
tsh ssh root@web-prod-01 "hostname"

# Run Ansible with verbose output to see connection details
ansible webservers -m ping -vvvv
```

Common problems include:

- Expired Teleport certificates (they are short-lived by design, so re-login frequently)
- Node names in inventory not matching Teleport-registered names
- The `tsh` binary not being in PATH when Ansible runs
- Teleport RBAC denying access to specific nodes for your user

## Security Advantages

Using Teleport with Ansible provides security benefits that plain SSH cannot match:

1. Short-lived certificates eliminate the risk of compromised long-lived SSH keys
2. Every Ansible session is recorded and can be replayed for auditing
3. RBAC policies control which users can run Ansible against which nodes
4. No need to distribute or manage SSH keys across your fleet
5. All access is logged in Teleport's audit log with user identity attached

The overhead of setting up Teleport integration is worth it for any organization that cares about compliance and audit trails for their infrastructure automation.
