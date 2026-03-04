# How to Create Granular Sudo Rules in /etc/sudoers.d on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, sudo, sudoers.d, Security, Linux

Description: Learn how to create fine-grained sudo rules using drop-in files in /etc/sudoers.d on RHEL, following the principle of least privilege.

---

Dumping everyone into the wheel group with full root access is easy but lazy. In production, you want specific users or teams to have access to specific commands and nothing more. The `/etc/sudoers.d/` directory on RHEL lets you create modular, maintainable sudo rules without touching the main sudoers file.

## Why Use /etc/sudoers.d

The main `/etc/sudoers` file should rarely be modified. Instead, drop-in files in `/etc/sudoers.d/` give you:

- **Modularity** - One file per team, role, or application.
- **Easy management** - Add or remove files without risking the main config.
- **Automation friendly** - Configuration management tools can drop files in without parsing sudoers syntax.

```mermaid
graph TD
    A[sudo checks authorization] --> B[/etc/sudoers]
    B --> C[#includedir /etc/sudoers.d]
    C --> D[/etc/sudoers.d/webadmins]
    C --> E[/etc/sudoers.d/dbadmins]
    C --> F[/etc/sudoers.d/monitoring]
    C --> G[/etc/sudoers.d/deploy]
```

## The sudoers Syntax

Every sudo rule follows this format:

```bash
WHO  WHERE=(AS_WHOM)  WHAT
```

- **WHO** - User or %group
- **WHERE** - Hostname (usually ALL)
- **AS_WHOM** - Which user/group to run as (usually root)
- **WHAT** - Command(s) allowed

## Creating Drop-in Files

Always use `visudo -f` to create files in sudoers.d. It validates the syntax before saving:

```bash
sudo visudo -f /etc/sudoers.d/webadmins
```

### Example: Allow web team to manage httpd

```bash
# Web admins can start, stop, restart, and check status of httpd
%webadmins ALL=(root) /usr/bin/systemctl start httpd, \
                       /usr/bin/systemctl stop httpd, \
                       /usr/bin/systemctl restart httpd, \
                       /usr/bin/systemctl reload httpd, \
                       /usr/bin/systemctl status httpd
```

### Example: Allow DB team to manage PostgreSQL

```bash
sudo visudo -f /etc/sudoers.d/dbadmins
```

```bash
# DB admins can manage PostgreSQL and view its logs
%dbadmins ALL=(root) /usr/bin/systemctl start postgresql, \
                      /usr/bin/systemctl stop postgresql, \
                      /usr/bin/systemctl restart postgresql, \
                      /usr/bin/systemctl status postgresql, \
                      /usr/bin/journalctl -u postgresql
```

### Example: Allow a deploy user to run specific scripts

```bash
sudo visudo -f /etc/sudoers.d/deploy
```

```bash
# Deploy user can run the deployment script as root without a password
deploy ALL=(root) NOPASSWD: /opt/deploy/run-deploy.sh
```

### Example: Allow monitoring tools to read system info

```bash
sudo visudo -f /etc/sudoers.d/monitoring
```

```bash
# Monitoring agent can run specific read-only commands
nagios ALL=(root) NOPASSWD: /usr/sbin/dmidecode, \
                             /usr/bin/lsblk, \
                             /usr/sbin/fdisk -l, \
                             /usr/bin/ss -tlnp
```

## Using Command Aliases

For complex configurations, define command aliases to keep things readable:

```bash
sudo visudo -f /etc/sudoers.d/aliases
```

```bash
# Define command groups
Cmnd_Alias NETWORKING = /usr/sbin/ip, /usr/bin/ss, /usr/sbin/iptables, /usr/sbin/nft
Cmnd_Alias SERVICES = /usr/bin/systemctl start *, /usr/bin/systemctl stop *, /usr/bin/systemctl restart *, /usr/bin/systemctl status *
Cmnd_Alias LOGS = /usr/bin/journalctl, /usr/bin/tail -f /var/log/*
Cmnd_Alias STORAGE = /usr/sbin/fdisk, /usr/sbin/mkfs.*, /usr/bin/mount, /usr/bin/umount

# Network team gets networking and log commands
%netadmins ALL=(root) NETWORKING, LOGS

# Operations team gets service and storage commands
%ops ALL=(root) SERVICES, STORAGE
```

## Denying Specific Commands

You can explicitly deny commands, which is useful when granting broad access with specific exclusions:

```bash
sudo visudo -f /etc/sudoers.d/restricted
```

```bash
# Allow developers to run most commands but not modify users or access shells
%developers ALL=(root) ALL, \
                        !/usr/sbin/useradd, \
                        !/usr/sbin/userdel, \
                        !/usr/sbin/usermod, \
                        !/usr/bin/passwd, \
                        !/bin/bash, \
                        !/bin/sh, \
                        !/usr/bin/su
```

Note: Command denials can be bypassed by clever users (e.g., copying a binary to a new name). They are not a security boundary, just a guardrail.

## File Naming and Permissions

### Naming rules

- Files must NOT contain a dot (.) or end with a tilde (~). Sudo ignores those.
- Use descriptive names: `webadmins`, `dbadmins`, `monitoring`.
- Avoid special characters in filenames.

### Permissions

```bash
# Files in sudoers.d must have these permissions
ls -la /etc/sudoers.d/

# Each file should be 0440 owned by root:root
sudo chmod 0440 /etc/sudoers.d/webadmins
sudo chown root:root /etc/sudoers.d/webadmins
```

When you use `visudo -f`, it sets the correct permissions automatically.

## Validating Configuration

### Check syntax of all sudoers files

```bash
sudo visudo -c
```

This validates the main sudoers file and all drop-in files. If any file has a syntax error, it reports the filename and line number.

### Test a specific rule

```bash
# Check what commands a user can run
sudo -l -U jsmith

# As the user, check your own privileges
sudo -l
```

## Organizing Rules by Team

A well-organized sudoers.d directory looks like this:

```bash
ls -la /etc/sudoers.d/
```

```bash
-r--r-----. 1 root root  200 Mar  4  2026 00-aliases
-r--r-----. 1 root root  150 Mar  4  2026 10-webadmins
-r--r-----. 1 root root  180 Mar  4  2026 10-dbadmins
-r--r-----. 1 root root  120 Mar  4  2026 10-netadmins
-r--r-----. 1 root root   90 Mar  4  2026 20-monitoring
-r--r-----. 1 root root   80 Mar  4  2026 20-deploy
-r--r-----. 1 root root  100 Mar  4  2026 90-restricted
```

Use number prefixes to control processing order. Aliases should come first (00-), then team rules (10-), then service accounts (20-), then restrictions (90-).

## Common Mistakes to Avoid

1. **Editing /etc/sudoers directly** - Use drop-in files instead.
2. **Not using visudo** - A syntax error can break sudo for everyone.
3. **Using wildcards carelessly** - `/usr/bin/systemctl *` allows `systemctl start sshd` but also `systemctl disable firewalld`.
4. **Forgetting full paths** - Always use absolute paths for commands.
5. **Files with dots in the name** - `webadmins.conf` will be ignored by sudo.

## Wrapping Up

Drop-in files in `/etc/sudoers.d/` are the right way to manage sudo rules on RHEL. They keep your configuration modular, auditable, and easy to manage with automation. Always use `visudo -f` to create and edit them, always use full command paths, and validate your configuration with `visudo -c` after every change. The goal is giving people exactly the access they need and nothing more.
