# How to Use Ansible Ad Hoc Commands to Run Shell Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Shell Commands, Remote Execution

Description: Learn how to run shell commands across remote hosts using Ansible ad hoc commands, including the differences between command and shell modules.

---

Running shell commands across your servers is probably the most common use of Ansible ad hoc commands. Need to check the uptime of every server? Check a process list? Run a quick diagnostic? Instead of opening SSH sessions to each host, you run one Ansible command and get results from everywhere at once.

Ansible provides three modules for running commands on remote hosts: `command`, `shell`, and `raw`. Each behaves differently, and knowing when to use which one will save you from unexpected bugs.

## The command Module (Default)

When you do not specify a module with `-m`, Ansible uses the `command` module by default. It executes commands directly, without going through a shell.

```bash
# These two are identical - command is the default module
ansible webservers -a "uptime"
ansible webservers -m command -a "uptime"

# Check disk usage
ansible all -a "df -h"

# List running processes
ansible all -a "ps aux --sort=-%mem"

# Check the kernel version
ansible all -a "uname -r"

# See who is logged in
ansible all -a "who"
```

Because `command` does not invoke a shell, it is safer and slightly faster. However, it does not support shell features like pipes, redirects, environment variable expansion, or glob patterns.

```bash
# This will FAIL because command does not support pipes
ansible all -a "ps aux | grep nginx"
# Error: No such file or directory: '|'

# This will FAIL because command does not support redirects
ansible all -a "echo hello > /tmp/test.txt"

# This will FAIL because command does not expand globs
ansible all -a "ls /var/log/*.log"
```

## The shell Module

The `shell` module runs commands through `/bin/sh`, giving you access to all shell features:

```bash
# Using pipes to filter process output
ansible webservers -m shell -a "ps aux | grep nginx | grep -v grep"

# Using output redirection
ansible all -m shell -a "df -h > /tmp/disk_report.txt"

# Using environment variables
ansible all -m shell -a "echo $HOSTNAME - $USER"

# Using command substitution
ansible all -m shell -a "echo 'Server booted at: $(who -b)'"

# Using glob patterns
ansible all -m shell -a "ls -la /var/log/*.log | head -10"

# Chaining multiple commands
ansible all -m shell -a "cd /opt/app && git log --oneline -5"
```

## The raw Module

The `raw` module sends a command directly over SSH without any Ansible module wrapper. It does not require Python on the remote host, making it useful for bootstrapping or working with minimal systems.

```bash
# Use raw when Python is not installed on the remote host
ansible all -m raw -a "apt-get install -y python3" --become

# Or for network devices that do not have Python
ansible switches -m raw -a "show version"
```

## When to Use Each Module

Here is a practical guide:

```bash
# Use command (default) for simple, safe commands
ansible all -a "hostname"
ansible all -a "date"
ansible all -a "cat /etc/os-release"

# Use shell when you need pipes, redirects, or shell features
ansible all -m shell -a "netstat -tlnp | grep ':80'"
ansible all -m shell -a "find /var/log -name '*.log' -mtime +30 | wc -l"

# Use raw when Python is missing or for network devices
ansible newservers -m raw -a "which python3 || which python"
```

## Controlling Command Execution

### Working Directory

```bash
# Change to a directory before running a command
ansible appservers -m command -a "git status chdir=/opt/myapp"

# Also works with the shell module
ansible appservers -m shell -a "npm test chdir=/opt/myapp"
```

### Running as a Different User

```bash
# Run a command as the postgres user
ansible databases -m shell -a "psql -c 'SELECT count(*) FROM users;' mydb" --become --become-user=postgres

# Run a command as root
ansible all -m shell -a "cat /etc/shadow | wc -l" --become
```

### Executable Shell

```bash
# Specify which shell to use
ansible all -m shell -a "source /opt/app/env.sh && echo $APP_VERSION" -e "ansible_shell_executable=/bin/bash"
```

### Conditional Execution

