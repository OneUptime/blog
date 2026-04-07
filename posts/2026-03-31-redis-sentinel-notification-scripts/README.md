# How to Configure Sentinel Notification Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Notification, Script, Automation

Description: Learn how to configure Redis Sentinel notification and client-reconfig scripts to automate responses to failover events and alert your team.

---

Redis Sentinel supports two types of scripts: notification scripts (called when events occur) and client-reconfig scripts (called when clients need to reconfigure after failover). These let you automate alerting and topology updates without polling.

## Notification Script

The notification script is called for important Sentinel events (primary down, failover, etc.):

```bash
# sentinel.conf
sentinel notification-script mymaster /usr/local/bin/sentinel-notify.sh
```

Sentinel calls the script with two arguments:

```text
$1 = event type (e.g., "+sdown", "+switch-master", "-odown")
$2 = event description
```

Example notification script:

```bash
#!/bin/bash
# /usr/local/bin/sentinel-notify.sh

EVENT_TYPE=$1
EVENT_DESC=$2
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log all events
echo "$TIMESTAMP EVENT=$EVENT_TYPE DESC=$EVENT_DESC" >> /var/log/redis/sentinel-events.log

# Alert on critical events only
case $EVENT_TYPE in
  +odown|+switch-master|+failover-end|-odown)
    curl -s -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
      -H 'Content-type: application/json' \
      --data "{\"text\": \"Redis Sentinel: $EVENT_TYPE - $EVENT_DESC\"}"
    ;;
esac
```

Make the script executable:

```bash
chmod +x /usr/local/bin/sentinel-notify.sh
```

## Client Reconfig Script

The client-reconfig script is called after a failover when clients need to update their configuration (e.g., HAProxy, connection pools):

```bash
# sentinel.conf
sentinel client-reconfig-script mymaster /usr/local/bin/sentinel-reconfig.sh
```

Sentinel calls it with seven arguments:

```text
$1 = master name
$2 = role (leader or observer)
$3 = state (start, end, abort)
$4 = from-ip (old primary IP)
$5 = from-port (old primary port)
$6 = to-ip (new primary IP)
$7 = to-port (new primary port)
```

Example reconfig script that updates HAProxy:

```bash
#!/bin/bash
# /usr/local/bin/sentinel-reconfig.sh

MASTER_NAME=$1
ROLE=$2
STATE=$3
FROM_IP=$4
FROM_PORT=$5
TO_IP=$6
TO_PORT=$7

if [ "$STATE" = "end" ] && [ "$ROLE" = "leader" ]; then
  echo "Failover complete: $MASTER_NAME moved from $FROM_IP:$FROM_PORT to $TO_IP:$TO_PORT"

  # Update HAProxy config
  sed -i "s/server redis-primary $FROM_IP:$FROM_PORT/server redis-primary $TO_IP:$TO_PORT/" \
    /etc/haproxy/haproxy.cfg

  # Reload HAProxy
  systemctl reload haproxy

  echo "HAProxy updated and reloaded"
fi
```

## Script Execution Rules

Sentinel has safeguards for script execution:

```bash
# sentinel.conf
# Max time a script can run before being killed (default 60000ms = 60s)
sentinel script-max-runtime 60000

# If script returns exit code 1, it is retried up to 10 times
# If script returns exit code 2, it is considered permanent failure
```

Scripts must return within the timeout. Long-running scripts can block Sentinel operations.

## Testing Scripts

Simulate events to test your scripts:

```bash
# Simulate primary going down
redis-cli -p 26379 SENTINEL simulate-failure crash-after-election

# Watch script execution
tail -f /var/log/redis/sentinel-events.log
```

## Viewing Configured Scripts

```bash
redis-cli -p 26379 SENTINEL masters
# Look for "notification-script" and "client-reconfig-script" fields
```

## Summary

Redis Sentinel notification scripts fire on important events (use them for alerting), while client-reconfig scripts fire after successful failover (use them for updating load balancers and connection pools). Keep scripts fast (under 60 seconds), return exit code 1 for retryable failures, and test them before production deployment.
