# How to Use Molecule login for Interactive Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Debugging, Testing, DevOps

Description: Use Molecule login to interactively debug Ansible role issues by connecting to test instances for manual investigation and troubleshooting.

---

When a Molecule test fails, the error message does not always tell you the full story. Maybe a service failed to start, a configuration file has the wrong content, or a package dependency is missing. The `molecule login` command drops you into a shell session on the test instance, letting you poke around, check logs, and figure out what went wrong. It is the debugging equivalent of SSH-ing into a broken server, but in a throwaway test environment.

## Basic Usage

After creating and converging instances, log into one.

```bash
# Log into the default (or only) instance
molecule login

# Log into a specific instance by name
molecule login --host ubuntu2204

# Log into an instance in a specific scenario
molecule login --host rocky9 --scenario-name multi-os
```

This opens an interactive shell in the test instance. For Docker-based instances, it is equivalent to `docker exec -it <container> /bin/bash`. For Vagrant, it is `vagrant ssh`.

## The Debugging Workflow

The typical debugging workflow follows this pattern.

```bash
# 1. Run converge and see a failure
molecule converge
# TASK [Install application] *****
# fatal: FAILED! => {"msg": "Service myapp failed to start"}

# 2. Log into the instance to investigate
molecule login --host instance

# 3. Now you are inside the container/VM
# Check the service status
systemctl status myapp

# Check the logs
journalctl -u myapp --no-pager -l

# Check the config file
cat /etc/myapp/config.yml

# Check if dependencies are installed
which python3
pip list | grep required-package

# Check file permissions
ls -la /opt/myapp/

# Check network connectivity
curl -v http://localhost:8080/health

# 4. Exit when done
exit

# 5. Fix the role based on what you found
vim tasks/main.yml

# 6. Re-converge
molecule converge
```

## What You Can Do Inside the Instance

Once logged in, you have a full shell session. Here are common debugging tasks.

### Check Service Status and Logs

```bash
# Check if a service is running
systemctl status nginx

# View recent logs for a service
journalctl -u nginx --since "5 minutes ago"

# View all logs without pagination
journalctl -u nginx --no-pager -l

# Check if the service failed to start
systemctl is-failed nginx

# Try to start the service manually to see the error
systemctl start nginx
```

### Inspect Configuration Files

```bash
# Check if the file exists and has correct permissions
ls -la /etc/nginx/nginx.conf

# View the file content
cat /etc/nginx/nginx.conf

# Check if the config is valid
nginx -t

# Compare against what you expected
diff /etc/nginx/nginx.conf /tmp/expected-nginx.conf
```

### Check Package Installation

```bash
# Debian/Ubuntu
dpkg -l | grep nginx
apt list --installed | grep nginx

# RHEL/Rocky/CentOS
rpm -qa | grep nginx
yum list installed | grep nginx

# Check package version
apt-cache policy nginx
```

### Verify Network State

```bash
# Check listening ports
ss -tlnp

# Check if a specific port is listening
ss -tlnp | grep 8080

# Test HTTP endpoints
curl -v http://localhost:80/

# Check DNS resolution
dig myapp.example.com

# Check network interfaces
ip addr show

# Check routing
ip route
```

### Check File System

```bash
# Verify directory structure
find /opt/myapp -type f -ls

# Check disk usage
df -h

# Check if a mount is present
mount | grep /data

# Check file ownership and permissions
stat /etc/myapp/config.yml
```

### Check Running Processes

```bash
# See what is running
ps aux | grep myapp

# Check resource usage
top -bn1 | head -20

# Check open files for a process
lsof -p $(pgrep myapp)
```

### Test Ansible Modules Manually

You can even run Ansible commands manually inside the instance to test module behavior.

```bash
# Inside the instance
ansible localhost -m setup -a "filter=ansible_os_family"
ansible localhost -m package -a "name=nginx state=present" --check
```

## Debugging Multi-Instance Scenarios

When your scenario has multiple instances, you need to specify which one to log into.

