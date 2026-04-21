# How to Handle IPv6 Addresses in Structured Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Structured Logging, JSON, Python, Go, Observability

Description: Best practices for logging IPv6 addresses in structured log formats including normalization, field naming conventions, and avoiding common pitfalls with IPv6 address representation.

## Introduction

Structured logging (JSON, logfmt) stores addresses as string fields. IPv6 addresses present unique challenges: the same address can appear in multiple valid forms (`2001:db8::1` vs `2001:0db8:0000:0000:0000:0000:0000:0001`), addresses include colons that can interfere with some log parsers, and IPv4-mapped addresses blend IPv4 and IPv6 notation. This guide covers canonical representation, field naming, and implementation patterns.

## Canonical IPv6 Address Format for Logs

Always normalize IPv6 addresses to compressed canonical form before logging:

```python
#!/usr/bin/env python3
import ipaddress
import socket

def canonical_ip(addr: str) -> str:
    """Normalize an IP address to its canonical string form."""
    # Remove zone ID (e.g., fe80::1%eth0)
    addr = addr.split('%')[0]
    # Remove URI brackets
    addr = addr.strip('[]')
    try:
        return str(ipaddress.ip_address(addr))
    except ValueError:
        return addr  # Return as-is if invalid

# Examples

print(canonical_ip("2001:0DB8:0000:0000:0000:0000:0000:0001"))  # 2001:db8::1
print(canonical_ip("[2001:db8::1]"))                             # 2001:db8::1
print(canonical_ip("::FFFF:192.168.1.1"))                       # ::ffff:c0a8:101
print(canonical_ip("fe80::1%eth0"))                              # fe80::1
```

## Python Structured Logging with IPv6

```python
import logging
import json
import ipaddress
from datetime import datetime, timezone

class IPv6JSONFormatter(logging.Formatter):
    """JSON log formatter that normalizes IPv6 addresses."""

    def normalize_ip(self, addr: str) -> str:
        if not addr:
            return addr
        addr = addr.split('%')[0].strip('[]')
        try:
            ip = ipaddress.ip_address(addr)
            return str(ip)
        except ValueError:
            return addr

    def ip_version(self, addr: str):
        try:
            return ipaddress.ip_address(addr).version
        except ValueError:
            return None

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Normalize IP fields if present
        for field in ("client_ip", "src_ip", "dst_ip"):
            if hasattr(record, field):
                log_entry[field] = self.normalize_ip(getattr(record, field))

        if hasattr(record, "remote_addr"):
            log_entry["remote_addr"] = getattr(record, "remote_addr")

        # Add ip_version metadata
        if "client_ip" in log_entry and log_entry["client_ip"]:
            version = self.ip_version(log_entry["client_ip"])
            if version:
                log_entry["ip_version"] = version

        return json.dumps(log_entry)

# Setup
logger = logging.getLogger("app")
handler = logging.StreamHandler()
handler.setFormatter(IPv6JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage - add extra fields for IP addresses
logger.info(
    "Request received",
    extra={"client_ip": "2001:0DB8::1", "method": "GET", "path": "/api/users"}
)
```

## Go Structured Logging with IPv6 (slog)

```go
package main

import (
    "log/slog"
    "net"
    "os"
)

// normalizeIP returns the canonical string form of an IP address.
func normalizeIP(addr string) string {
    ip := net.ParseIP(addr)
    if ip == nil {
        return addr
    }
    return ip.String()
}

// ipVersion returns 4 or 6 for an IP address string.
func ipVersion(addr string) int {
    ip := net.ParseIP(addr)
    if ip == nil {
        return 0
    }
    if ip.To4() != nil {
        return 4
    }
    return 6
}

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    rawIP := "2001:0DB8:0000:0000:0000:0000:0000:0001"
    normalized := normalizeIP(rawIP)

    logger.Info("HTTP request",
        "client_ip", normalized,
        "ip_version", ipVersion(normalized),
        "method", "GET",
        "path", "/api/v1/health",
        "status", 200,
    )
}
```

## Field Naming Conventions

Use consistent field names across all services:

| Field | Description | Example Value |
|-------|-------------|---------------|
| `client_ip` | End-user source IP | `2001:db8::1` |
| `src_ip` | Source IP (network context) | `2001:db8::1` |
| `dst_ip` | Destination IP | `2001:db8::10` |
| `ip_version` | Numeric IP version | `6` |
| `remote_addr` | Raw address from socket | `[2001:db8::1]:54321` |
| `x_forwarded_for` | Raw X-Forwarded-For header | `2001:db8::1, 10.0.0.1` |

## Common Pitfalls

**Problem: Logging raw socket address strings**
```python
remote_addr = "[2001:db8::1]:54321"

# BAD: logs "[2001:db8::1]:54321" - hard to query
logger.info(f"Connection from {remote_addr}")

# GOOD: extract and normalize the IP
from urllib.parse import urlsplit
import ipaddress
parsed = urlsplit(f"//{remote_addr}")
normalized = str(ipaddress.ip_address(parsed.hostname))
logger.info("Connection received", extra={"client_ip": normalized, "client_port": parsed.port})
```

**Problem: Not logging ip_version**
Without an `ip_version` field, queries like "count IPv6 requests" require regex on the IP field, which is slower than filtering on a dedicated field.

## Conclusion

Normalize IPv6 addresses to compressed canonical form using `ipaddress.ip_address()` (Python) or `net.ParseIP().String()` (Go) before logging. Store IP addresses as separate fields from port numbers, add an `ip_version` field for efficient filtering, and use consistent field naming conventions across services. JSON structured logging with these conventions enables efficient IPv6-specific analysis in any log platform.
