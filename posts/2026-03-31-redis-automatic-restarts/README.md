# How to Set Up Redis Automatic Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Systemd, Availability, Restart, Operation

Description: Configure Redis to restart automatically on failure using systemd, with restart policies, health checks, and alerting for restart events in production.

---

Redis is generally very stable, but hardware faults, OOM kills, or configuration errors can cause it to exit unexpectedly. Configuring automatic restarts through systemd ensures Redis comes back up without manual intervention, minimizing downtime.

## systemd Restart Policy

The `Restart=` directive in the systemd unit file controls automatic restart behavior:

```bash
sudo systemctl edit redis
```

Add or override the restart settings:

```text
[Service]
Restart=always
RestartSec=5
StartLimitIntervalSec=120
StartLimitBurst=5
```

Options:
- `Restart=always` - restart on any exit, including clean shutdowns.
- `Restart=on-failure` - restart only on non-zero exit codes or signals (safer - avoids restart loops on intentional stops).
- `RestartSec=5` - wait 5 seconds before restarting (prevents tight crash loops).
- `StartLimitBurst=5` / `StartLimitIntervalSec=120` - allow at most 5 restarts in 120 seconds before systemd gives up.

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart redis
```

## Recommended Production Configuration

```text
[Service]
Restart=on-failure
RestartSec=10
StartLimitIntervalSec=300
StartLimitBurst=3
```

This allows 3 restart attempts within 5 minutes, which handles transient issues without masking persistent problems.

## Verify Restart Behavior

Test that Redis restarts after an unexpected kill:

```bash
# Get the Redis PID
redis-cli info server | grep process_id
# process_id:12345

# Send SIGKILL (cannot be caught - simulates OOM kill)
sudo kill -9 12345

# Wait a few seconds, then check
sleep 10
systemctl status redis
redis-cli ping
# PONG
```

## Viewing Restart History

```bash
# Show systemd journal for Redis including restarts
journalctl -u redis --since "1 hour ago" | grep -E "Start|Stop|Restart|kill|OOM"
```

## Alerting on Persistent Failures

Set up an alert when Redis fails permanently (after all restart attempts are exhausted) by using a systemd `OnFailure` directive. Create a notification script:

```bash
sudo tee /usr/local/bin/notify-redis-restart.sh > /dev/null <<'EOF'
#!/bin/bash
echo "Redis failed at $(date) after exhausting all restart attempts" | mail -s "Redis Failure Alert" ops@example.com
EOF
sudo chmod +x /usr/local/bin/notify-redis-restart.sh
```

Create an alert service:

```bash
sudo tee /etc/systemd/system/redis-restart-alert.service > /dev/null <<'EOF'
[Unit]
Description=Alert on Redis failure

[Service]
Type=oneshot
ExecStart=/usr/local/bin/notify-redis-restart.sh
EOF
```

Add `OnFailure` to the Redis unit override:

```bash
sudo systemctl edit redis
```

```text
[Unit]
OnFailure=redis-restart-alert.service
```

```bash
sudo systemctl daemon-reload
```

## Preventing Restart Loops from Configuration Errors

If Redis fails to start due to a bad config, `Restart=always` will loop indefinitely. Use `ExecStartPre` to validate config before starting:

```text
[Service]
ExecStartPre=/usr/local/bin/redis-server /etc/redis/redis.conf --test-memory 0
```

Or add a config check step:

```bash
# Validate config manually
redis-server /etc/redis/redis.conf --test-memory 0
echo $?   # 0 = OK
```

## Summary

Configure Redis automatic restarts via `Restart=on-failure` and `RestartSec=10` in the systemd unit file. Use `StartLimitBurst` and `StartLimitIntervalSec` to prevent infinite restart loops on persistent failures. Monitor restart events with `journalctl -u redis`, and add an `OnFailure` service to send alerts when Redis fails permanently after exhausting all restart attempts.
