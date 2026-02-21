# How to Use Ansible Ad Hoc Commands to Manage Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Service Management, Systemd

Description: Learn how to start, stop, restart, and manage services across your infrastructure using Ansible ad hoc commands with the service and systemd modules.

---

When a service goes down at 2 AM or you need to roll out a restart across your web server fleet, you do not want to SSH into each machine one by one. Ansible ad hoc commands give you the ability to manage services across hundreds of hosts with a single command. Whether you are using systemd, SysVinit, or another init system, Ansible has you covered.

## The Service Module

The `service` module is the primary tool for managing services. It works across different init systems (systemd, SysVinit, Upstart) by auto-detecting what the target host uses.

```bash
# Start a service
ansible webservers -m service -a "name=nginx state=started" --become

# Stop a service
ansible webservers -m service -a "name=nginx state=stopped" --become

# Restart a service
ansible webservers -m service -a "name=nginx state=restarted" --become

# Reload a service (reload config without full restart)
ansible webservers -m service -a "name=nginx state=reloaded" --become
```

The `--become` flag is required because service management needs root privileges on most systems.

## Ensuring Services Start on Boot

Beyond starting and stopping services, you often need to control whether they start automatically after a reboot:

```bash
# Enable a service to start on boot
ansible all -m service -a "name=nginx enabled=yes" --become

# Disable a service from starting on boot
ansible all -m service -a "name=cups enabled=no" --become

# Start a service AND enable it on boot in one command
ansible webservers -m service -a "name=nginx state=started enabled=yes" --become

# Stop a service AND disable it from starting on boot
ansible all -m service -a "name=bluetooth state=stopped enabled=no" --become
```

## Checking Service Status

Before making changes, check the current state of services:

```bash
# Check the status of a service (using shell module)
ansible webservers -m shell -a "systemctl status nginx" --become

# Get a one-line status across all hosts
ansible webservers -m shell -a "systemctl is-active nginx"

# Check if a service is enabled on boot
ansible all -m shell -a "systemctl is-enabled nginx"

# List all running services
ansible webservers -m shell -a "systemctl list-units --type=service --state=running"

# List all failed services
ansible all -m shell -a "systemctl list-units --type=service --state=failed"
```

## The Systemd Module

For hosts running systemd (which is most modern Linux distributions), you can use the `systemd` module for more specific control:

```bash
# Reload the systemd daemon (needed after modifying unit files)
ansible all -m systemd -a "daemon_reload=yes" --become

# Start a service using systemd specifically
ansible webservers -m systemd -a "name=nginx state=started" --become

# Restart and enable a service
ansible webservers -m systemd -a "name=nginx state=restarted enabled=yes" --become

# Mask a service (prevent it from being started at all)
ansible all -m systemd -a "name=cups masked=yes" --become

# Unmask a service
ansible all -m systemd -a "name=cups masked=no" --become
```

The difference between `service` and `systemd` modules is that `systemd` provides systemd-specific features like daemon reload and service masking. If your hosts all run systemd, the `systemd` module gives you more control. If you have mixed init systems, stick with `service`.

## Practical Scenarios

### Rolling Restart of Web Servers

When you need to restart nginx across your fleet without taking everything down at once:

```bash
# Restart nginx on web servers with limited parallelism
# Using -f 1 means one host at a time (serial restart)
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1

# Or restart in batches of 3
ansible webservers -m service -a "name=nginx state=restarted" --become -f 3
```

Setting `-f 1` ensures only one server restarts at a time. Your load balancer will route traffic to the remaining servers while each one restarts.

### Deploying a New Service

After copying a new systemd unit file, you need to reload the daemon and start the service:

```bash
# Step 1: Copy the unit file
ansible appservers -m copy -a "src=./myapp.service dest=/etc/systemd/system/myapp.service" --become

# Step 2: Reload systemd to pick up the new unit file
ansible appservers -m systemd -a "daemon_reload=yes" --become

# Step 3: Start and enable the service
ansible appservers -m systemd -a "name=myapp state=started enabled=yes" --become

# Step 4: Verify it is running
ansible appservers -m shell -a "systemctl status myapp | head -10" --become
```

### Emergency Stop of a Compromised Service

If you detect a compromised service, stop it everywhere immediately:

```bash
# Stop the service with maximum parallelism
ansible all -m service -a "name=suspicious-service state=stopped" --become -f 50

# Disable it so it does not restart on reboot
ansible all -m service -a "name=suspicious-service enabled=no" --become -f 50

# Verify it is stopped everywhere
ansible all -m shell -a "systemctl is-active suspicious-service" -f 50
```

### Checking Service Health After Deployment

```bash
# Verify all critical services are running after a deployment
ansible webservers -m shell -a "for svc in nginx php-fpm redis; do echo \"$svc: $(systemctl is-active $svc)\"; done"
```

Output:

```
web1 | CHANGED | rc=0 >>
nginx: active
php-fpm: active
redis: active

web2 | CHANGED | rc=0 >>
nginx: active
php-fpm: active
redis: active
```

## Managing Multiple Services

When you need to manage several related services at once:

```bash
# Start a stack of services
ansible appservers -m shell -a "systemctl start postgresql redis nginx" --become

# Stop everything in reverse order
ansible appservers -m shell -a "systemctl stop nginx redis postgresql" --become

# Check multiple services at once
ansible all -m shell -a "systemctl is-active nginx postgresql redis" --become
```

For a more Ansible-native approach, you would use a playbook with a loop, but for quick operations, the shell module works fine.

## Working with Service Logs

After restarting a service, you often need to check if it started cleanly:

```bash
# View the last 20 lines of a service's journal
ansible webservers -m shell -a "journalctl -u nginx --no-pager -n 20"

# View logs since the last boot
ansible webservers -m shell -a "journalctl -u nginx --no-pager -b"

# View logs from the last 5 minutes
ansible webservers -m shell -a "journalctl -u nginx --no-pager --since '5 minutes ago'"

# Check for errors in service logs
ansible webservers -m shell -a "journalctl -u nginx --no-pager -p err -n 10"
```

## Handling Service Dependencies

Some services depend on others. Here is how to handle a database-backed application:

```bash
# Restart in the correct order: database first, then application
ansible databases -m service -a "name=postgresql state=restarted" --become
ansible appservers -m service -a "name=myapp state=restarted" --become

# Verify the chain is healthy
ansible databases -m shell -a "systemctl is-active postgresql"
ansible appservers -m shell -a "systemctl is-active myapp"
ansible webservers -m shell -a "systemctl is-active nginx"
```

## Checking Service Port Binding

After starting a service, verify it is actually listening on the expected port:

```bash
# Check if nginx is listening on port 80
ansible webservers -m shell -a "ss -tlnp | grep ':80'" --become

# Check if the application is listening on its configured port
ansible appservers -m shell -a "ss -tlnp | grep ':3000'" --become

# Full connectivity check
ansible webservers -m shell -a "curl -s -o /dev/null -w '%{http_code}' http://localhost:80"
```

## Summary

Ansible ad hoc commands for service management let you control services across your entire infrastructure from a single terminal session. Use the `service` module for cross-platform compatibility, the `systemd` module for systemd-specific features, and the `shell` module for quick status checks and log inspection. Control restart parallelism with the `-f` flag for rolling restarts, and always verify service health after making changes. These patterns form the foundation of reliable infrastructure operations.
