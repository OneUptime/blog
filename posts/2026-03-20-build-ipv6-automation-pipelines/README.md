# How to Build IPv6 Network Automation Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Pipeline, CI/CD, Ansible, Python, GitOps, Automation

Description: Build end-to-end IPv6 network automation pipelines from code commit to deployment verification using GitLab CI or GitHub Actions.

## Introduction

Build IPv6 automation checks for address validation, policy evaluation, and deployment verification using Python and CLI tooling. This guide covers the essential configuration, code patterns, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Ensure IPv6 is enabled and functional

ip -6 addr show
ping -6 -c 3 ::1

# Python's ipaddress module is included in Python 3.
# Install optional third-party dependencies only if you need them.
python3 -m pip install netaddr  # Optional Python helper library
# or
npm install ipaddr.js          # JavaScript
```

## Step 2: Core Implementation

```python
import ipaddress

def check_ipv6_subnet(client_ip: str, allowed_prefix: str) -> bool:
    """Check if an IPv6 address is within an allowed subnet."""
    try:
        addr = ipaddress.ip_address(client_ip)
        network = ipaddress.ip_network(allowed_prefix, strict=False)
        return addr in network
    except ValueError:
        return False

# Example usage
allowed_networks = [
    "2001:db8:1000::/48",
    "::1/128",
    "fe80::/10",
]

def is_allowed(client_ip: str) -> bool:
    """Check if client IP is in any allowed network."""
    for network in allowed_networks:
        if check_ipv6_subnet(client_ip, network):
            return True
    return False

# Tests
print(is_allowed("2001:db8:1000::1"))  # True
print(is_allowed("2001:db8:2000::1"))  # False
print(is_allowed("::1"))               # True
```

## Step 3: Configuration

```yaml
# Configuration example for IPv6 policy rules
ipv6:
  enabled: true
  networks:
    - prefix: "2001:db8::/32"
      description: "Internal network"
      action: allow
    - prefix: "::/0"
      description: "Default"
      action: deny
```

## Step 4: Apply and Verify

```bash
# Apply configuration
python3 - <<'PY'
import ipaddress

rules = [
    ("2001:db8::/32", "allow"),
    ("::/0", "deny"),
]

client = ipaddress.ip_address("2001:db8::1")
for prefix, action in rules:
    if client in ipaddress.ip_network(prefix, strict=False):
        print(f"{client}: {action}")
        break
PY

# Verify functionality
python3 -c "
import ipaddress
addr = ipaddress.IPv6Address('2001:db8::1')
net = ipaddress.IPv6Network('2001:db8::/32')
print(f'{addr} in {net}: {addr in net}')
"

# Test connectivity
curl -g -6 http://[::1]:8080/health
```

## Step 5: Monitoring

```python
import ipaddress
import logging

logger = logging.getLogger(__name__)

def log_ipv6_access(client_ip: str, allowed: bool):
    """Log IPv6 access attempts."""
    try:
        addr = ipaddress.ip_address(client_ip)
        logger.info({
            "client_ip": client_ip,
            "ip_version": addr.version,
            "allowed": allowed,
            "is_private": addr.is_private,
        })
    except ValueError:
        logger.warning(f"Invalid IP: {client_ip}")
```

## Conclusion

Building IPv6 automation workflows requires understanding IPv6 address structure, CIDR notation, and address classification. Use Python's ipaddress module for validation and subnet matching. Log all IPv6 access attempts for security auditing. Monitor your implementation with OneUptime to detect access pattern anomalies.