```bash
# List available instances
molecule list

# Output:
# Instance Name    Driver Name    Created    Converged
# webserver        docker         true       true
# database         docker         true       true
# loadbalancer     docker         true       true

# Log into the web server
molecule login --host webserver

# Or the database
molecule login --host database
```

You can have multiple terminal windows, each logged into a different instance, to debug inter-instance communication.

```bash
# Terminal 1: log into webserver
molecule login --host webserver

# Terminal 2: log into database
molecule login --host database
```

From inside the webserver, test connectivity to the database.

```bash
# Inside the webserver instance
ping database
curl database:5432
telnet database 5432
```

## Keeping Instances Alive for Debugging

By default, `molecule test` destroys instances after completion (or failure). To keep them alive for debugging.

```bash
# Run test but do not destroy on failure
molecule test --destroy=never

# When a test fails, the instances stay running
# Log in and investigate
molecule login --host instance

# After debugging, clean up manually
molecule destroy
```

Alternatively, use the create/converge workflow which never destroys automatically.

```bash
# Create and converge (instances persist until you destroy)
molecule create
molecule converge

# Something fails? Log in
molecule login

# Fix and re-converge
molecule converge

# Done? Destroy
molecule destroy
```

## Running Ad-Hoc Commands

If you do not need a full shell session, you can run single commands using Ansible's ad-hoc mode.

```bash
# Run a command on all instances without logging in
ansible all -i molecule/default/.molecule/ansible_inventory.yml -m command -a "systemctl status nginx"

# Check a specific file
ansible all -i molecule/default/.molecule/ansible_inventory.yml -m command -a "cat /etc/nginx/nginx.conf"
```

Or use Docker/Podman exec directly.

```bash
# Find the container name
docker ps --filter "label=creator=molecule"

# Run a command in the container
docker exec molecule-instance systemctl status nginx

# Get a shell in the container (same as molecule login)
docker exec -it molecule-instance /bin/bash
```

## Debugging Common Failures

### Role Fails During Package Installation

```bash
molecule login
# Check package manager state
apt-get update  # maybe the cache is stale
apt-cache search package-name  # verify the package exists
cat /etc/apt/sources.list  # check repositories
```

### Service Fails to Start

```bash
molecule login
systemctl status myservice
journalctl -u myservice -n 50
# Check the config the role generated
cat /etc/myservice/config.yml
# Try starting manually
systemctl start myservice
# If it fails, check for missing dependencies
ldd /usr/bin/myservice
```

### Template Rendering Issues

```bash
molecule login
# Look at the generated file
cat /etc/myapp/config.yml
# Compare it to what you expected
# Check for encoding issues
file /etc/myapp/config.yml
# Check for trailing whitespace or hidden characters
cat -A /etc/myapp/config.yml
```

### Permission Problems

```bash
molecule login
# Check who the process runs as
ps aux | grep myapp
# Check file permissions
ls -la /etc/myapp/
ls -la /var/log/myapp/
# Check if SELinux is blocking
getenforce
ausearch -m AVC -ts recent
```

## Tips for Effective Debugging

1. **Log in before destroying.** If `molecule test` fails, re-run with `--destroy=never` so you can investigate.

2. **Check logs first.** The answer is usually in `journalctl` or application log files. Start there before checking configuration files.

3. **Reproduce manually.** If a task fails, try running the equivalent command manually inside the instance. The error message is often more descriptive.

4. **Compare to a working system.** If you have a system where the role works, compare the configuration and state between the working and broken instances.

5. **Use molecule converge to test fixes.** After finding the problem inside the instance, do not fix it manually. Instead, fix your role and re-converge. This ensures the fix is captured in code.

6. **Take notes.** When debugging a tricky issue, write down what you checked and what you found. This helps when writing the fix and when creating regression tests.

The `molecule login` command is the most underrated tool in the Molecule toolkit. It bridges the gap between "the test failed" and "I know exactly why." Use it liberally during development, and you will solve problems faster.
