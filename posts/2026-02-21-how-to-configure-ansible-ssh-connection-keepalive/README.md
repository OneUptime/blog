# How to Configure Ansible SSH Connection Keepalive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Networking, DevOps

Description: Configure SSH keepalive settings in Ansible to prevent dropped connections during long-running playbook tasks

---

Long-running Ansible tasks have a habit of failing with cryptic SSH disconnection errors. You kick off a database migration or a large file transfer, walk away, and come back to find the playbook died halfway through because the SSH connection went stale. The fix is straightforward: configure SSH keepalive settings so that the connection stays alive during idle periods.

This post covers every method for setting up SSH keepalives in Ansible, from ansible.cfg to per-host inventory settings.

## Why SSH Connections Drop

SSH connections drop for several reasons during Ansible runs:

- Firewalls or NAT devices close idle connections after a timeout (often 5 to 15 minutes)
- Network instability causes brief interruptions that the SSH client interprets as a dead connection
- Load balancers between you and the target host have their own idle timeouts
- Long-running tasks produce no SSH traffic, making the connection appear idle

The SSH protocol includes a keepalive mechanism that sends periodic "are you still there?" packets to prevent these timeouts.

## Configuring Keepalive in ansible.cfg

The most common approach is setting SSH arguments in your ansible.cfg file.

```ini
# ansible.cfg
# Configure SSH keepalive to send a packet every 30 seconds
# and tolerate up to 5 missed responses before disconnecting
[ssh_connection]
ssh_args = -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -o TCPKeepAlive=yes
```

Here is what each option does:

- **ServerAliveInterval=30**: The SSH client sends a keepalive packet every 30 seconds when no data is being transmitted
- **ServerAliveCountMax=5**: If the server does not respond to 5 consecutive keepalive packets, the client disconnects (so the connection survives up to 150 seconds of unresponsiveness)
- **TCPKeepAlive=yes**: Enables TCP-level keepalive in addition to the SSH application-level keepalive

## Combining Keepalive with Other SSH Options

In production, you typically need keepalive settings alongside connection multiplexing and other optimizations. Here is a well-rounded configuration.

```ini
# ansible.cfg
# Full SSH configuration with keepalive, multiplexing, and pipelining
[defaults]
inventory = inventory/hosts.ini
remote_user = deploy
timeout = 30
forks = 20

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=600s -o ServerAliveInterval=30 -o ServerAliveCountMax=10 -o TCPKeepAlive=yes -o StrictHostKeyChecking=no
control_path_dir = ~/.ansible/cp
pipelining = true
retries = 3
```

The `ControlPersist=600s` keeps multiplexed connections open for 10 minutes. Combined with `ServerAliveInterval=30`, the connection sends keepalive packets while persisted, preventing firewall timeouts.

## Per-Host Keepalive Configuration

Sometimes specific hosts need different keepalive settings. Perhaps a host sits behind a particularly aggressive firewall. You can set SSH arguments per host in your inventory.

```ini
# inventory/hosts.ini
# Host behind a strict firewall needs more frequent keepalives
[webservers]
web1 ansible_host=10.0.1.10
web2 ansible_host=10.0.1.11

[database_servers]
db1 ansible_host=10.0.2.10 ansible_ssh_common_args='-o ServerAliveInterval=15 -o ServerAliveCountMax=20'

[webservers:vars]
ansible_ssh_common_args=-o ServerAliveInterval=30 -o ServerAliveCountMax=5
```

The `ansible_ssh_common_args` variable is applied to all SSH-based connections (ssh, scp, sftp), making it more comprehensive than `ansible_ssh_extra_args`.

## Using Environment Variables

For CI/CD pipelines or temporary overrides, you can set keepalive options through environment variables.

```bash
# Set SSH keepalive via environment variable
export ANSIBLE_SSH_ARGS="-o ServerAliveInterval=30 -o ServerAliveCountMax=5 -o TCPKeepAlive=yes"

# Now run your playbook normally
ansible-playbook playbooks/deploy.yml
```

This is particularly useful in CI pipelines where you do not want to modify ansible.cfg.

## Testing Your Keepalive Configuration

Before relying on your keepalive settings in production, verify they are actually being applied.

