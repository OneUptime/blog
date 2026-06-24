# How to Monitor Postfix Mail Queue from IPv4 Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Mail Queue, Monitoring, IPv4, Linux, Email, Operation

Description: Learn how to monitor the Postfix mail queue to identify stuck messages, per-source statistics, and delivery failures from IPv4 senders.

---

The Postfix mail queue holds messages awaiting delivery. Monitoring queue depth, identifying stuck messages, and correlating mail logs with source IPv4 clients is essential for keeping a mail server healthy.

## Viewing the Queue

```bash
# Show a brief summary of the queue

mailq
# or equivalently:
postqueue -p

# Count queued messages (Postfix 3.1+)
postqueue -j | awk 'END { print NR+0 }'

# Count messages currently in the deferred queue (Postfix 3.1+)
postqueue -j | grep -E -c '"queue_name"[[:space:]]*:[[:space:]]*"deferred"'
```

## Filtering the Queue by Source IPv4

`postqueue -p` and `postqueue -j` show sender and recipient data, but not the SMTP client IP address. Use mail logs when you need source IPv4 details.

```bash
# Show queue entries for a specific sender address
postqueue -j | grep -E '"sender"[[:space:]]*:[[:space:]]*"sender@domain\.com"'

# Show queue entries for a specific sender domain
postqueue -j | grep -E '"sender"[[:space:]]*:[[:space:]]*"[^"]+@domain\.com"'

# Show log entries for a specific source IPv4 address
grep 'client=.*\[192\.168\.1\.50\]' /var/log/mail.log

# List source IPv4 addresses seen in Postfix logs
grep -oP 'client=[^[]+\[\K\d+\.\d+\.\d+\.\d+' /var/log/mail.log | sort | uniq -c | sort -rn
```

## Queue Statistics

```bash
# Summary of Postfix daemon status
postfix status

# Get detailed mail transport statistics
pflogsumm /var/log/mail.log | head -50

# Install pflogsumm if not available (Debian/Ubuntu)
apt install pflogsumm -y
```

## Inspecting Individual Messages

```bash
# View a queued message by queue ID
postcat -q QUEUE_ID

# Example: view the headers of the message with ID 3F8D21234
postcat -hq 3F8D21234 | head -30
```

## Flushing or Deleting Stuck Messages

```bash
# Attempt immediate delivery of queued mail
postqueue -f

# Flush deferred mail through the Postfix control command
postfix flush

# Delete all queued messages (use with caution!)
postsuper -d ALL

# Delete messages in the deferred queue only
postsuper -d ALL deferred

# Delete a specific message by queue ID
postsuper -d 3F8D21234

# Requeue all deferred messages for reprocessing
postsuper -r ALL deferred
```

## Monitoring Queue Size Over Time

```bash
#!/bin/bash
# queue_monitor.sh - Log queue size every minute
while true; do
    QUEUE=$(postqueue -j 2>/dev/null | awk 'END { print NR+0 }')
    echo "$(date '+%Y-%m-%d %H:%M:%S') queue_size=$QUEUE" >> /var/log/postfix_queue.log
    sleep 60
done
```

## Alerting with OneUptime

For production environments, send queue state to a OneUptime Incoming Request monitor and configure alerting on the heartbeat interval or request body.

```bash
# Script to send queue size to a OneUptime Incoming Request monitor
QUEUE_SIZE=$(postqueue -j 2>/dev/null | awk 'END { print NR+0 }')
curl -s -X POST "https://your-oneuptime-instance.com/heartbeat/YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"queue_size\": $QUEUE_SIZE, \"host\": \"$(hostname -f)\"}"
```

## Key Takeaways

- `postqueue -p` (or `mailq`) shows the full queue; use `postqueue -j` for scriptable parsing.
- `postcat -q QUEUE_ID` inspects the queued message envelope and content.
- `postsuper -d ALL deferred` clears stuck deferred messages without touching the active queue.
- Parse `/var/log/mail.log` for source IPv4 analysis, and use `pflogsumm` for delivery summaries.
