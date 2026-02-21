# How to Use Ansible Ad Hoc Commands with Module Arguments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Modules, Configuration

Description: Master the syntax and patterns for passing arguments to Ansible modules in ad hoc commands, including key-value pairs, JSON, and complex arguments.

---

Every Ansible module accepts arguments that control its behavior. When you run an ad hoc command, you pass these arguments through the `-a` flag. Getting the argument syntax right is important because modules are picky about their parameters, and a small formatting mistake can cause confusing errors.

## Basic Key-Value Syntax

The most common way to pass arguments is as space-separated key=value pairs:

```bash
# Simple key-value pairs
ansible webservers -m copy -a "src=/tmp/config.yml dest=/etc/app/config.yml"

# Multiple parameters
ansible webservers -m user -a "name=deploy shell=/bin/bash groups=sudo append=yes"

# Boolean parameters
ansible all -m service -a "name=nginx state=started enabled=yes"

# Numeric parameters
ansible all -m file -a "path=/var/log/app mode=0755 state=directory"
```

## The Free-Form Argument

Some modules accept a "free form" argument, which means you can pass the main argument without a key name. The `command` and `shell` modules are the most common examples:

```bash
# The command module takes a free-form argument
# These two are equivalent:
ansible all -a "uptime"
ansible all -m command -a "uptime"

# The shell module also takes a free-form argument
ansible all -m shell -a "ps aux | grep nginx"

# The script module accepts a script path as free-form
ansible all -m script -a "/opt/scripts/check_health.sh"

# The raw module accepts commands as free-form
ansible all -m raw -a "cat /etc/os-release"
```

But most modules require explicit key=value pairs:

```bash
# The copy module requires named parameters
ansible all -m copy -a "src=./config.yml dest=/etc/app/config.yml"

# The file module requires named parameters
ansible all -m file -a "path=/tmp/testdir state=directory"

# The apt module requires named parameters
ansible all -m apt -a "name=nginx state=present" --become
```

## Quoting and Special Characters

When your argument values contain spaces, special characters, or shell metacharacters, quoting gets tricky. Here are the patterns that work:

```bash
# Values with spaces need inner quotes
ansible all -m user -a "name=deploy comment='Deploy User Account' shell=/bin/bash"

# Or use double quotes inside single-quoted argument string
ansible all -m user -a 'name=deploy comment="Deploy User Account" shell=/bin/bash'

# Values with equals signs need quoting
ansible all -m shell -a "echo 'DATABASE_URL=postgres://localhost/mydb' >> /etc/environment"

# JSON values need careful quoting
ansible all -m copy -a 'content={"key": "value", "port": 8080} dest=/etc/app/config.json'

# Multiline content with the shell module
ansible all -m shell -a "printf 'line1\nline2\nline3\n' > /tmp/multiline.txt"
```

## Complex Arguments with JSON

For modules that accept complex data structures (lists, nested dicts), you can pass arguments as JSON using the `-a` flag with a JSON string:

```bash
# Pass a list of packages to the apt module
ansible all -m apt -a '{"name": ["nginx", "curl", "htop"], "state": "present"}' --become

# Pass complex arguments to the template module
ansible all -m template -a '{"src": "nginx.conf.j2", "dest": "/etc/nginx/nginx.conf", "owner": "root", "mode": "0644"}'
```

## Using Extra Variables with -e

The `-e` flag (or `--extra-vars`) lets you pass variables that can be referenced in module arguments:

```bash
# Pass a variable and use it in the module argument
ansible all -m user -a "name={{ username }}" -e "username=deploy" --become

# Pass multiple variables
ansible all -m copy -a "src={{ src_file }} dest={{ dest_path }}" -e "src_file=./config.yml dest_path=/etc/app/config.yml"

# Pass variables as JSON
ansible all -m user -a "name={{ user_name }} groups={{ user_groups }}" -e '{"user_name": "deploy", "user_groups": "sudo,docker"}'

# Use extra vars for dynamic host selection too
ansible "{{ target_group }}" -m ping -e "target_group=webservers"
```

