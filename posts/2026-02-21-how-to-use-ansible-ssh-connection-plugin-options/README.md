# How to Use Ansible SSH Connection Plugin Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Connection Options, Configuration

Description: Explore all the Ansible SSH connection plugin options available for tuning SSH behavior, authentication, timeouts, and performance.

---

The SSH connection plugin is the workhorse of Ansible. It handles all communication between the control node and managed hosts. While the defaults work fine for simple setups, there are dozens of configuration options that let you tune authentication, performance, timeouts, and connection behavior. Knowing these options means you can handle any SSH environment, from simple lab setups to complex production infrastructures with bastion hosts and strict security requirements.

## Where to Set SSH Options

SSH connection options can be configured in several places, listed from lowest to highest precedence:

```ini
# 1. ansible.cfg [ssh_connection] section
# 2. Environment variables (ANSIBLE_SSH_*)
# 3. Inventory variables (ansible_ssh_*)
# 4. Playbook variables
# 5. Command-line flags
```

## Core SSH Connection Options

### ansible.cfg SSH Section

```ini
# ansible.cfg
[ssh_connection]
# Arguments passed to the ssh command
ssh_args = -o ControlMaster=auto -o ControlPersist=60s

# Additional SSH arguments (appended to ssh_args)
ssh_extra_args =

# Path pattern for ControlMaster sockets
control_path_dir = ~/.ansible/cp
control_path = %(directory)s/%%C

# Enable pipelining (sends modules via stdin instead of file transfer)
pipelining = True

# Transfer method: smart, sftp, scp, piped
transfer_method = smart

# SCP extra args
scp_extra_args =

# SFTP extra args
sftp_extra_args =

# Number of times to retry SSH connection
retries = 3

# SSH executable to use
ssh_executable = ssh
```

## Authentication Options

### Private Key Configuration

```ini
# ansible.cfg
[defaults]
private_key_file = ~/.ssh/ansible_key
remote_user = deploy
```

```ini
# inventory/hosts - Per host or group
[webservers:vars]
ansible_ssh_private_key_file=~/.ssh/web_key
ansible_user=deploy

[dbservers:vars]
ansible_ssh_private_key_file=~/.ssh/db_key
ansible_user=dbadmin
```

### Password Authentication

```bash
# Prompt for SSH password
ansible-playbook site.yml --ask-pass

# Or set in inventory (not recommended for production)
# Use ansible-vault to encrypt
```

```yaml
# group_vars/legacy_servers.yml (encrypted with vault)
ansible_user: admin
ansible_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  ...encrypted data...
```

### SSH Key Options via ssh_args

```ini
# ansible.cfg
[ssh_connection]
# Skip password auth, go straight to public key
ssh_args = -o PreferredAuthentications=publickey

# Try multiple auth methods in order
ssh_args = -o PreferredAuthentications=publickey,keyboard-interactive

# Specify identity file in ssh_args
ssh_args = -o IdentityFile=~/.ssh/ansible_key -o IdentitiesOnly=yes
```

## Timeout Options

```ini
# ansible.cfg
[defaults]
# Overall connection timeout in seconds
timeout = 30

[ssh_connection]
# SSH connection timeout (passed to ssh -o ConnectTimeout)
# This is controlled by the defaults timeout above
# but can also be set via ssh_args
ssh_args = -o ConnectTimeout=10

# Keep connections alive
ssh_args = -o ServerAliveInterval=15 -o ServerAliveCountMax=3
```

The `ServerAliveInterval` sends keepalive packets every 15 seconds. `ServerAliveCountMax=3` means the connection drops after 3 missed keepalives (45 seconds of unresponsiveness).

## Transfer Methods

Ansible needs to transfer module code to remote hosts (unless pipelining is enabled). The `transfer_method` controls how:

```ini
# ansible.cfg
[ssh_connection]
# smart: Try sftp first, fall back to scp
transfer_method = smart

# sftp: Use SFTP only
transfer_method = sftp

# scp: Use SCP only (some old systems need this)
transfer_method = scp

# piped: Use shell commands (cat) for transfer
transfer_method = piped
```

When to use each:

```ini
# Modern systems - use smart (default)
transfer_method = smart

# Systems with restricted SFTP - use scp
transfer_method = scp

# Systems with restricted SCP and SFTP - use piped
transfer_method = piped
```

## SSH Executable

You can change which SSH binary Ansible uses:

```ini
# ansible.cfg
[ssh_connection]
# Use a custom SSH binary
ssh_executable = /usr/local/bin/ssh

# Use a wrapper script
ssh_executable = /usr/local/bin/ssh-wrapper.sh
```

A wrapper script is useful for adding custom logic:

```bash
#!/bin/bash
# /usr/local/bin/ssh-wrapper.sh
# Log all SSH connections for auditing
echo "$(date) SSH: $@" >> /var/log/ansible-ssh.log
exec /usr/bin/ssh "$@"
```

## Inventory-Level SSH Options

These variables can be set per host or per group in your inventory:

