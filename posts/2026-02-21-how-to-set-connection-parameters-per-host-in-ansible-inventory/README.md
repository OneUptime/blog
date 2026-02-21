# How to Set Connection Parameters Per Host in Ansible Inventory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, SSH, Connection, DevOps

Description: Configure per-host connection parameters in Ansible inventory including SSH ports, users, keys, Python interpreters, and connection types for heterogeneous infrastructure.

---

Real-world infrastructure is messy. Some servers use port 22, others use 2222. Some need the `ubuntu` user, others need `root` or `ec2-user`. Some are accessed over SSH, others through WinRM or Docker. Ansible handles this through per-host connection variables that override the defaults for specific machines.

## Core Connection Variables

Ansible uses a set of built-in variables that control how it connects to each host. Here are the most important ones:

```ini
# inventory.ini
# Per-host connection parameters
[webservers]
web1.example.com ansible_host=10.0.1.10 ansible_port=22 ansible_user=deploy
web2.example.com ansible_host=10.0.1.11 ansible_port=2222 ansible_user=webadmin
web3.example.com ansible_host=10.0.1.12 ansible_port=22 ansible_user=deploy

[databases]
db1.example.com ansible_host=10.0.2.10 ansible_user=dbadmin ansible_port=22
db2.example.com ansible_host=10.0.2.11 ansible_user=postgres ansible_port=5433
```

The most commonly used connection variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `ansible_host` | IP or hostname to connect to | Inventory hostname |
| `ansible_port` | SSH port | 22 |
| `ansible_user` | SSH username | Current user |
| `ansible_password` | SSH password | None (use keys) |
| `ansible_connection` | Connection type | ssh |
| `ansible_python_interpreter` | Python path on target | Auto-detected |

## Using host_vars for Connection Settings

For anything beyond a few variables, use `host_vars` files:

```yaml
# host_vars/web1.example.com.yml
# Connection and authentication settings
ansible_host: 10.0.1.10
ansible_port: 22
ansible_user: deploy
ansible_python_interpreter: /usr/bin/python3

# SSH key for this specific host
ansible_ssh_private_key_file: ~/.ssh/web_servers_key

# Privilege escalation
ansible_become: true
ansible_become_method: sudo
ansible_become_user: root
```

```yaml
# host_vars/db1.example.com.yml
# Database server needs different credentials
ansible_host: 10.0.2.10
ansible_port: 22
ansible_user: dbadmin
ansible_python_interpreter: /usr/bin/python3

# Different SSH key
ansible_ssh_private_key_file: ~/.ssh/db_servers_key

# Become settings
ansible_become: true
ansible_become_method: sudo
ansible_become_user: root
ansible_become_password: "{{ vault_db_become_password }}"
```

## SSH-Specific Parameters

Ansible exposes several SSH-specific variables for fine-grained control:

```yaml
# host_vars/legacy-server.example.com.yml
# Legacy server with non-standard SSH configuration
ansible_host: 192.168.1.100
ansible_port: 2222
ansible_user: admin

# SSH connection options
ansible_ssh_private_key_file: ~/.ssh/legacy_key
ansible_ssh_common_args: >-
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout=30

# Extra args for specific SSH operations
ansible_ssh_extra_args: "-o IdentitiesOnly=yes"

# Pipelining (faster, but needs requiretty disabled in sudoers)
ansible_ssh_pipelining: true

# SSH transfer method (smart, sftp, scp, piped)
ansible_ssh_transfer_method: sftp
```

## Connection Types

Ansible supports multiple connection types beyond SSH:

```yaml
# host_vars/localhost.yml
# Run tasks locally without SSH
ansible_connection: local

# host_vars/windows-server.example.com.yml
# Windows server using WinRM
ansible_connection: winrm
ansible_winrm_scheme: https
ansible_winrm_port: 5986
ansible_winrm_transport: ntlm
ansible_user: Administrator
ansible_password: "{{ vault_windows_password }}"
ansible_winrm_server_cert_validation: ignore

# host_vars/docker-container.yml
# Connect to a Docker container
ansible_connection: docker
ansible_docker_extra_args: ""
ansible_host: my_container_name
```

## Mixed Infrastructure Example

Here is an inventory for a heterogeneous environment with Linux, Windows, and container hosts:

```ini
# inventory.ini
[linux_web]
web-ubuntu.example.com
web-centos.example.com
web-amazon.example.com

[windows_servers]
win-app-01.example.com
win-app-02.example.com

[docker_hosts]
app-container-01

[network_devices]
switch-01.dc.local
router-01.dc.local
```

```yaml
# host_vars/web-ubuntu.example.com.yml
# Ubuntu web server
ansible_host: 10.0.1.10
ansible_user: ubuntu
ansible_python_interpreter: /usr/bin/python3
ansible_ssh_private_key_file: ~/.ssh/aws_key.pem
ansible_become: true
```

