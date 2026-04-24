# How to Troubleshoot RabbitMQ Not Listening on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, IPv4, Troubleshooting, Listeners, Debug, Messaging

Description: Diagnose and fix RabbitMQ not listening on the expected IPv4 address or port, including Erlang startup failures, port conflicts, and binding configuration issues.

## Introduction

When RabbitMQ isn't accessible, the issue is typically one of: the service failed to start (Erlang error), the binding configuration is wrong, the port is in use, or a firewall is blocking access. Systematic diagnosis from service status through network analysis resolves most issues.

## Step-by-Step Diagnosis

```bash
# Step 1: Is RabbitMQ running?

sudo systemctl status rabbitmq-server

# Step 2: What does RabbitMQ report?
sudo rabbitmq-diagnostics status
sudo rabbitmq-diagnostics listeners

# Step 3: What ports is it listening on?
sudo ss -tlnp | grep -E ":5672|:15672|:25672|beam"

# Step 4: Check logs
sudo tail -50 /var/log/rabbitmq/rabbit@*.log
```

## Common Issues and Fixes

### Issue: Service fails to start

```bash
# Check the startup log
sudo journalctl -u rabbitmq-server --since "10 minutes ago"

# Common causes:
# 1. Port already in use
sudo lsof -i :5672
# Kill or move the conflicting service

# 2. Erlang cookie mismatch (cluster setup)
sudo cat /var/lib/rabbitmq/.erlang.cookie
# Must match on all cluster nodes

# 3. File permissions
sudo ls -la /var/lib/rabbitmq/
sudo chown -R rabbitmq:rabbitmq /var/lib/rabbitmq/
```

### Issue: Listening on Wrong IP

```bash
# Check what's configured
sudo rabbitmq-diagnostics listeners
# or
sudo ss -tlnp | grep 5672

# If listening on 0.0.0.0 but should be specific IP for AMQP:
# /etc/rabbitmq/rabbitmq.conf
# listeners.tcp.1 = 10.0.0.5:5672
# distribution.listener.interface = 10.0.0.5  # for inter-node / CLI traffic on 25672

# If listening on wrong IP:
sudo grep -E "listeners\.tcp|distribution\.listener\.interface" /etc/rabbitmq/rabbitmq.conf

sudo systemctl restart rabbitmq-server
```

### Issue: Port Conflict

```bash
# Check what's using port 5672
sudo lsof -i :5672
sudo fuser -v 5672/tcp

# Kill conflicting process (if it's safe to do so)
sudo fuser -k -TERM 5672/tcp

# Start RabbitMQ
sudo systemctl start rabbitmq-server
```

### Issue: Firewall Blocking

```bash
# Check firewall
sudo ufw status | grep -E "5672|15672"
sudo iptables -L INPUT -n | grep 5672

# Test connectivity
nc -zv 10.0.0.5 5672

# Add rule if missing
sudo ufw allow from 10.0.0.0/24 to any port 5672
```

## RabbitMQ Diagnostic Commands

```bash
# Full status report
sudo rabbitmq-diagnostics status

# Check expected AMQP listener
sudo rabbitmq-diagnostics check_port_listener 5672

# Log level (increase for debugging)
sudo rabbitmqctl set_log_level debug

# Watch logs in real-time
sudo rabbitmq-diagnostics log_tail_stream

# Check whether listener ports accept new TCP connections
sudo rabbitmq-diagnostics check_port_connectivity

# Verify management plugin (if enabled locally)
curl -s -u guest:guest http://127.0.0.1:15672/api/overview | python3 -m json.tool
```

## Reset and Reinitialize

```bash
# If you intentionally need to reset the node state (this does not reset rabbitmq.conf)
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl start_app

# Check after reset
sudo rabbitmq-diagnostics listeners
```

## Conclusion

RabbitMQ troubleshooting starts with `systemctl status` and `rabbitmq-diagnostics listeners`. Check the Erlang logs for startup failures, confirm the binding configuration matches expected IPs, verify no port conflicts exist, and test firewall rules with `nc`. The `rabbitmq-diagnostics` tool provides comprehensive information about the broker's current state and network configuration.