## Common Module Argument Patterns

### File Operations

```bash
# Create a directory with specific permissions
ansible all -m file -a "path=/opt/app/logs state=directory owner=www-data group=www-data mode=0755" --become

# Create a symbolic link
ansible all -m file -a "src=/opt/app/releases/v2.1 dest=/opt/app/current state=link"

# Set permissions recursively
ansible all -m file -a "path=/opt/app/shared state=directory recurse=yes owner=deploy group=deploy"

# Delete a file
ansible all -m file -a "path=/tmp/old_backup.tar.gz state=absent"
```

### Package Management

```bash
# Install with cache update
ansible all -m apt -a "name=nginx state=present update_cache=yes cache_valid_time=3600" --become

# Install a specific version
ansible all -m apt -a "name=nodejs=18.19.0-1nodesource1 state=present" --become

# Install from a .deb file
ansible all -m apt -a "deb=/tmp/custom-package.deb" --become
```

### Service Management

```bash
# Full service configuration in one command
ansible all -m systemd -a "name=nginx state=restarted enabled=yes daemon_reload=yes" --become
```

### Line in File

```bash
# Add or update a line in a configuration file
ansible all -m lineinfile -a "path=/etc/ssh/sshd_config regexp='^PermitRootLogin' line='PermitRootLogin no'" --become

# Add a line if it does not exist
ansible all -m lineinfile -a "path=/etc/environment line='APP_ENV=production' create=yes" --become

# Remove a line matching a pattern
ansible all -m lineinfile -a "path=/etc/hosts regexp='.*oldserver.*' state=absent" --become
```

### Cron Jobs

```bash
# Add a cron job
ansible all -m cron -a "name='backup database' minute=0 hour=2 job='/opt/scripts/backup.sh >> /var/log/backup.log 2>&1'" --become

# Add a cron job for a specific user
ansible databases -m cron -a "name='vacuum database' minute=30 hour=3 user=postgres job='psql -c \"VACUUM ANALYZE;\" mydb'" --become

# Remove a cron job by name
ansible all -m cron -a "name='old backup job' state=absent" --become
```

## Discovering Module Arguments

To find out what arguments a module accepts, use the `ansible-doc` command:

```bash
# Show full documentation for a module
ansible-doc copy

# Show a short usage summary
ansible-doc -s copy

# List all available modules
ansible-doc -l

# Search for modules by keyword
ansible-doc -l | grep -i "file"
```

The documentation shows required parameters (marked with `required: true`), default values, accepted choices, and examples.

## Argument Validation

Ansible validates module arguments before execution. If you pass an unknown parameter or an invalid value, you get a clear error:

```bash
# This will fail because 'source' is not a valid parameter (it should be 'src')
ansible all -m copy -a "source=./file dest=/tmp/file"
# ERROR: Unsupported parameters for (copy) module: source. Supported parameters include: ...

# This will fail because 'running' is not a valid state
ansible all -m service -a "name=nginx state=running"
# ERROR: value of state must be one of: started, stopped, restarted, reloaded
```

## Debugging Module Arguments

When arguments are not working as expected, increase verbosity:

```bash
# Show the exact module invocation
ansible webservers -m copy -a "src=./config.yml dest=/etc/app/config.yml" -v

# Show the full module arguments and return data
ansible webservers -m copy -a "src=./config.yml dest=/etc/app/config.yml" -vvv
```

At `-vvv` verbosity, Ansible shows the exact JSON that gets sent to the module on the remote host, which helps debug argument formatting issues.

## Summary

Mastering module arguments is essential for effective ad hoc command usage. Use space-separated key=value pairs for simple arguments, quote values that contain spaces or special characters, use JSON format for complex data structures, and leverage `-e` for dynamic variable substitution. Always check module documentation with `ansible-doc` when you are unsure about available parameters, and use `-v` flags to debug argument issues. With these patterns, you can use any Ansible module directly from the command line.