```yaml
# host_vars/web-centos.example.com.yml
# CentOS web server
ansible_host: 10.0.1.11
ansible_user: centos
ansible_python_interpreter: /usr/bin/python3
ansible_ssh_private_key_file: ~/.ssh/centos_key
ansible_become: true
ansible_become_method: sudo
```

```yaml
# host_vars/web-amazon.example.com.yml
# Amazon Linux server
ansible_host: 10.0.1.12
ansible_user: ec2-user
ansible_python_interpreter: /usr/bin/python3
ansible_ssh_private_key_file: ~/.ssh/aws_key.pem
ansible_become: true
```

```yaml
# host_vars/win-app-01.example.com.yml
# Windows application server
ansible_host: 10.0.3.10
ansible_connection: winrm
ansible_winrm_port: 5986
ansible_winrm_scheme: https
ansible_winrm_transport: credssp
ansible_user: ansible_svc
ansible_password: "{{ vault_win_password }}"
ansible_winrm_server_cert_validation: ignore
```

```yaml
# host_vars/switch-01.dc.local.yml
# Network switch
ansible_host: 10.0.0.1
ansible_connection: ansible.netcommon.network_cli
ansible_network_os: cisco.ios.ios
ansible_user: admin
ansible_password: "{{ vault_switch_password }}"
ansible_become: true
ansible_become_method: enable
ansible_become_password: "{{ vault_switch_enable_password }}"
```

## Using group_vars for Shared Connection Settings

When multiple hosts in a group share the same connection settings, put them in group_vars:

```yaml
# group_vars/linux_web.yml
# Shared connection settings for all Linux web servers
ansible_become: true
ansible_become_method: sudo
ansible_python_interpreter: /usr/bin/python3
ansible_ssh_pipelining: true
```

```yaml
# group_vars/windows_servers.yml
# Shared connection settings for all Windows servers
ansible_connection: winrm
ansible_winrm_port: 5986
ansible_winrm_scheme: https
ansible_winrm_transport: credssp
ansible_winrm_server_cert_validation: ignore
```

Individual hosts only need to override what is different:

```yaml
# host_vars/web-ubuntu.example.com.yml
# Only the Ubuntu-specific settings
ansible_host: 10.0.1.10
ansible_user: ubuntu
ansible_ssh_private_key_file: ~/.ssh/aws_key.pem
# ansible_become and ansible_python_interpreter come from group_vars
```

## Python Interpreter Configuration

Different Linux distributions install Python in different locations. Setting the right interpreter per host prevents errors:

```yaml
# group_vars/all.yml
# Default Python interpreter
ansible_python_interpreter: /usr/bin/python3

# Override per host if needed
# host_vars/legacy-centos6.example.com.yml
# ansible_python_interpreter: /usr/bin/python2.7
```

Alternatively, use the `auto` setting to let Ansible detect the interpreter:

```yaml
# group_vars/all.yml
ansible_python_interpreter: auto
```

## Timeout and Retry Settings

Configure connection timeouts for hosts on slow networks or behind VPNs:

```yaml
# host_vars/remote-office-server.example.com.yml
# Server behind a slow VPN
ansible_host: 172.16.1.10
ansible_user: admin
ansible_ssh_common_args: "-o ConnectTimeout=60"

# Or set in ansible.cfg for global defaults
# [defaults]
# timeout = 30
```

## Verifying Connection Parameters

Always verify that the connection parameters are correct:

```bash
# Check what connection settings a host will use
ansible-inventory -i inventory.ini --host web-ubuntu.example.com

# Test actual connectivity
ansible web-ubuntu.example.com -i inventory.ini -m ping

# Test with verbose output to see the SSH command
ansible web-ubuntu.example.com -i inventory.ini -m ping -vvvv

# Test a Windows host
ansible win-app-01.example.com -i inventory.ini -m win_ping
```

The `-vvvv` (four v's) output shows the actual SSH command Ansible constructs, including all the connection parameters. This is extremely helpful for diagnosing connection failures.

## Security Best Practices

1. **Never put passwords in plain text.** Use Ansible Vault for `ansible_password` and `ansible_become_password`:

```yaml
# host_vars/server.example.com/vault.yml (encrypted)
vault_ssh_password: "secret-password"
vault_become_password: "sudo-password"

# host_vars/server.example.com/connection.yml (plain text)
ansible_password: "{{ vault_ssh_password }}"
ansible_become_password: "{{ vault_become_password }}"
```

2. **Use SSH keys instead of passwords.** Keys are more secure and do not need to be stored in vault files.

3. **Use ssh-agent for key management** instead of specifying key files per host when possible.

4. **Restrict key permissions:** `chmod 600 ~/.ssh/private_key`

## Wrapping Up

Per-host connection parameters let Ansible work with any infrastructure, no matter how diverse. Use `host_vars` for host-specific settings, `group_vars` for shared connection defaults, and always verify with `ansible-inventory --host` and a `ping` test before running real playbooks. The key is to keep the common settings at the group level and only override at the host level when genuinely necessary.
