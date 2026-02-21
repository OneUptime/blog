# How to Use Ansible with SSH Config File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, SSH Config, Configuration

Description: Integrate Ansible with your SSH config file to leverage host aliases, proxy settings, and connection options for cleaner inventory management.

---

The SSH config file (`~/.ssh/config`) is where experienced sysadmins store their SSH connection preferences: host aliases, key files, proxy settings, and connection options. Ansible can read this file too, which means you can share SSH configuration between manual SSH sessions and Ansible automation. This approach keeps your Ansible inventory cleaner, avoids duplicating connection settings, and leverages SSH's powerful pattern matching.

## How Ansible Uses SSH Config

By default, Ansible passes the system SSH client to handle connections. The SSH client reads `~/.ssh/config` automatically unless told otherwise. This means Ansible already benefits from your SSH config without any extra configuration.

However, Ansible's own `ssh_args` can interfere. If you set `ssh_args` in `ansible.cfg`, those arguments may override or conflict with SSH config settings. To explicitly tell Ansible to use a specific SSH config file:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -F ~/.ssh/config
```

## Basic SSH Config Structure

An SSH config file consists of `Host` blocks that match connection targets:

```bash
# ~/.ssh/config

# Default settings for all hosts
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 3
    AddKeysToAgent yes
    IdentitiesOnly yes

# Specific host configuration
Host web01
    HostName 10.0.1.10
    User deploy
    Port 22
    IdentityFile ~/.ssh/deploy_key

Host web02
    HostName 10.0.1.11
    User deploy
    Port 2222
    IdentityFile ~/.ssh/deploy_key
```

When Ansible connects to `web01`, SSH reads the config and knows to connect to `10.0.1.10` as user `deploy` using the specified key.

## Simplifying Ansible Inventory

Without SSH config, your inventory carries all the connection details:

```ini
# inventory/hosts - Verbose version (without SSH config)
[webservers]
web01 ansible_host=10.0.1.10 ansible_user=deploy ansible_port=22 ansible_ssh_private_key_file=~/.ssh/deploy_key
web02 ansible_host=10.0.1.11 ansible_user=deploy ansible_port=2222 ansible_ssh_private_key_file=~/.ssh/deploy_key
web03 ansible_host=10.0.1.12 ansible_user=deploy ansible_port=22 ansible_ssh_private_key_file=~/.ssh/deploy_key
```

With SSH config handling the connection details, your inventory becomes minimal:

```ini
# inventory/hosts - Clean version (with SSH config)
[webservers]
web01
web02
web03
```

All the connection details live in the SSH config file instead.

## Wildcard Patterns in SSH Config

SSH config supports wildcards, which is powerful for environments with consistent naming:

```bash
# ~/.ssh/config

# All web servers in production
Host prod-web*
    User deploy
    Port 2222
    IdentityFile ~/.ssh/prod_key
    ProxyJump bastion-prod

# All database servers in production
Host prod-db*
    User dbadmin
    Port 5522
    IdentityFile ~/.ssh/db_key
    ProxyJump bastion-prod

# All staging servers
Host staging-*
    User vagrant
    Port 22
    IdentityFile ~/.ssh/staging_key
    StrictHostKeyChecking no

# IP-based patterns
Host 10.0.1.*
    User deploy
    IdentityFile ~/.ssh/internal_key

Host 10.0.2.*
    User dbadmin
    IdentityFile ~/.ssh/db_key
```

With these patterns, any host matching the pattern automatically gets the right settings:

```ini
# inventory/hosts
[production_web]
prod-web01 ansible_host=10.0.1.10
prod-web02 ansible_host=10.0.1.11
prod-web03 ansible_host=10.0.1.12

[production_db]
prod-db01 ansible_host=10.0.2.10
prod-db02 ansible_host=10.0.2.11

[staging]
staging-web01 ansible_host=10.0.10.10
staging-db01 ansible_host=10.0.10.20
```

The SSH config handles users, keys, ports, and proxy settings based on hostname patterns.

## Bastion Hosts via SSH Config

SSH config is the cleanest way to configure bastion host access:

```bash
# ~/.ssh/config

# Production bastion
Host bastion-prod
    HostName bastion.prod.example.com
    User bastion_admin
    IdentityFile ~/.ssh/bastion_prod_key
    Port 22

# All production servers go through the bastion
Host prod-*
    ProxyJump bastion-prod
    User deploy
    IdentityFile ~/.ssh/prod_key

# Staging bastion
Host bastion-staging
    HostName bastion.staging.example.com
    User bastion_admin
    IdentityFile ~/.ssh/bastion_staging_key

# All staging servers go through their bastion
Host staging-*
    ProxyJump bastion-staging
    User deploy
    IdentityFile ~/.ssh/staging_key
```

Your Ansible inventory has zero bastion configuration:

```ini
# inventory/hosts - No bastion config needed
[production]
prod-web01 ansible_host=10.0.1.10
prod-web02 ansible_host=10.0.1.11
prod-db01 ansible_host=10.0.2.10

[staging]
staging-web01 ansible_host=10.0.10.10
staging-db01 ansible_host=10.0.10.20
```

## SSH Config with ControlMaster

Configure connection multiplexing in SSH config instead of `ansible.cfg`:

```bash
# ~/.ssh/config
Host *
    ControlMaster auto
    ControlPersist 120s
    ControlPath ~/.ssh/sockets/%C
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

