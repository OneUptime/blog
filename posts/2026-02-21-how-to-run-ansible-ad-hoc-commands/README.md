# How to Run Ansible Ad Hoc Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Automation, DevOps

Description: Learn how to run Ansible ad hoc commands for quick one-off tasks across your infrastructure without writing playbooks.

---

Ansible playbooks are great for repeatable automation, but sometimes you just need to run a quick command across a bunch of servers. Maybe you need to check disk space, restart a service, or deploy an emergency config change. Writing a full playbook for a one-off task is overkill. That is exactly what ad hoc commands are for.

Ad hoc commands let you run a single Ansible task against one or more hosts directly from the command line. No YAML file needed. They are the Swiss army knife of day-to-day infrastructure management.

## Basic Syntax

The basic format of an ad hoc command is:

```bash
# Basic ad hoc command structure
ansible <host-pattern> -m <module> -a "<module-arguments>"
```

Where:
- `<host-pattern>` specifies which hosts to target (a group name, hostname, or pattern)
- `-m <module>` specifies the Ansible module to use
- `-a "<module-arguments>"` passes arguments to the module

## Your First Ad Hoc Command

The simplest ad hoc command pings all hosts to check connectivity:

```bash
# Ping all hosts defined in your inventory
ansible all -m ping
```

This does not send an ICMP ping. It uses the Ansible `ping` module, which connects to each host via SSH, runs a small Python script, and returns `pong` if everything works.

The output looks like this:

```
web1 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
web2 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
db1 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

## Specifying an Inventory

By default, Ansible looks for an inventory at `/etc/ansible/hosts`. You can specify a different inventory file with `-i`:

```bash
# Use a custom inventory file
ansible all -m ping -i inventory/production.ini

# Use a dynamic inventory script
ansible all -m ping -i inventory/aws_ec2.py

# Target a specific group from the inventory
ansible webservers -m ping -i inventory/production.ini
```

Here is a sample inventory file for context:

```ini
# inventory/production.ini
# Defines server groups and connection details

[webservers]
web1.example.com
web2.example.com

[databases]
db1.example.com
db2.example.com

[all:vars]
ansible_user=deploy
ansible_ssh_private_key_file=~/.ssh/deploy_key
```

## Running Shell Commands

The `command` module is the default when no module is specified. You can also use the `shell` module for commands that need shell features like pipes and redirection.

```bash
# Run a command using the default command module
ansible webservers -a "uptime"

# Run a command explicitly using the command module
ansible webservers -m command -a "df -h"

# Use the shell module for pipes and redirects
ansible webservers -m shell -a "ps aux | grep nginx | wc -l"

# Use the shell module for environment variable expansion
ansible webservers -m shell -a "echo $HOSTNAME"
```

The difference between `command` and `shell` is important. The `command` module runs the command directly without a shell, which is safer but does not support pipes, redirection, or environment variable expansion. The `shell` module runs through `/bin/sh`, which supports all shell features but could be affected by the user's shell configuration.

## Common Module Examples

Here are ad hoc commands using frequently needed modules:

```bash
# Copy a file to all web servers
ansible webservers -m copy -a "src=./nginx.conf dest=/etc/nginx/nginx.conf"

# Install a package on all servers
ansible all -m apt -a "name=htop state=present" --become

# Restart a service
ansible webservers -m service -a "name=nginx state=restarted" --become

# Create a directory
ansible all -m file -a "path=/opt/app/logs state=directory mode=0755"

# Add a user
ansible all -m user -a "name=deploy shell=/bin/bash groups=sudo" --become

# Fetch a file from remote hosts
ansible webservers -m fetch -a "src=/var/log/nginx/error.log dest=./logs/ flat=no"
```

## Host Patterns

You have several ways to target hosts:

```bash
# Target all hosts
ansible all -m ping

# Target a specific group
ansible webservers -m ping

# Target multiple groups
ansible 'webservers:databases' -m ping

# Target the intersection of two groups (hosts in BOTH groups)
ansible 'webservers:&production' -m ping

# Exclude a group
ansible 'all:!staging' -m ping

# Target a specific host
ansible web1.example.com -m ping

# Use wildcard patterns
ansible '*.example.com' -m ping

# Target by numeric range
ansible 'web[1:5].example.com' -m ping
```

## Key Command-Line Options

Here are the most useful flags you will use with ad hoc commands:

```bash
# Use privilege escalation (sudo)
ansible webservers -m apt -a "name=nginx state=latest" --become

# Specify a different become user
ansible databases -m shell -a "pg_dump mydb > /tmp/backup.sql" --become --become-user=postgres

# Set the number of parallel forks (default is 5)
ansible all -m ping -f 20

# Specify SSH user
ansible all -m ping -u deploy

# Ask for SSH password
ansible all -m ping --ask-pass

# Ask for sudo password
ansible all -m apt -a "name=htop state=present" --become --ask-become-pass

# Check mode (dry run)
ansible webservers -m copy -a "src=./config dest=/etc/app/config" --check

# Show detailed diff of changes
ansible webservers -m copy -a "src=./config dest=/etc/app/config" --check --diff

# Increase verbosity for debugging
ansible all -m ping -v      # verbose
ansible all -m ping -vv     # more verbose
ansible all -m ping -vvv    # debug level
ansible all -m ping -vvvv   # connection debug level
```

## Practical Workflow Example

Here is a real-world scenario showing how ad hoc commands fit into a quick troubleshooting workflow:

```bash
# Step 1: Check which servers are reachable
ansible webservers -m ping

# Step 2: Check disk space on all web servers
ansible webservers -a "df -h /"

# Step 3: Found that web2 is running low, check what is using space
ansible web2.example.com -m shell -a "du -sh /var/log/* | sort -rh | head -10"

# Step 4: Rotate the logs
ansible web2.example.com -m shell -a "logrotate -f /etc/logrotate.d/nginx" --become

# Step 5: Verify disk space improved
ansible web2.example.com -a "df -h /"
```

This whole workflow took five commands and maybe two minutes. Writing a playbook for this would have been unnecessary overhead.

## Output Formatting

Ansible offers different output formats through callback plugins:

```bash
# Use one-line output for quick scanning
ANSIBLE_STDOUT_CALLBACK=oneline ansible all -m ping

# Use minimal output
ANSIBLE_STDOUT_CALLBACK=minimal ansible webservers -a "uptime"

# Use JSON output for parsing with other tools
ANSIBLE_STDOUT_CALLBACK=json ansible all -m ping

# Use YAML output for readability
ANSIBLE_STDOUT_CALLBACK=yaml ansible webservers -a "uptime"
```

## When to Use Ad Hoc Commands vs Playbooks

Ad hoc commands are best for:
- Quick checks across your fleet (disk space, uptime, service status)
- Emergency actions (killing a process, restarting a crashed service)
- Information gathering (checking installed package versions, reading config values)
- One-time setup tasks that do not need to be repeated

Switch to a playbook when:
- You need to run the same sequence of tasks regularly
- The task involves multiple steps with dependencies
- You need conditionals, loops, or handlers
- Other team members need to reproduce the task
- You want version-controlled infrastructure changes

## Summary

Ad hoc commands are one of the most practical features in Ansible for day-to-day operations. They give you the power of Ansible's module ecosystem without the overhead of writing a playbook. Learn the basic syntax, get comfortable with the common modules and command-line options, and you will find yourself reaching for ad hoc commands constantly when managing infrastructure.
