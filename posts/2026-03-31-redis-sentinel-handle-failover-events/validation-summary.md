# Validation Summary: How to Handle Failover Events in Redis Sentinel

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Sentinel
- Redis Pub/Sub
- Python (redis-py library)
- Bash / redis-cli

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/management/sentinel/
- redis-py Sentinel API documentation: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client
- Redis Sentinel Pub/Sub notifications reference: https://redis.io/docs/management/sentinel/#pubsub-messages

## Issues Found

1. **Python `UnboundLocalError` in `safe_write` function**: The `master` variable was assigned at module scope and then reassigned inside the `safe_write` function on retry. In Python, any assignment to a variable inside a function makes it local for the entire function scope, so `master.set(key, value)` would raise `UnboundLocalError` even on the first iteration. Fixed by getting a fresh connection (`conn = sentinel.master_for(...)`) at the start of each attempt inside the loop.

2. **Pub/Sub notification checked wrong message field**: The code checked `b'+switch-master' in message['data']` but for `pmessage` types in Redis Pub/Sub, the event type (channel name like `+switch-master`) is in `message['channel']`, not `message['data']`. The `data` field contains the event details (e.g., `mymaster 192.168.1.10 6379 192.168.1.11 6380`). Fixed to check `message['channel'] == b'+switch-master'`.

3. **Verification command missing port**: The shell command used `head -1` to extract only the IP address from `SENTINEL get-master-addr-by-name`, then connected with `redis-cli -h $NEW_PRIMARY` which defaults to port 6379. Since the blog's own failover example shows the new primary on port 6380, this command would fail. Fixed by capturing both host and port separately and passing both to `redis-cli -h $NEW_PRIMARY_HOST -p $NEW_PRIMARY_PORT`.

## Review Notes
- The `SENTINEL replicas` command used in the verification section is correct for Redis 5.0+. Older versions use `SENTINEL slaves`. The post does not specify a minimum Redis version, but since `replicas` is the modern terminology, this is fine.
- The failover event names listed in the Pub/Sub section are accurate but omit some intermediate events (e.g., `+failover-state-send-slaveof-noone`, `+failover-state-wait-promotion`). This is acceptable since the listing uses `...` to indicate abbreviated output.
- The `socket_timeout=0.1` (100ms) in the Python examples is very aggressive and may cause false timeouts in real-world deployments. This is a usability concern rather than a correctness issue, so it was not changed.
