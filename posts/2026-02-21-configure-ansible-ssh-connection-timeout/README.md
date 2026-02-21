# How to Configure Ansible SSH Connection Timeout

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Networking, DevOps, Configuration

Description: How to configure Ansible SSH connection timeout settings to handle slow networks, firewalls, and unreliable hosts without playbook failures.

---

Ansible communicates with managed hosts over SSH, and the connection timeout determines how long Ansible waits for a host to respond before giving up. The default timeout is 10 seconds, which works well for local networks but can be too aggressive for cloud instances, VPN connections, or hosts behind slow firewalls. This guide covers all the timeout-related settings and shows you how to configure them for different scenarios.

## The Default Timeout

Out of the box, Ansible waits 10 seconds for an SSH connection to be established. If the host does not respond within that window, Ansible marks it as UNREACHABLE and moves on. This is the `timeout` setting in the `[defaults]` section of ansible.cfg.

```ini
# ansible.cfg
[defaults]
# Connection timeout in seconds (default: 10)
timeout = 10
```

## When to Increase the Timeout

There are several common situations where 10 seconds is not enough:

- **Cloud instances**: VMs in AWS, Azure, or GCP sometimes take longer to accept SSH connections, especially right after provisioning.
- **VPN connections**: VPN tunnels add latency, and the handshake can take longer.
- **Firewalls and NAT**: Complex network paths with multiple hops add delay.
- **Overloaded hosts**: Servers under heavy CPU or memory pressure may be slow to respond to new SSH connections.
- **Geographic distance**: Managing hosts in a different continent adds round-trip latency.

## Setting the Connection Timeout

### In ansible.cfg

```ini
# ansible.cfg
[defaults]
# Increase timeout to 30 seconds for cloud environments
timeout = 30
```

### Via Command Line

Override the timeout for a specific playbook run:

```bash
# Run with a 60-second timeout
ansible-playbook deploy.yml -T 60

# The long form also works
ansible-playbook deploy.yml --timeout=60
```

### Via Environment Variable

```bash
# Set timeout via environment variable
export ANSIBLE_TIMEOUT=30
ansible-playbook deploy.yml
```

### Per Host in Inventory

Set different timeouts for different hosts based on their network characteristics:

```ini
# inventory.ini
[local_servers]
srv01 ansible_host=192.168.1.10
srv02 ansible_host=192.168.1.11

[cloud_servers]
cloud01 ansible_host=52.14.100.200 ansible_timeout=30
cloud02 ansible_host=52.14.100.201 ansible_timeout=30

[vpn_servers]
vpn01 ansible_host=10.200.0.50 ansible_timeout=45
```

## SSH-Specific Timeout Settings

Beyond Ansible's own timeout, you can configure SSH-level timeouts through `ssh_args`. These are passed directly to the SSH client and control different aspects of the connection.

```ini
# ansible.cfg
[ssh_connection]
# ConnectTimeout: how long SSH waits to establish the TCP connection
# ServerAliveInterval: send a keepalive packet every N seconds
# ServerAliveCountMax: disconnect after N missed keepalive responses
ssh_args = -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o ControlMaster=auto -o ControlPersist=300s
```

Here is what each SSH option does:

- **ConnectTimeout=30**: Wait up to 30 seconds for the initial TCP connection. This is separate from Ansible's `timeout` setting.
- **ServerAliveInterval=15**: After the connection is established, send a keepalive packet every 15 seconds. This prevents firewalls from dropping idle connections.
- **ServerAliveCountMax=3**: If 3 consecutive keepalive packets go unanswered, SSH drops the connection. Combined with ServerAliveInterval=15, this means a dead connection is detected within 45 seconds.

## The Difference Between Ansible Timeout and SSH ConnectTimeout

This is a source of confusion. Here is how they relate:

```mermaid
flowchart LR
    A[ansible-playbook] -->|Ansible timeout| B[SSH client starts]
    B -->|SSH ConnectTimeout| C[TCP connection established]
    C -->|SSH handshake| D[SSH session ready]
    D -->|ServerAliveInterval| E[Connection maintained]
```

