# How to Use Ansible Ad Hoc Commands with Different Connection Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Connection Plugins, SSH, WinRM

Description: Learn how to use Ansible ad hoc commands with different connection types including SSH, local, Docker, WinRM, and network device connections.

---

Ansible is not limited to managing Linux servers over SSH. It can connect to Windows machines via WinRM, manage Docker containers directly, execute commands on the local machine, interact with network devices, and more. Each connection type has its own module and configuration. Understanding these connection types lets you manage your entire heterogeneous infrastructure with the same tool.

## The Default: SSH Connection

By default, Ansible uses SSH (specifically the `ssh` connection plugin) to reach remote hosts:

```bash
# Default SSH connection
ansible webservers -m ping

# Explicitly specify SSH connection
ansible webservers -m ping -c ssh

# Specify SSH-specific options
ansible webservers -m ping --private-key=~/.ssh/deploy_key -u deploy

# Use a non-standard SSH port
ansible webservers -m ping -e "ansible_port=2222"
```

SSH connection options in ansible.cfg:

```ini
# ansible.cfg
[ssh_connection]
# Use SSH pipelining for performance
pipelining = True

# Persistent connection settings
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=no

# SCP or SFTP for file transfer
transfer_method = sftp
```

## Local Connection

The `local` connection runs commands on the Ansible controller itself, bypassing SSH entirely. This is useful for running modules against localhost or using Ansible to manage the machine it runs on.

```bash
# Run a command locally
ansible localhost -m command -a "hostname" -c local

# Gather facts from localhost
ansible localhost -m setup -c local

# Manage local packages
ansible localhost -m apt -a "name=jq state=present" -c local --become

# Create a local directory
ansible localhost -m file -a "path=/opt/local_app state=directory" -c local --become
```

You can also set the connection type in inventory:

```ini
# inventory file
[local]
localhost ansible_connection=local
```

```bash
# Now commands for localhost automatically use local connection
ansible localhost -m ping
# No SSH needed
```

## Docker Connection

The `docker` connection plugin lets you manage Docker containers directly, without SSH:

```bash
# Ping a running Docker container
ansible my_container -m ping -c docker

# Run a command inside a container
ansible my_container -m command -a "cat /etc/os-release" -c docker

# Install a package in a container
ansible my_container -m apt -a "name=curl state=present" -c docker --become

# Copy a file into a container
ansible my_container -m copy -a "src=./config.yml dest=/app/config.yml" -c docker
```

Inventory setup for Docker containers:

```ini
# inventory/docker.ini
[containers]
webapp ansible_connection=docker
database ansible_connection=docker
redis_cache ansible_connection=docker ansible_docker_extra_args="--user root"
```

```bash
# Now manage containers using group targeting
ansible containers -m command -a "cat /etc/hostname" -i inventory/docker.ini
```

You can also dynamically discover running containers:

```bash
# List running containers
docker ps --format '{{.Names}}'

# Then target them
ansible webapp -m shell -a "ls /app/" -c docker
```

## WinRM Connection (Windows)

For Windows hosts, Ansible uses WinRM (Windows Remote Management):

```bash
# Ping a Windows host
ansible winservers -m win_ping

# Run a PowerShell command
ansible winservers -m win_shell -a "Get-Process | Select-Object -First 10"

# Run a cmd.exe command
ansible winservers -m win_command -a "hostname"

# Check Windows services
ansible winservers -m win_service -a "name=wuauserv"

# Copy a file to Windows
ansible winservers -m win_copy -a "src=./config.ini dest=C:\\app\\config.ini"
```

Windows inventory configuration:

```ini
# inventory/windows.ini
[winservers]
win1.example.com
win2.example.com

[winservers:vars]
ansible_connection=winrm
ansible_user=Administrator
ansible_password=SecureP@ss123
ansible_winrm_transport=ntlm
ansible_winrm_server_cert_validation=ignore
ansible_port=5986
```

```bash
# Test Windows connectivity
ansible winservers -m win_ping -i inventory/windows.ini

# Gather Windows facts
ansible winservers -m setup -i inventory/windows.ini

# Install software on Windows
ansible winservers -m win_chocolatey -a "name=git state=present" -i inventory/windows.ini
```

## Network Device Connections

For network devices (routers, switches, firewalls), Ansible provides specialized connection plugins:

