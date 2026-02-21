# How to Use Ansible Ad Hoc Commands with Privilege Escalation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Privilege Escalation, Sudo, Security

Description: Learn how to use privilege escalation with Ansible ad hoc commands including sudo, become, and various escalation methods for secure server management.

---

Most system administration tasks require root privileges. Installing packages, restarting services, editing config files in /etc, managing users - all of these need elevated permissions. Ansible handles this through its "become" system, which supports sudo, su, pbrun, pfexec, doas, and other privilege escalation methods. Knowing how to use privilege escalation correctly in ad hoc commands is essential for daily operations.

## The Basics of --become

The `--become` flag tells Ansible to execute the task with elevated privileges. By default, this means running the command via `sudo` as the `root` user.

```bash
# Without --become: runs as your SSH user
ansible all -a "whoami"
# Output: deploy

# With --become: runs as root via sudo
ansible all -a "whoami" --become
# Output: root
```

Let me show this in a more practical context:

```bash
# This FAILS without --become because deploy user cannot read /etc/shadow
ansible all -m shell -a "cat /etc/shadow | wc -l"
# Permission denied

# This WORKS with --become
ansible all -m shell -a "cat /etc/shadow | wc -l" --become
# Output: 42
```

## Specifying the Become User

By default, `--become` escalates to root. You can specify a different user with `--become-user`:

```bash
# Become root (default)
ansible databases -m shell -a "whoami" --become
# Output: root

# Become the postgres user
ansible databases -m shell -a "psql -c 'SELECT version();'" --become --become-user=postgres

# Become the www-data user
ansible webservers -m shell -a "ls -la /var/www/html/" --become --become-user=www-data

# Become a specific application user
ansible appservers -m shell -a "cd /opt/app && ./manage.py check" --become --become-user=appuser
```

## Handling Sudo Passwords

If your sudo configuration requires a password, Ansible needs to know it. There are several ways to provide it:

```bash
# Prompt for the sudo password interactively
ansible all -m apt -a "name=htop state=present" --become --ask-become-pass

# Short form of --ask-become-pass
ansible all -m apt -a "name=htop state=present" --become -K
```

For non-interactive use, you can set the password in other ways:

```bash
# Pass the sudo password via an environment variable (use with caution)
ANSIBLE_BECOME_PASSWORD=mysudopassword ansible all -m apt -a "name=htop state=present" --become

# Use a vault-encrypted password file
ansible all -m apt -a "name=htop state=present" --become -e "@vault_password.yml" --ask-vault-pass
```

The best practice is to configure passwordless sudo for your Ansible user on the target hosts:

```bash
# On the target hosts, create a sudoers rule for the deploy user
# /etc/sudoers.d/deploy
# deploy ALL=(ALL) NOPASSWD: ALL

# You can set this up via Ansible itself
ansible all -m copy -a "content='deploy ALL=(ALL) NOPASSWD: ALL\n' dest=/etc/sudoers.d/deploy validate='visudo -cf %s'" --become -K
```

## Become Methods

Ansible supports multiple privilege escalation methods beyond sudo:

```bash
# Use sudo (default)
ansible all -a "whoami" --become --become-method=sudo

# Use su
ansible all -a "whoami" --become --become-method=su

# Use doas (OpenBSD)
ansible openbsd_hosts -a "whoami" --become --become-method=doas

# Use pfexec (Solaris)
ansible solaris_hosts -a "whoami" --become --become-method=pfexec

# Use pbrun (PowerBroker)
ansible all -a "whoami" --become --become-method=pbrun
```

Most Linux environments use sudo, so `--become-method=sudo` is the default and you rarely need to change it.

## Practical Scenarios

### System Package Updates

```bash
# Update package cache and upgrade all packages
ansible all -m apt -a "update_cache=yes upgrade=yes" --become

# Install security updates only
ansible all -m apt -a "upgrade=yes" --become -e "ansible_apt_upgrade_type=safe"

# Install a specific package
ansible webservers -m apt -a "name=certbot state=present" --become
```

### Service Management

```bash
# Restart nginx
ansible webservers -m service -a "name=nginx state=restarted" --become

# Enable and start a service
ansible all -m systemd -a "name=chronyd state=started enabled=yes" --become

# Reload systemd daemon after adding a new unit file
ansible appservers -m systemd -a "daemon_reload=yes" --become
```

