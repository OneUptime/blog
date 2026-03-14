# How to Configure sudo Access Without a Password on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Sudo, Security, Linux, System Administration

Description: A practical guide to configuring passwordless sudo access on Ubuntu for specific users, commands, or automation scripts, with security considerations.

---

Passwordless sudo is a common requirement for automation, CI/CD pipelines, configuration management tools like Ansible, and developer workflows where constant password prompts interrupt work. Configuring it correctly requires understanding the sudo rules syntax and the security trade-offs involved. This guide covers the mechanisms, practical configurations, and ways to minimize risk.

## When Passwordless sudo Makes Sense

Before configuring passwordless sudo, consider the security model. Requiring a password for sudo has value:

- It confirms the user at the keyboard is the account owner
- It creates a moment of deliberate intent before privileged operations
- It prevents certain malware from escalating privileges silently

Passwordless sudo is reasonable for:
- Service accounts running automated scripts that need specific privileged commands
- CI/CD agent users (Jenkins, GitHub Actions runners) that run as a dedicated account
- Developer workstations where the developer has full disk encryption and physical security
- Specific commands that are frequently needed and low-risk

It's less appropriate for:
- Shared workstations with multiple users
- Servers where the account might be reached via SSH from the internet
- Full unrestricted sudo access for any human user on a production server

## The sudoers File Structure

sudo reads its configuration from `/etc/sudoers` and any files in `/etc/sudoers.d/`. Always edit these with `visudo`, which validates syntax before saving and prevents sudo lockout from typos:

```bash
# NEVER edit /etc/sudoers directly - always use visudo
sudo visudo

# Or edit a file in sudoers.d (preferred for custom configurations)
sudo visudo -f /etc/sudoers.d/myconfig
```

The basic rule format:

```text
user   host=(runas_user)   NOPASSWD: command
```

- `user` - username or `%groupname`
- `host` - hostname or `ALL`
- `(runas_user)` - who to run as, usually `(ALL)` for root
- `NOPASSWD:` - skip the password prompt
- `command` - full path to command, or `ALL`

## Granting Passwordless sudo to a User

### Full Unrestricted Access (Use Sparingly)

```bash
# Open sudoers.d for editing
sudo visudo -f /etc/sudoers.d/alice

# Add this line to grant passwordless full sudo
alice ALL=(ALL) NOPASSWD: ALL
```

After saving, verify it works:

```bash
# Test as alice (in a new session or by switching to alice)
su - alice
sudo whoami
# Should output: root
# Without any password prompt
```

### Granting Access to a Group

More manageable than user-by-user configuration:

```bash
sudo visudo -f /etc/sudoers.d/automation

# Allow the 'deploy' group to run sudo without password
%deploy ALL=(ALL) NOPASSWD: ALL

# Add users to the group
sudo usermod -aG deploy ciagent
sudo usermod -aG deploy deploybot
```

## Restricting Passwordless sudo to Specific Commands

The safest approach is granting passwordless access only to the specific commands that actually need it:

```bash
sudo visudo -f /etc/sudoers.d/webapp-deploy

# Allow the deploy user to restart specific services without a password
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart myapp

# Allow running a specific deployment script
deploy ALL=(ALL) NOPASSWD: /opt/deploy/run-deploy.sh

# Allow reading log files that require root
monitor ALL=(ALL) NOPASSWD: /usr/bin/journalctl
monitor ALL=(ALL) NOPASSWD: /bin/cat /var/log/auth.log
```

Multiple commands can be listed on one line:

```bash
# Multiple commands in one rule
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx, /usr/bin/nginx -t
```

Or use a command alias for cleaner organization:

```bash
sudo visudo -f /etc/sudoers.d/deploy-aliases

# Define a named group of commands
Cmnd_Alias NGINX_CMDS = /usr/bin/systemctl restart nginx, \
                         /usr/bin/systemctl reload nginx, \
                         /usr/bin/systemctl stop nginx, \
                         /usr/bin/nginx -t

Cmnd_Alias DEPLOY_CMDS = /opt/deploy/deploy.sh, \
                          /opt/deploy/rollback.sh

# Grant the aliases to the deploy group
%deploy ALL=(ALL) NOPASSWD: NGINX_CMDS, DEPLOY_CMDS
```