```bash
# Only run if a file exists (creates parameter)
ansible all -m command -a "service nginx restart creates=/etc/nginx/nginx.conf" --become

# Only run if a file does NOT exist (removes parameter)
ansible all -m command -a "/opt/setup.sh removes=/opt/setup_needed" --become
```

The `creates` parameter tells Ansible to skip the command if the specified file already exists. The `removes` parameter skips the command if the file does not exist. These are useful for making ad hoc commands idempotent.

## Handling Output

### One-Line Output

```bash
# Compact output format, one line per host
ansible all -a "hostname" --one-line
```

Output:
```
web1 | CHANGED | rc=0 | (stdout) web1.example.com
web2 | CHANGED | rc=0 | (stdout) web2.example.com
db1 | CHANGED | rc=0 | (stdout) db1.example.com
```

### JSON Output

```bash
# JSON output for programmatic processing
ANSIBLE_STDOUT_CALLBACK=json ansible all -a "uptime" 2>/dev/null
```

### Capturing Errors

```bash
# The shell module captures both stdout and stderr
ansible all -m shell -a "cat /var/log/app/error.log 2>&1 | tail -5"

# Check the return code of a command
ansible all -m shell -a "systemctl is-active nginx; echo \"Exit code: $?\""
```

## Practical Scenarios

### Quick Health Check

```bash
# Check load average across all servers
ansible all -a "uptime" --one-line

# Check memory usage
ansible all -m shell -a "free -m | grep Mem"

# Check disk usage on root partition
ansible all -m shell -a "df -h / | tail -1"

# Check for zombie processes
ansible all -m shell -a "ps aux | awk '{if (\$8 == \"Z\") print}'"
```

### Application Debugging

```bash
# Check application logs for errors in the last hour
ansible appservers -m shell -a "journalctl -u myapp --since '1 hour ago' -p err --no-pager"

# Check database connections
ansible databases -m shell -a "ss -tlnp | grep 5432" --become

# View recent application deployments
ansible appservers -m shell -a "ls -lt /opt/app/releases/ | head -5"

# Check if a specific process is running
ansible all -m shell -a "pgrep -a java || echo 'Java not running'"
```

### System Maintenance

```bash
# Check available disk space and warn if below 10%
ansible all -m shell -a "df -h / | awk 'NR==2 {print \$5}' | tr -d '%'" --one-line

# Find large files
ansible all -m shell -a "find /var/log -type f -size +100M -exec ls -lh {} \\;" --become

# Check for pending reboots (Ubuntu)
ansible all -m shell -a "test -f /var/run/reboot-required && echo 'REBOOT NEEDED' || echo 'No reboot needed'"

# Check NTP synchronization
ansible all -m shell -a "timedatectl | grep 'System clock synchronized'"
```

## Security Considerations

Be careful with what you run through the shell module:

```bash
# AVOID: Running user-supplied input through the shell module
# This is vulnerable to command injection if 'username' comes from user input

# BETTER: Use the command module with separate arguments when possible
ansible all -m command -a "id deploy"

# AVOID: Embedding secrets in shell commands (they appear in logs)
# WRONG:
ansible all -m shell -a "mysql -u root -pMyPassword -e 'SHOW DATABASES;'"

# BETTER: Use appropriate modules
ansible databases -m mysql_db -a "login_user=root login_password=MyPassword name=all state=dump target=/tmp/dump.sql"
```

## Performance Tips

```bash
# Increase forks for running commands across many hosts
ansible all -a "uptime" -f 50

# Use --one-line for faster visual scanning of large outputs
ansible all -a "hostname" --one-line -f 50

# Limit to a subset for testing before running on all hosts
ansible all -a "dangerous_command" --limit web1.example.com
```

## Summary

Running shell commands via Ansible ad hoc is the fastest way to get information from or make quick changes across your infrastructure. Use the `command` module (the default) for simple commands that do not need shell features. Use the `shell` module when you need pipes, redirects, or variable expansion. Use `raw` for hosts without Python. Always consider using `--become` for privileged operations, `--one-line` for compact output, and `-f` to control parallelism. These commands are your first line of defense for troubleshooting and quick operations.