- **Ansible timeout** (`timeout` in ansible.cfg): Controls how long Ansible itself waits for the entire SSH connection process.
- **SSH ConnectTimeout**: Controls how long the SSH client waits for the TCP connection phase specifically.
- **ServerAliveInterval**: Not a connection timeout at all; it keeps established connections alive.

In practice, set both `timeout` and `ConnectTimeout` to similar values. If Ansible's timeout is shorter than SSH's ConnectTimeout, Ansible will kill the SSH process before SSH has a chance to connect.

## Handling Slow Bootstrapping Hosts

When provisioning new servers (especially cloud instances), the SSH service might not be ready immediately. Use `wait_for_connection` at the start of your playbook to wait for the host to become reachable:

```yaml
# wait-for-hosts.yml
---
- name: Wait for newly provisioned hosts
  hosts: new_servers
  gather_facts: false

  tasks:
    - name: Wait for SSH to become available
      ansible.builtin.wait_for_connection:
        timeout: 300
        delay: 10
        sleep: 5

    - name: Now gather facts
      ansible.builtin.setup:

    - name: Continue with configuration
      ansible.builtin.debug:
        msg: "{{ ansible_hostname }} is ready"
```

The `wait_for_connection` module:
- `timeout: 300` - Wait up to 5 minutes total
- `delay: 10` - Wait 10 seconds before the first attempt
- `sleep: 5` - Wait 5 seconds between retries

This is much more robust than simply increasing the connection timeout, because it retries rather than failing on the first timeout.

## Connection Persistence with ControlPersist

SSH multiplexing keeps connections open after the first connection, making subsequent tasks much faster. This is configured through ssh_args:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=600s
```

`ControlPersist=600s` keeps the connection socket alive for 10 minutes after the last use. This means if you run multiple playbooks in sequence, only the first one pays the SSH connection cost.

## Timeout Configuration for Specific Use Cases

### Fast Local Network

```ini
# ansible.cfg for a local network with reliable hosts
[defaults]
timeout = 10

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
```

### Cloud/WAN Environment

```ini
# ansible.cfg for cloud hosts with variable latency
[defaults]
timeout = 30

[ssh_connection]
ssh_args = -o ConnectTimeout=30 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ControlMaster=auto -o ControlPersist=600s
pipelining = True
```

### Unreliable Network (VPN, satellite, etc.)

```ini
# ansible.cfg for unreliable network connections
[defaults]
timeout = 60

[ssh_connection]
ssh_args = -o ConnectTimeout=60 -o ServerAliveInterval=10 -o ServerAliveCountMax=6 -o ControlMaster=auto -o ControlPersist=900s
retries = 3
pipelining = True
```

The `retries = 3` setting tells Ansible to retry SSH connections up to 3 times before marking a host as unreachable.

## Debugging Timeout Issues

When you encounter timeout problems, increase Ansible's verbosity to see what is happening at the SSH level:

```bash
# Run with maximum verbosity to see SSH connection details
ansible-playbook -vvvv deploy.yml
```

Look for lines containing "SSH" or "connect" in the output. Common patterns:

- **"Connection timed out"**: The host is not reachable at the network level. Check firewalls and security groups.
- **"Connection refused"**: The host is reachable but SSH is not running on the expected port.
- **"No route to host"**: Network routing issue. Check VPN connections and routing tables.

You can also test SSH directly to isolate whether the problem is Ansible-specific or network-level:

```bash
# Test SSH connection with verbose output and a specific timeout
ssh -v -o ConnectTimeout=30 deploy@10.0.0.50
```

## Summary

The default 10-second timeout works for local networks but needs adjustment for cloud, VPN, or WAN scenarios. Set `timeout` in ansible.cfg for the general case, use `ssh_args` for fine-grained SSH-level control, and use `wait_for_connection` for newly provisioned hosts that might not be ready yet. Always pair timeout settings with SSH connection persistence (ControlMaster/ControlPersist) to minimize the impact of slow initial connections on overall playbook performance.