```bash
# Run with verbose output to see SSH arguments
ansible all -m ping -vvvv 2>&1 | grep "SSH"

# You should see your keepalive options in the SSH command line
# Something like:
# <host> SSH: EXEC ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=5 ...
```

You can also test with a deliberate long-running task.

```yaml
# playbooks/test-keepalive.yml
# Run a long sleep to verify the SSH connection stays open
---
- name: Test SSH keepalive
  hosts: all
  gather_facts: false

  tasks:
    - name: Sleep for 10 minutes to test connection stability
      ansible.builtin.command: sleep 600
      async: 700
      poll: 30

    - name: Confirm connection is still alive
      ansible.builtin.ping:
```

## Async Tasks and Keepalive

For extremely long-running tasks, you should combine keepalive settings with Ansible async. Async lets Ansible fire off a task and poll for its completion rather than holding the SSH connection open for the entire duration.

```yaml
# playbooks/long-running-task.yml
# Use async with polling to handle very long operations
---
- name: Long running operations
  hosts: database_servers

  tasks:
    - name: Run database migration
      ansible.builtin.shell: |
        /opt/scripts/migrate_database.sh
      async: 3600      # Allow up to 1 hour
      poll: 60          # Check every 60 seconds
      register: migration_result

    - name: Verify migration completed
      ansible.builtin.debug:
        msg: "Migration finished with rc={{ migration_result.rc }}"
```

Even with async, keepalive settings matter because Ansible still needs to poll the remote host over SSH.

## Keepalive for Different Network Scenarios

Different network environments call for different keepalive tuning.

```ini
# For connections over the public internet (higher latency, more firewalls)
# ansible.cfg
[ssh_connection]
ssh_args = -o ServerAliveInterval=15 -o ServerAliveCountMax=10 -o ConnectTimeout=30

# For connections within a private data center (low latency, fewer firewalls)
# ansible.cfg
[ssh_connection]
ssh_args = -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -o ConnectTimeout=10

# For connections over a VPN (variable latency, potential packet loss)
# ansible.cfg
[ssh_connection]
ssh_args = -o ServerAliveInterval=20 -o ServerAliveCountMax=15 -o ConnectTimeout=45
```

The general rule: the less reliable the network, the more frequent the keepalives and the higher the tolerance for missed responses.

## Server-Side Keepalive Settings

Keepalive is a two-way street. The SSH server can also send keepalive packets to the client. If you control the target hosts, you can configure their SSH server settings too.

```bash
# /etc/ssh/sshd_config on the target host
# Send keepalive to client every 60 seconds, disconnect after 3 misses
ClientAliveInterval 60
ClientAliveCountMax 3
```

Having keepalive configured on both sides provides the most reliable connections. Even if your Ansible controller does not send keepalives (due to misconfiguration), the server-side settings will keep the connection alive.

## Troubleshooting Dropped Connections

If connections still drop despite keepalive configuration, check these things.

```bash
# Check if a firewall is silently dropping idle connections
# Run this from the Ansible controller
ssh -o ServerAliveInterval=5 -o ServerAliveCountMax=100 -v deploy@target_host 'sleep 1800'

# Watch the verbose output for keepalive messages like:
# debug1: client_alive_check: ...
# debug1: Sending SSH2_MSG_KEEPALIVE...
```

Common culprits when keepalive does not help:

1. AWS Security Groups or cloud firewall rules that have hard connection timeouts
2. Corporate proxies that terminate long-lived connections regardless of activity
3. The `ansible.cfg` file is not being loaded (check with `ansible --version` to see the config file path)
4. SSH args from `ansible.cfg` are being overridden by inventory variables or command-line flags

## Recommended Default Configuration

For most environments, this configuration provides a solid baseline.

```ini
# ansible.cfg - recommended keepalive defaults
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=600s -o ServerAliveInterval=30 -o ServerAliveCountMax=10 -o TCPKeepAlive=yes
pipelining = true
retries = 3
timeout = 30
```

This sends a keepalive every 30 seconds, tolerates up to 5 minutes of unresponsiveness (30 * 10 = 300 seconds), keeps multiplexed connections open for 10 minutes, and retries failed SSH connections up to 3 times. That covers the vast majority of network conditions without generating excessive keepalive traffic.
