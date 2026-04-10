# How to Scan Redis for Security Vulnerabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Vulnerability, Scanning, Audit

Description: Use automated scanning tools and manual checks to identify Redis security misconfigurations, unauthenticated access, dangerous commands, and known CVEs.

---

An improperly configured Redis instance can be a critical security vulnerability. Exposed Redis instances without authentication have been used in cryptocurrency miners, ransomware attacks, and SSH key injection exploits. Regular scanning helps you find these issues before attackers do.

## Quick Manual Security Check

Run this checklist against any Redis instance:

```bash
# 1. Check if authentication is required
redis-cli -h target-redis PING
# If you get PONG without a password, authentication is disabled

# 2. Check if it is bound to all interfaces
redis-cli -h target-redis CONFIG GET bind
# Dangerous if it returns "" or "0.0.0.0"

# 3. Check protected mode
redis-cli -h target-redis CONFIG GET protected-mode
# Should be "yes" unless bind is set

# 4. List connected clients
redis-cli -h target-redis CLIENT LIST
# Look for unexpected IP addresses

# 5. Check if dangerous commands are enabled
redis-cli -h target-redis CONFIG GET save
redis-cli -h target-redis CONFIG GET dir
```

## Using redis-audit

`redis-audit` analyzes key patterns and memory usage:

```bash
git clone https://github.com/snmaynard/redis-audit.git
cd redis-audit
bundle install
ruby redis-audit.rb -h localhost -p 6379 -a yourpassword
```

It reports:
- TTL coverage (keys without expiry)
- Large key detection
- Memory per key type

## Checking for Exposed Redis with nmap

```bash
# Scan for open Redis ports on your network
nmap -p 6379 --script redis-info 10.0.0.0/24

# Brute-force check for weak passwords
nmap -p 6379 --script redis-brute 10.0.0.0/24
```

## Automated Vulnerability Scan Script

```python
import redis

def audit_redis(host: str, port: int = 6379, password: str = None):
    findings = []

    # Test unauthenticated access
    try:
        r = redis.Redis(host=host, port=port, socket_connect_timeout=2)
        r.ping()
        findings.append("CRITICAL: No authentication required")
    except redis.AuthenticationError:
        findings.append("OK: Authentication is required")
    except Exception as e:
        findings.append(f"INFO: Cannot connect - {e}")
        return findings

    if password:
        r = redis.Redis(host=host, port=port, password=password)

    # Check bind address
    bind = r.config_get("bind").get("bind", "")
    if not bind or "0.0.0.0" in bind:
        findings.append("HIGH: Redis bound to all interfaces")

    # Check protected mode
    pm = r.config_get("protected-mode").get("protected-mode", "")
    if pm == "no":
        findings.append("HIGH: Protected mode is disabled")

    # Check for dangerous commands
    try:
        r.execute_command("DEBUG", "SLEEP", "0")
        findings.append("HIGH: DEBUG command is enabled")
    except redis.ResponseError:
        findings.append("OK: DEBUG command is disabled/renamed")

    # Check TLS
    info = r.info("server")
    if "tls_port" not in info or not info.get("tls_port"):
        findings.append("MEDIUM: TLS is not configured")

    return findings

results = audit_redis("localhost", 6379, password="yourpassword")
for f in results:
    print(f)
```

## Checking Known CVEs

```bash
# Check Redis version
redis-cli INFO server | grep redis_version

# Look up CVEs for that version
# Visit: https://www.cve.org/CVESearch?keyword=redis
```

Key CVEs to check by version:
- Redis < 7.0.9: CVE-2023-25155 (integer overflow)
- Redis < 6.2.8: CVE-2022-35977 (integer overflow via SETRANGE/SORT)
- Redis < 5.0.14: CVE-2021-32675 (denial of service)

## Summary

Scanning Redis for security vulnerabilities requires checking authentication, bind configuration, protected mode, TLS, and command restrictions. Automate checks with tools like `nmap --script redis-info` and custom audit scripts. Always verify the Redis version against known CVEs and apply patches promptly, as exposed unauthenticated Redis instances are actively exploited in the wild.
