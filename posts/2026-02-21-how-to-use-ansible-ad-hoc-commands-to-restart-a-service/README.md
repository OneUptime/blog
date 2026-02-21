# How to Use Ansible Ad Hoc Commands to Restart a Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Service Restart, Systemd

Description: Learn how to safely restart services across your server fleet using Ansible ad hoc commands, including rolling restarts and health checks.

---

Restarting a service sounds simple, but doing it across multiple servers while maintaining availability requires some thought. You need to consider the order of restarts, whether to do them all at once or one by one, how to verify the service came back healthy, and what to do if something goes wrong. Ansible ad hoc commands give you precise control over all of this.

## Basic Service Restart

The simplest restart command:

```bash
# Restart nginx on all web servers
ansible webservers -m service -a "name=nginx state=restarted" --become
```

Output:

```
web1 | CHANGED => {
    "changed": true,
    "name": "nginx",
    "state": "started",
    "status": {
        "ActiveState": "active",
        ...
    }
}
web2 | CHANGED => {
    "changed": true,
    "name": "nginx",
    "state": "started",
    ...
}
```

## Restart vs Reload

Not every configuration change requires a full restart. Many services support reloading their configuration without dropping connections:

```bash
# Reload (graceful - no downtime, re-reads config)
ansible webservers -m service -a "name=nginx state=reloaded" --become

# Restart (full stop and start - brief downtime)
ansible webservers -m service -a "name=nginx state=restarted" --become
```

When to reload vs restart:
- **Reload** when you changed a configuration file and the service supports graceful reload (nginx, Apache, HAProxy, PostgreSQL for some settings)
- **Restart** when you updated the binary, changed a setting that requires restart, or the service is misbehaving

```bash
# Reload nginx after config change
ansible webservers -m service -a "name=nginx state=reloaded" --become

# Reload PostgreSQL after postgresql.conf change
ansible databases -m service -a "name=postgresql state=reloaded" --become

# Reload sshd after sshd_config change
ansible all -m service -a "name=sshd state=reloaded" --become
```

## Rolling Restarts

Restarting all servers simultaneously causes a full outage. Rolling restarts maintain availability by restarting one server (or a small batch) at a time:

```bash
# Restart one server at a time (serial)
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1

# Restart in batches of 2
ansible webservers -m service -a "name=nginx state=restarted" --become -f 2

# Restart in batches of 3
ansible webservers -m service -a "name=nginx state=restarted" --become -f 3
```

Using `-f 1` means Ansible waits for each server to finish before moving to the next. This is the safest approach when you have a load balancer distributing traffic.

## Pre-Restart Checks

Before restarting, validate that the configuration is correct:

```bash
# Test nginx config before restarting
ansible webservers -m shell -a "nginx -t" --become

# Test Apache config
ansible webservers -m shell -a "apachectl configtest" --become

# Test HAProxy config
ansible loadbalancers -m shell -a "haproxy -c -f /etc/haproxy/haproxy.cfg" --become

# If config test passes, then restart
ansible webservers -m shell -a "nginx -t" --become && \
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1
```

## Post-Restart Verification

After restarting, verify the service is actually healthy:

```bash
# Step 1: Restart the service
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1

# Step 2: Check the service is active
ansible webservers -m shell -a "systemctl is-active nginx"

# Step 3: Check the service is listening on the expected port
ansible webservers -m shell -a "ss -tlnp | grep ':80'" --become

# Step 4: Check the service responds to requests
ansible webservers -m shell -a "curl -s -o /dev/null -w '%{http_code}' http://localhost/"

# Step 5: Check for errors in recent logs
ansible webservers -m shell -a "journalctl -u nginx --since '2 minutes ago' -p err --no-pager"
```

## Complete Rolling Restart Workflow

Here is a production-quality restart workflow:

```bash
#!/bin/bash
# rolling_restart.sh - Safely restart a service across a fleet
# Usage: ./rolling_restart.sh <service_name> <host_group> [inventory]

SERVICE=${1:-nginx}
GROUP=${2:-webservers}
INVENTORY=${3:-inventory/production.ini}

echo "Rolling restart of $SERVICE on $GROUP"
echo "======================================"

# Get the list of hosts
HOSTS=$(ansible "$GROUP" -i "$INVENTORY" --list-hosts 2>/dev/null | tail -n +2 | tr -d ' ')

for HOST in $HOSTS; do
    echo ""
    echo "--- Restarting $SERVICE on $HOST ---"

    # Restart the service
    ansible "$HOST" -i "$INVENTORY" -m service -a "name=$SERVICE state=restarted" --become
    RESTART_RC=$?

    if [ $RESTART_RC -ne 0 ]; then
        echo "ERROR: Failed to restart $SERVICE on $HOST"
        echo "Stopping rolling restart. Investigate the issue."
        exit 1
    fi

    # Wait a moment for the service to stabilize
    sleep 3

    # Verify the service is running
    ansible "$HOST" -i "$INVENTORY" -m shell -a "systemctl is-active $SERVICE"
    CHECK_RC=$?

    if [ $CHECK_RC -ne 0 ]; then
        echo "ERROR: $SERVICE failed to start on $HOST"
        echo "Stopping rolling restart. Investigate the issue."
        exit 1
    fi

    echo "$HOST: $SERVICE restarted successfully"
done

echo ""
echo "Rolling restart complete. All hosts restarted successfully."
```

## Restarting with Systemd Module

The `systemd` module gives you additional control over systemd-specific features:

```bash
# Restart with daemon reload (needed after modifying unit files)
ansible appservers -m systemd -a "name=myapp state=restarted daemon_reload=yes" --become

# Restart and ensure enabled on boot
ansible appservers -m systemd -a "name=myapp state=restarted enabled=yes" --become

# Force a restart even if the service is in a failed state
ansible appservers -m systemd -a "name=myapp state=restarted" --become
```

## Restarting Dependent Services

Some services depend on others. Restart them in the correct order:

```bash
# Restart a full application stack in order
# 1. Restart the database
ansible databases -m service -a "name=postgresql state=restarted" --become

# 2. Wait for the database to be ready
ansible databases -m shell -a "pg_isready -h localhost -p 5432" --become --become-user=postgres

# 3. Restart the application
ansible appservers -m service -a "name=myapp state=restarted" --become

# 4. Wait for the app to be ready
sleep 5
ansible appservers -m shell -a "curl -s http://localhost:3000/health"

# 5. Restart the web server (reverse proxy)
ansible webservers -m service -a "name=nginx state=reloaded" --become
```

## Handling Failed Restarts

When a restart fails, you need to investigate quickly:

```bash
# Check why the service failed to start
ansible web2.example.com -m shell -a "systemctl status nginx" --become

# View the full journal for the service
ansible web2.example.com -m shell -a "journalctl -u nginx --no-pager -n 50" --become

# Check for configuration errors
ansible web2.example.com -m shell -a "nginx -t" --become

# Check for port conflicts
ansible web2.example.com -m shell -a "ss -tlnp | grep ':80'" --become

# Try to start the service in foreground for debugging
ansible web2.example.com -m shell -a "nginx -t && nginx -g 'daemon off;' &" --become
```

## Restart with Timeout

For services that are slow to start, you may need to adjust timeouts:

```bash
# Set a longer timeout for service restart
ansible databases -m shell -a "systemctl restart postgresql && sleep 10 && systemctl is-active postgresql" --become

# Or use systemd's TimeoutStartSec
ansible appservers -m shell -a "systemctl restart myapp" --become -e "ansible_command_timeout=120"
```

## Scheduling Restarts

Sometimes you need to schedule a restart for a maintenance window:

```bash
# Schedule a restart using the at command
ansible webservers -m shell -a "echo 'systemctl restart nginx' | at 02:00" --become

# Or use a one-shot systemd timer
ansible webservers -m shell -a "systemd-run --on-calendar='2026-02-22 02:00:00' systemctl restart nginx" --become

# Verify scheduled jobs
ansible webservers -m shell -a "atq" --become
```

## Monitoring After Restart

After completing restarts, keep an eye on things:

```bash
# Check resource usage after restart
ansible webservers -m shell -a "ps -C nginx -o pid,rss,%mem,%cpu,etime | head -10"

# Verify no error logs are appearing
ansible webservers -m shell -a "journalctl -u nginx --since '5 minutes ago' -p warning --no-pager"

# Check response times
ansible webservers -m shell -a "curl -w 'Response time: %{time_total}s\n' -s -o /dev/null http://localhost/"

# Verify the service version (if applicable)
ansible webservers -m shell -a "nginx -v 2>&1"
```

## Summary

Restarting services with Ansible ad hoc commands is more than just running `state=restarted`. Use reload when possible to avoid downtime. Use rolling restarts with `-f 1` for zero-downtime deployments. Always validate configuration before restarting, verify health after restarting, and have a plan for when restarts fail. The combination of pre-checks, controlled parallelism, and post-restart verification makes the difference between a smooth operation and an extended outage.