Create the socket directory:

```bash
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets
```

Then your `ansible.cfg` only needs:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -F ~/.ssh/config
pipelining = True
```

The benefit is that ControlMaster works for both Ansible and manual SSH sessions.

## Multiple SSH Config Files

You might want different SSH configs for different projects:

```bash
# Project-specific SSH config
# ~/projects/production/ssh_config
Host *
    StrictHostKeyChecking yes
    IdentitiesOnly yes

Host prod-*
    ProxyJump bastion-prod
    User deploy
```

```ini
# ~/projects/production/ansible.cfg
[ssh_connection]
ssh_args = -F ~/projects/production/ssh_config
```

Or combine configs using the `Include` directive (OpenSSH 7.3+):

```bash
# ~/.ssh/config
Include ~/.ssh/config.d/*

Host *
    ServerAliveInterval 30
```

```bash
# ~/.ssh/config.d/production
Host prod-*
    ProxyJump bastion-prod
    User deploy
    IdentityFile ~/.ssh/prod_key

# ~/.ssh/config.d/staging
Host staging-*
    User vagrant
    IdentityFile ~/.ssh/staging_key
```

## Full Example: Enterprise Setup

Here is a realistic SSH config for a mid-size company:

```bash
# ~/.ssh/config

# Global defaults
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPersist 120s
    ControlPath ~/.ssh/sockets/%C
    AddKeysToAgent yes
    IdentitiesOnly yes
    HashKnownHosts yes

# Production bastion (US-East)
Host bastion-east
    HostName bastion-east.company.com
    User admin
    IdentityFile ~/.ssh/bastion_key
    Port 22

# Production bastion (US-West)
Host bastion-west
    HostName bastion-west.company.com
    User admin
    IdentityFile ~/.ssh/bastion_key
    Port 22

# Production web servers (US-East)
Host prod-east-web*
    ProxyJump bastion-east
    User deploy
    IdentityFile ~/.ssh/prod_key

# Production web servers (US-West)
Host prod-west-web*
    ProxyJump bastion-west
    User deploy
    IdentityFile ~/.ssh/prod_key

# Production database servers (all regions)
Host prod-*-db*
    ProxyJump bastion-east
    User dbadmin
    IdentityFile ~/.ssh/db_key
    Port 5522

# Staging environment (direct access)
Host staging-*
    User devops
    IdentityFile ~/.ssh/staging_key
    StrictHostKeyChecking no

# Development environment
Host dev-*
    User vagrant
    IdentityFile ~/.ssh/vagrant_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel QUIET
```

Matching Ansible inventory:

```ini
# inventory/production/hosts
[webservers_east]
prod-east-web01 ansible_host=10.0.1.10
prod-east-web02 ansible_host=10.0.1.11

[webservers_west]
prod-west-web01 ansible_host=10.1.1.10
prod-west-web02 ansible_host=10.1.1.11

[dbservers]
prod-east-db01 ansible_host=10.0.2.10
prod-west-db01 ansible_host=10.1.2.10
```

Notice how clean the inventory is. All connection logic is in the SSH config.

## Verifying SSH Config Is Used

Confirm Ansible is using your SSH config:

```bash
# Run with -vvvv to see the SSH command
ansible web01 -m ping -vvvv

# Look for the -F flag in the SSH EXEC line
# Or look for settings from your SSH config being applied
```

Test SSH config parsing directly:

```bash
# Show resolved SSH config for a specific host
ssh -G web01

# This outputs all effective settings, showing what SSH will use
# Look for User, Port, HostName, IdentityFile, ProxyJump, etc.
```

## Precedence: SSH Config vs Ansible Variables

When both SSH config and Ansible variables define the same setting, Ansible wins because it passes explicit flags to SSH:

```bash
# If SSH config says Port 22 but inventory says ansible_port=2222
# Ansible will pass -o Port=2222, which overrides SSH config
```

General precedence (highest wins):
1. Ansible command-line flags (`-u`, `--private-key`)
2. Ansible inventory variables (`ansible_port`, `ansible_user`)
3. Ansible `ssh_args` in ansible.cfg
4. SSH config file settings
5. SSH defaults

Use this to your advantage: let SSH config handle the defaults and use Ansible variables only for exceptions.

## Security Considerations

Keep your SSH config file secure:

```bash
# Correct permissions
chmod 600 ~/.ssh/config
chmod 700 ~/.ssh
```

Best practices:
- Use `IdentitiesOnly yes` to prevent SSH from trying all keys in the agent
- Use `HashKnownHosts yes` to obscure hostnames in known_hosts
- Never put passwords in the SSH config
- Use `StrictHostKeyChecking yes` for production hosts
- Use `UserKnownHostsFile /dev/null` only for truly ephemeral environments

## Wrapping Up

The SSH config file is a natural companion to Ansible. It centralizes SSH connection settings in a file that both Ansible and manual SSH sessions use, eliminating duplication and keeping your inventory focused on what matters: host grouping and application-level variables. Wildcard patterns handle environments with consistent naming conventions, and the ProxyJump directive cleanly manages bastion host routing. For most environments, putting connection details in SSH config and group/application details in Ansible inventory gives you the cleanest separation of concerns.