## Passwordless sudo for Ansible

Ansible is a common reason to configure passwordless sudo. Ansible connects via SSH and then uses sudo for privileged tasks:

```bash
# Create a dedicated Ansible user
sudo useradd -m -s /bin/bash ansibleadmin

# Generate an SSH key for Ansible to use
sudo su - ansibleadmin
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
exit

# Grant passwordless sudo
sudo visudo -f /etc/sudoers.d/ansibleadmin

# Add:
ansibleadmin ALL=(ALL) NOPASSWD: ALL
```

On the Ansible control machine:

```yaml
# inventory/hosts
[webservers]
server1.example.com
server2.example.com

# ansible.cfg
[defaults]
remote_user = ansibleadmin
private_key_file = ~/.ssh/ansibleadmin_key

[privilege_escalation]
become = true
become_method = sudo
become_ask_pass = false  # No password prompt
```

## For CI/CD Runners

```bash
# Create a CI runner user
sudo useradd -m -s /bin/bash cirunner

# Grant passwordless sudo - typically full access for CI
sudo visudo -f /etc/sudoers.d/cirunner

# Add:
cirunner ALL=(ALL) NOPASSWD: ALL

# Or restrict to what CI actually needs
# cirunner ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/systemctl

# Set up SSH key for GitHub Actions runner or Jenkins
sudo su - cirunner
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Add your CI service's public key to authorized_keys
```

## Checking the Current sudo Configuration

```bash
# Test what sudo commands a user can run
sudo -l -U alice

# As the user themselves
sudo -l

# Example output showing passwordless access:
# User alice may run the following commands on server:
#     (ALL : ALL) NOPASSWD: ALL

# Test without actually running (dry run)
sudo -l | grep NOPASSWD

# Check which sudoers files are loaded
ls -la /etc/sudoers.d/

# View a specific sudoers.d file
sudo cat /etc/sudoers.d/cirunner
```

## Security Hardening

If passwordless sudo is necessary, apply these mitigations:

```bash
sudo visudo -f /etc/sudoers.d/secure-automation

# Restrict to specific commands (not ALL)
deploy ALL=(ALL) NOPASSWD: /opt/scripts/deploy.sh

# Prevent running interactive shells (important security measure)
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart *, !/bin/sh, !/bin/bash

# Log sudo usage even for NOPASSWD (enabled by default via syslog)
# Check: /var/log/auth.log
grep sudo /var/log/auth.log | tail -20
```

Configure SSH to restrict what the user can do even before reaching sudo:

```bash
# In /etc/ssh/sshd_config or a Match block
# Limit environment variables
PermitUserEnvironment no

# Restrict the CI user to specific commands at the SSH level
# (Combined with sudo restrictions, this provides defense in depth)
```

## Revoking Passwordless Access

```bash
# Remove a specific sudoers.d file
sudo rm /etc/sudoers.d/alice

# Or edit the file to add a password requirement
sudo visudo -f /etc/sudoers.d/alice
# Change: alice ALL=(ALL) NOPASSWD: ALL
# To:     alice ALL=(ALL) ALL   (password required)

# Verify revocation
sudo -l -U alice
# Should no longer show NOPASSWD
```

## Auditing sudo Usage

Even with NOPASSWD, all sudo commands are logged:

```bash
# View sudo activity in auth.log
grep "sudo" /var/log/auth.log | tail -30

# View sudo failures
grep "sudo.*FAILED" /var/log/auth.log

# More structured logging with journalctl
journalctl _COMM=sudo | tail -30

# Log contains: user, command, working directory, and timestamp
# Example: alice : PWD=/home/alice ; USER=root ; COMMAND=/bin/systemctl restart nginx
```

Passwordless sudo, when configured for specific commands and dedicated service accounts rather than human accounts, is a manageable security configuration. The critical point is restricting access to only the commands that actually need it - granting `NOPASSWD: ALL` to a human user account on an internet-facing server is a significant security gap that should be avoided.
