# How to Implement Brute-Force Login Protection with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Rate Limiting, Authentication

Description: Protect login endpoints from brute-force attacks using Redis counters - track failures per account and IP, implement progressive delays, and auto-unlock after a cooldown period.

---

Brute-force login attacks try many password combinations in quick succession. Redis atomic counters with TTL automatically track failed attempts and can temporarily lock accounts or IPs without any cleanup overhead.

## Data Model

```text
login:fails:account:{identifier}  -> String: failed attempt count for this account
login:fails:ip:{ip}               -> String: failed attempt count for this IP
login:locked:account:{identifier} -> String: lockout marker
login:locked:ip:{ip}              -> String: lockout marker
```

## Recording Failed Attempts

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

ACCOUNT_FAIL_WINDOW = 900   # 15 minutes
ACCOUNT_MAX_FAILS = 10
IP_FAIL_WINDOW = 3600       # 1 hour
IP_MAX_FAILS = 50
LOCKOUT_DURATION = 1800     # 30 minutes lockout

def record_login_failure(identifier, ip_address):
    pipe = r.pipeline()

    # Increment account failures
    acct_key = f"login:fails:account:{identifier}"
    pipe.incr(acct_key)
    pipe.expire(acct_key, ACCOUNT_FAIL_WINDOW)

    # Increment IP failures
    ip_key = f"login:fails:ip:{ip_address}"
    pipe.incr(ip_key)
    pipe.expire(ip_key, IP_FAIL_WINDOW)

    acct_count, _, ip_count, _ = pipe.execute()

    # Lock account if threshold exceeded
    if acct_count >= ACCOUNT_MAX_FAILS:
        r.set(f"login:locked:account:{identifier}", "1", ex=LOCKOUT_DURATION)

    # Lock IP if threshold exceeded
    if ip_count >= IP_MAX_FAILS:
        r.set(f"login:locked:ip:{ip_address}", "1", ex=LOCKOUT_DURATION)

    return {"account_fails": acct_count, "ip_fails": ip_count}
```

## Checking Login Status Before Attempting Auth

```python
def check_login_allowed(identifier, ip_address):
    pipe = r.pipeline()
    pipe.exists(f"login:locked:account:{identifier}")
    pipe.exists(f"login:locked:ip:{ip_address}")
    pipe.get(f"login:fails:account:{identifier}")
    pipe.get(f"login:fails:ip:{ip_address}")
    acct_locked, ip_locked, acct_fails, ip_fails = pipe.execute()

    if acct_locked:
        ttl = r.ttl(f"login:locked:account:{identifier}")
        return {"allowed": False, "reason": "account_locked", "unlock_in": ttl}

    if ip_locked:
        ttl = r.ttl(f"login:locked:ip:{ip_address}")
        return {"allowed": False, "reason": "ip_locked", "unlock_in": ttl}

    return {
        "allowed": True,
        "account_fails": int(acct_fails or 0),
        "ip_fails": int(ip_fails or 0),
    }
```

## Resetting Failures on Successful Login

```python
def record_login_success(identifier, ip_address):
    pipe = r.pipeline()
    pipe.delete(f"login:fails:account:{identifier}")
    pipe.delete(f"login:locked:account:{identifier}")
    # Optionally reduce IP failure count on success
    pipe.delete(f"login:fails:ip:{ip_address}")
    pipe.execute()
```

## Progressive Delays

Add increasing delays for repeated failures to slow down automated attacks:

```python
def get_login_delay(identifier):
    fails = int(r.get(f"login:fails:account:{identifier}") or 0)
    if fails < 3:
        return 0
    elif fails < 5:
        return 2
    elif fails < 8:
        return 5
    return 10  # Maximum delay in seconds
```

## Admin: Manually Unlocking an Account

```python
def unlock_account(identifier):
    pipe = r.pipeline()
    pipe.delete(f"login:locked:account:{identifier}")
    pipe.delete(f"login:fails:account:{identifier}")
    pipe.execute()
```

## Example Usage

```bash
# After failed login
INCR login:fails:account:user@example.com
EXPIRE login:fails:account:user@example.com 900

# After 10 failures - lock account
SET login:locked:account:user@example.com 1 EX 1800

# Check before login attempt
EXISTS login:locked:account:user@example.com   # Returns 1 (locked)

# After successful login - clear counters
DEL login:fails:account:user@example.com
DEL login:locked:account:user@example.com
```

## Summary

Redis atomic INCR and TTL-based keys provide a stateless brute-force protection layer that scales horizontally and cleans itself up automatically. Tracking failures at both account and IP level prevents credential stuffing attacks that spread attempts across many accounts. Progressive delays slow automated tools without impacting legitimate users who mistype their password once or twice.