```bash
# network_cli: for CLI-based network devices
ansible routers -m ios_command -a "commands='show version'" -c network_cli

# netconf: for NETCONF-enabled devices
ansible switches -m netconf_get -c netconf

# httpapi: for REST API-based network devices
ansible firewalls -m httpapi -c httpapi
```

Network device inventory example:

```ini
# inventory/network.ini
[routers]
router1.example.com

[routers:vars]
ansible_connection=network_cli
ansible_network_os=ios
ansible_user=admin
ansible_password=cisco123
ansible_become=yes
ansible_become_method=enable
ansible_become_password=enable_secret

[switches]
switch1.example.com

[switches:vars]
ansible_connection=network_cli
ansible_network_os=nxos
ansible_user=admin
ansible_password=nxos123
```

```bash
# Run commands on Cisco IOS devices
ansible routers -m ios_command -a "commands='show ip interface brief'" -i inventory/network.ini

# Show running config
ansible routers -m ios_command -a "commands='show running-config'" -i inventory/network.ini

# Configure a network device
ansible routers -m ios_config -a "lines='hostname ROUTER-01'" -i inventory/network.ini
```

## SSH with Jump Hosts (Bastion)

Many production environments use jump hosts (bastion hosts) for SSH access:

```bash
# Connect through a bastion host
ansible private_servers -m ping -e "ansible_ssh_common_args='-o ProxyJump=bastion.example.com'"

# Or configure in ansible.cfg
```

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ProxyJump=bastion.example.com
```

Inventory-based approach:

```ini
# inventory/production.ini
[private_servers]
internal1.private ansible_ssh_common_args="-o ProxyJump=deploy@bastion.example.com"
internal2.private ansible_ssh_common_args="-o ProxyJump=deploy@bastion.example.com"
```

```bash
# Now commands automatically go through the bastion
ansible private_servers -m ping -i inventory/production.ini
```

## Paramiko Connection

The `paramiko` connection plugin is a pure-Python SSH implementation. It is slower than the native SSH client but works on systems where the OpenSSH client is not available:

```bash
# Use paramiko instead of native SSH
ansible all -m ping -c paramiko

# Paramiko can be useful when native SSH has issues
ansible all -m command -a "uptime" -c paramiko
```

## kubectl Connection

For managing Kubernetes pods directly:

```bash
# Run a command in a Kubernetes pod
ansible mypod -m command -a "cat /etc/hostname" -c kubectl -e "ansible_kubectl_namespace=default"
```

Inventory for Kubernetes:

```ini
# inventory/k8s.ini
[pods]
my-app-pod-abc123 ansible_connection=kubectl ansible_kubectl_namespace=production
```

## Mixing Connection Types

In a real environment, you often need different connection types for different hosts:

```ini
# inventory/mixed.ini
[linux_servers]
web1.example.com
web2.example.com
db1.example.com

[windows_servers]
win1.example.com ansible_connection=winrm ansible_winrm_transport=ntlm
win2.example.com ansible_connection=winrm ansible_winrm_transport=ntlm

[containers]
webapp ansible_connection=docker
worker ansible_connection=docker

[network_devices]
router1 ansible_connection=network_cli ansible_network_os=ios

[local]
localhost ansible_connection=local

[linux_servers:vars]
ansible_connection=ssh
ansible_user=deploy

[windows_servers:vars]
ansible_user=Administrator
ansible_port=5986
```

```bash
# Each group uses its own connection type automatically
ansible linux_servers -m ping -i inventory/mixed.ini
ansible windows_servers -m win_ping -i inventory/mixed.ini
ansible containers -m ping -i inventory/mixed.ini
```

## Connection Debugging

When connections fail, debug with increased verbosity:

```bash
# Debug SSH connections
ansible web1.example.com -m ping -vvvv

# Debug WinRM connections
ansible win1.example.com -m win_ping -vvvv

# Debug Docker connections
ansible my_container -m ping -c docker -vvvv

# Test a specific connection type
ansible all -m ping -c ssh -v
```

## Summary

Ansible's connection plugins let you manage diverse infrastructure from a single tool. SSH handles Linux servers, WinRM handles Windows, Docker manages containers directly, and specialized plugins handle network devices and Kubernetes pods. Configure connection types in your inventory to keep your ad hoc commands clean, and use the right connection for each host type. The ability to mix connection types in a single inventory file makes Ansible uniquely capable of managing heterogeneous environments.