### File Operations in Protected Directories

```bash
# Write to /etc
ansible all -m copy -a "content='nameserver 8.8.8.8\nnameserver 8.8.4.4\n' dest=/etc/resolv.conf" --become

# Create a directory in /opt
ansible all -m file -a "path=/opt/app state=directory owner=deploy group=deploy mode=0755" --become

# Edit a system configuration file
ansible all -m lineinfile -a "path=/etc/ssh/sshd_config regexp='^PermitRootLogin' line='PermitRootLogin no'" --become
```

### Running Commands as Different Users

```bash
# Run a database backup as the postgres user
ansible databases -m shell -a "pg_dump production > /tmp/production_backup.sql" --become --become-user=postgres

# Run an application command as the app user
ansible appservers -m shell -a "cd /opt/app && bundle exec rake db:migrate" --become --become-user=appuser

# Check cron jobs for a specific user
ansible all -m shell -a "crontab -l" --become --become-user=www-data
```

## Configuring Defaults in ansible.cfg

Instead of typing `--become` on every command, set it as a default in your Ansible configuration:

```ini
# ansible.cfg
[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false
```

With this configuration, all commands automatically use sudo. You can still override on the command line:

```bash
# With the above config, --become is implied
ansible all -a "whoami"
# Output: root

# Override to run without privilege escalation
ansible all -a "whoami" --become=false
# Output: deploy
```

## Per-Host Privilege Escalation

You can set privilege escalation settings per host or per group in your inventory:

```ini
# inventory/production.ini
[webservers]
web1.example.com
web2.example.com

[databases]
db1.example.com ansible_become_user=postgres
db2.example.com ansible_become_user=postgres

[webservers:vars]
ansible_become=true
ansible_become_method=sudo

[databases:vars]
ansible_become=true
ansible_become_method=sudo
```

```bash
# Now database commands automatically become the postgres user
ansible databases -m shell -a "psql -c 'SELECT 1;'"
```

## Security Best Practices

### Limit Sudo Permissions

Instead of giving your Ansible user full sudo access, restrict it to specific commands:

```bash
# Create a restricted sudoers rule
# /etc/sudoers.d/ansible-deploy
# deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/apt-get update, /usr/bin/apt-get install *

ansible all -m copy -a "content='deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx, /usr/bin/apt-get update\n' dest=/etc/sudoers.d/ansible-deploy validate='visudo -cf %s'" --become -K
```

### Audit Privilege Escalation

```bash
# Check sudo logs to see what commands were run with privilege escalation
ansible all -m shell -a "grep 'sudo' /var/log/auth.log | tail -20" --become

# Check who has sudo access
ansible all -m shell -a "getent group sudo" --become
```

### Avoid Storing Passwords

```bash
# Use SSH keys for authentication
ansible all -m ping --private-key=~/.ssh/ansible_key

# Use Ansible Vault for any necessary passwords
ansible all -m apt -a "name=nginx state=present" --become -e "@secrets.yml" --ask-vault-pass
```

## Troubleshooting Privilege Escalation

When privilege escalation fails, here is how to debug:

```bash
# Check with maximum verbosity
ansible web1.example.com -a "whoami" --become -vvvv

# Test if sudo works at all
ansible web1.example.com -m raw -a "sudo whoami"

# Check the sudoers configuration
ansible web1.example.com -m shell -a "sudo -l"

# Check if the become method is available
ansible web1.example.com -m shell -a "which sudo"
```

Common errors and their fixes:

```
# Error: "Missing sudo password"
# Fix: Use --ask-become-pass or configure NOPASSWD in sudoers

# Error: "sudo: a password is required"
# Fix: Same as above

# Error: "sudo: unable to resolve host"
# Fix: Ensure /etc/hosts has the hostname entry on the remote host

# Error: "user is not in the sudoers file"
# Fix: Add the user to the sudo group or create a sudoers.d rule
```

## Summary

Privilege escalation in Ansible ad hoc commands is controlled through the `--become` flag and its related options. Use `--become` for root access, `--become-user` to switch to a specific user, `--become-method` for non-sudo environments, and `-K` when a sudo password is required. For production environments, configure passwordless sudo for your Ansible user with restricted command access, and set sensible defaults in ansible.cfg to reduce command-line verbosity. Proper privilege escalation setup is the foundation of secure, effective Ansible automation.
