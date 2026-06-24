# How to Implement IP Blacklisting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Rate Limiting, Firewall

Description: Build a dynamic IP blacklisting system with Redis - block abusive IPs instantly, support auto-expiring bans, manage CIDR ranges, and check incoming requests in under 1ms.

---

IP blacklisting blocks known malicious addresses at the application layer. Redis provides sub-millisecond lookups and TTL-based bans that automatically expire without manual cleanup.

## Data Model

```text
ip:blacklist:{ip}        -> String: ban reason with optional TTL
ip:blacklist:permanent   -> Set of permanently blocked IPs
ip:whitelist             -> Set of always-allowed IPs
ip:ban_log               -> List of recent ban events
```

## Adding an IP to the Blacklist

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def block_ip(ip_address, reason="manual", duration_seconds=None):
    """
    duration_seconds=None means permanent.
    """
    pipe = r.pipeline()

    if duration_seconds:
        pipe.set(f"ip:blacklist:{ip_address}", reason, ex=duration_seconds)
    else:
        pipe.set(f"ip:blacklist:{ip_address}", reason)
        pipe.sadd("ip:blacklist:permanent", ip_address)

    # Log the ban event
    log_entry = f"{time.time()}|{ip_address}|{reason}"
    pipe.lpush("ip:ban_log", log_entry)
    pipe.ltrim("ip:ban_log", 0, 9999)  # Keep last 10,000 events
    pipe.execute()

def unblock_ip(ip_address):
    pipe = r.pipeline()
    pipe.delete(f"ip:blacklist:{ip_address}")
    pipe.srem("ip:blacklist:permanent", ip_address)
    pipe.execute()
```

## Checking if an IP is Blocked

```python
def is_ip_blocked(ip_address):
    # First check whitelist
    if r.sismember("ip:whitelist", ip_address):
        return False, None

    reason = r.get(f"ip:blacklist:{ip_address}")
    if reason:
        ttl = r.ttl(f"ip:blacklist:{ip_address}")
        return True, {"reason": reason, "ttl": ttl}
    return False, None
```

## Middleware Integration

```python
def check_request_ip(ip_address):
    blocked, info = is_ip_blocked(ip_address)
    if blocked:
        return {
            "blocked": True,
            "reason": info["reason"],
            "retry_after": info["ttl"] if info["ttl"] > 0 else None,
        }
    return {"blocked": False}
```

## Auto-Block Based on Behavior

Automatically block IPs that exceed thresholds detected by other systems:

```python
def auto_block_on_threshold(ip_address, event_type, threshold, window_seconds,
                             ban_duration_seconds=3600):
    count_key = f"ip:events:{ip_address}:{event_type}"
    count = r.incr(count_key)
    if count == 1:
        r.expire(count_key, window_seconds)

    if count >= threshold:
        block_ip(ip_address, reason=f"auto:{event_type}", duration_seconds=ban_duration_seconds)
        return True
    return False

# Usage examples
def on_failed_login(ip_address):
    return auto_block_on_threshold(ip_address, "failed_login", 20, 600, 1800)

def on_scraping_detected(ip_address):
    return auto_block_on_threshold(ip_address, "scrape", 500, 60, 86400)
```

## Bulk IP Management

```python
def block_ip_range(ip_list, reason, duration_seconds=None):
    pipe = r.pipeline()
    for ip in ip_list:
        if duration_seconds:
            pipe.set(f"ip:blacklist:{ip}", reason, ex=duration_seconds)
        else:
            pipe.set(f"ip:blacklist:{ip}", reason)
            pipe.sadd("ip:blacklist:permanent", ip)
    pipe.execute()

def get_permanent_blacklist():
    return r.smembers("ip:blacklist:permanent")

def get_recent_bans(limit=100):
    entries = r.lrange("ip:ban_log", 0, limit - 1)
    return [e.split("|") for e in entries]
```

## Whitelisting IPs

```python
def whitelist_ip(ip_address):
    r.sadd("ip:whitelist", ip_address)
    # Remove from blacklist if previously blocked
    unblock_ip(ip_address)

def is_whitelisted(ip_address):
    return r.sismember("ip:whitelist", ip_address)
```

## Example Usage

```bash
# Block IP for 1 hour
SET ip:blacklist:1.2.3.4 "too_many_requests" EX 3600

# Check if blocked
GET ip:blacklist:1.2.3.4    # too_many_requests

# Permanent block
SET ip:blacklist:5.6.7.8 "known_malicious"
SADD ip:blacklist:permanent 5.6.7.8

# Whitelist internal IP
SADD ip:whitelist 10.0.0.1
```

## Summary

Redis provides sub-millisecond IP blacklist lookups that add minimal overhead to request processing. TTL-based temporary bans expire automatically, while permanent bans are tracked in a Set. Auto-blocking based on behavioral thresholds creates a self-reinforcing defense layer that responds to attacks without manual intervention.