```ini
# inventory/hosts
[webservers]
web01 ansible_host=10.0.1.10 ansible_port=22 ansible_user=deploy
web02 ansible_host=10.0.1.11 ansible_port=2222 ansible_user=deploy

[webservers:vars]
ansible_ssh_private_key_file=~/.ssh/web_key
ansible_ssh_common_args=-o ProxyJump=bastion@jump.example.com
ansible_ssh_extra_args=-o StrictHostKeyChecking=no
ansible_ssh_pipelining=true
ansible_ssh_retries=3
```

All available SSH inventory variables:

```yaml
# Full list of SSH-related inventory variables
ansible_host: 10.0.1.10              # Target hostname/IP
ansible_port: 22                      # SSH port
ansible_user: deploy                  # SSH username
ansible_password: secret              # SSH password (use vault!)
ansible_ssh_private_key_file: ~/.ssh/key  # Path to private key
ansible_ssh_common_args: ""           # Args for ssh, sftp, scp
ansible_ssh_extra_args: ""            # Extra args for ssh only
ansible_sftp_extra_args: ""           # Extra args for sftp only
ansible_scp_extra_args: ""            # Extra args for scp only
ansible_ssh_pipelining: true          # Enable pipelining
ansible_ssh_executable: /usr/bin/ssh  # SSH binary path
```

## Complete Performance-Tuned Configuration

Here is a production-ready configuration combining all the performance options:

```ini
# ansible.cfg - Performance optimized
[defaults]
forks = 30
timeout = 30
remote_user = deploy
private_key_file = ~/.ssh/ansible_key
host_key_checking = False
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 7200
callback_whitelist = timer, profile_tasks

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=120s -o PreferredAuthentications=publickey -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ConnectTimeout=10
control_path_dir = ~/.ansible/cp
control_path = %(directory)s/%%C
pipelining = True
retries = 3
transfer_method = smart
```

## Complete Security-Focused Configuration

For environments where security is the priority:

```ini
# ansible.cfg - Security focused
[defaults]
forks = 10
timeout = 15
remote_user = ansible
private_key_file = ~/.ssh/ansible_ed25519_key
host_key_checking = True

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=30s -o PreferredAuthentications=publickey -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=~/.ssh/ansible_known_hosts
control_path_dir = ~/.ansible/cp
control_path = %(directory)s/%%C
pipelining = True
retries = 1
```

Key security settings:
- `IdentitiesOnly=yes` - Only use the specified key, do not try others
- `StrictHostKeyChecking=yes` - Always verify host keys
- Separate `UserKnownHostsFile` for Ansible
- Lower `ControlPersist` to reduce window of connection reuse

## Debugging SSH Options

When something is not working, crank up the verbosity:

```bash
# Show SSH command being executed
ansible all -m ping -vvvv

# The output includes the exact SSH command with all arguments
# Look for lines starting with "SSH: EXEC ssh"
```

Example debug output:

```
<web01> SSH: EXEC ssh -o ControlMaster=auto -o ControlPersist=60s -o PreferredAuthentications=publickey -o StrictHostKeyChecking=no -o 'IdentityFile="~/.ssh/ansible_key"' -o KbdInteractiveAuthentication=no -o PreferredAuthentications=gssapi-with-mic,gssapi-keyex,hostbased,publickey -o PasswordAuthentication=no -o 'User="deploy"' -o ConnectTimeout=10 -o 'ControlPath="/home/user/.ansible/cp/abc123"' 10.0.1.10 '/bin/sh -c '"'"'echo ~deploy && sleep 0'"'"''
```

This shows you exactly what SSH arguments Ansible is using, which is invaluable for troubleshooting.

## Environment Variable Overrides

Every SSH option has a corresponding environment variable:

```bash
# Override SSH args
export ANSIBLE_SSH_ARGS="-o ControlMaster=auto -o ControlPersist=60s"

# Override pipelining
export ANSIBLE_SSH_PIPELINING=True

# Override retries
export ANSIBLE_SSH_RETRIES=5

# Override transfer method
export ANSIBLE_SSH_TRANSFER_METHOD=scp

# Override control path
export ANSIBLE_SSH_CONTROL_PATH_DIR=~/.ansible/cp
```

These are useful in CI/CD pipelines where you cannot modify `ansible.cfg`:

```yaml
# GitLab CI example
deploy:
  script:
    - ansible-playbook deploy.yml
  variables:
    ANSIBLE_SSH_ARGS: "-o ControlMaster=auto -o ControlPersist=60s"
    ANSIBLE_SSH_PIPELINING: "True"
    ANSIBLE_SSH_RETRIES: "3"
```

## Wrapping Up

The SSH connection plugin is highly configurable, and understanding its options lets you handle any environment. Start with the performance-optimized configuration (ControlMaster, pipelining, increased forks) and adjust based on your needs. Use inventory variables to handle per-host differences, and use the `-vvvv` flag to see exactly what SSH commands Ansible generates. The difference between a well-tuned SSH configuration and the defaults can be the difference between a 10-minute playbook run and a 3-minute one.
