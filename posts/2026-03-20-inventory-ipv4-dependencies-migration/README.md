# How to Inventory IPv4-Only Dependencies Before Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, IPv4, Inventory, Dependency Analysis

Description: Systematically discover IPv4-only dependencies in code, configuration files, infrastructure, and third-party services before starting IPv6 migration.

## Introduction

IPv4-only dependencies are the most common source of migration failures. They include hardcoded IPv4 addresses in application code, infrastructure configuration files that bind to `0.0.0.0`, APIs and services that only return IPv4, and network equipment that handles only IPv4. This guide provides tooling to discover these dependencies systematically.

## Step 1: Scan Code for Hardcoded IPv4

```bash
#!/bin/bash
# scan_ipv4_code.sh - Find IPv4 addresses hardcoded in source code

# IPv4 pattern: avoid matching version numbers (1.2.3) and similar

IPV4_RE='(^|[^0-9./])((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])([^0-9./]|$)'

echo "=== IPv4 Addresses in Source Code ==="
grep -rn -E "$IPV4_RE" \
    --include="*.py" --include="*.go" --include="*.js" --include="*.ts" \
    --include="*.java" --include="*.rb" --include="*.php" \
    --include="*.yaml" --include="*.yml" --include="*.json" \
    --include="*.toml" --include="*.ini" --include="*.conf" \
    . 2>/dev/null | \
    grep -Ev "127\.0\.0\.1|0\.0\.0\.0|255\.255\.255\.255|test|spec|example" | \
    head -50
```

## Step 2: Find Socket Binding Issues

```python
#!/usr/bin/env python3
# find_socket_binding.py - Find code that binds IPv4-only sockets

import os
import re

# Patterns that indicate IPv4-only binding
BINDING_PATTERNS = [
    (r'\bAF_INET\b(?!6)', 'IPv4-only socket family (review for AF_INET6 or dual-stack support)'),
    (r'\bbind\s*\([^#\n]*0\.0\.0\.0', 'Binding to 0.0.0.0 (review for an IPv6 or dual-stack listener)'),
    (r'\blisten\s*\([^#\n]*0\.0\.0\.0', 'Listening on 0.0.0.0'),
    (r'HOST\s*=\s*["\']0\.0\.0\.0', 'Host configured as 0.0.0.0'),
    (r'BIND_ADDR\s*=\s*["\']0\.0\.0\.0', 'Bind address 0.0.0.0'),
]

def scan_file(filepath: str) -> list:
    findings = []
    try:
        with open(filepath) as f:
            for lineno, line in enumerate(f, 1):
                for pattern, description in BINDING_PATTERNS:
                    if re.search(pattern, line):
                        findings.append({
                            "file": filepath,
                            "line": lineno,
                            "content": line.strip(),
                            "issue": description
                        })
    except (UnicodeDecodeError, IOError):
        pass
    return findings

# Walk source tree
all_findings = []
extensions = {'.py', '.go', '.js', '.ts', '.java', '.rb'}
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '__pycache__', 'vendor'}]
    for fname in files:
        if any(fname.endswith(ext) for ext in extensions):
            all_findings.extend(scan_file(os.path.join(root, fname)))

print(f"Found {len(all_findings)} IPv4-only binding issues:\n")
for f in all_findings:
    print(f"  {f['file']}:{f['line']}: {f['issue']}")
    print(f"    {f['content']}")
```

## Step 3: Inventory Configuration Files

```bash
#!/bin/bash
# inventory_configs.sh - Find IPv4-only settings in config files

echo "=== Configuration File Audit ==="

# Find explicit IPv4 listen or bind directives
echo "--- IPv4-only listen or bind directives ---"
grep -rni -E "(^|[[:space:]])(listen|bind)[[:space:]].*(0\.0\.0\.0|[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)" \
    /etc/nginx /etc/apache2 /etc/haproxy /etc/caddy 2>/dev/null | \
    grep -vE ":[0-9]+:[[:space:]]*#" | \
    grep -vE "\[[0-9A-Fa-f:]+\]"

# Find Kubernetes services using only IPv4 service families
echo ""
echo "--- Kubernetes IPv4-only services ---"
kubectl get services --all-namespaces -o json 2>/dev/null | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for svc in data.get('items', []):
    spec = svc.get('spec', {})
    cluster_ips = spec.get('clusterIPs', [])
    cluster_ip = spec.get('clusterIP')
    if not cluster_ips and cluster_ip and cluster_ip != 'None':
        cluster_ips = [cluster_ip]
    families = spec.get('ipFamilies')
    if not families and cluster_ips:
        families = ['IPv6' if ':' in ip else 'IPv4' for ip in cluster_ips]
    ip_policy = spec.get('ipFamilyPolicy')
    if families == ['IPv4'] and ip_policy in (None, 'SingleStack'):
        ns = svc['metadata']['namespace']
        name = svc['metadata']['name']
        print(f'  {ns}/{name}: IPv4-only SingleStack')
"

# Find Docker networks that are IPv4-only
echo ""
echo "--- Docker IPv4-only networks ---"
docker network ls --format "{{.Name}}" 2>/dev/null | while IFS= read -r net; do
    ENABLE_IPV6=$(docker network inspect "$net" --format '{{.EnableIPv6}}' 2>/dev/null)
    if [ "$ENABLE_IPV6" = "false" ]; then
        echo "  $net: IPv6 disabled"
    fi
done
```

## Step 4: Third-Party Service Inventory

```python
#!/usr/bin/env python3
# check_third_party_ipv6.py - Check IPv6 support for external services

import socket

THIRD_PARTY_SERVICES = [
    # Format: (service_name, hostname)
    ("GitHub", "github.com"),
    ("Docker Hub", "registry-1.docker.io"),
    ("AWS S3 us-east-1", "s3.amazonaws.com"),
    ("Cloudflare DNS", "cloudflare.com"),
    ("Your DB", "your-database.internal"),
    ("Your Cache", "redis.internal"),
    ("Payment API", "api.payment-provider.com"),
]

print("Third-Party IPv6 Support Check")
print("-" * 60)

for name, hostname in THIRD_PARTY_SERVICES:
    try:
        answers = socket.getaddrinfo(hostname, None, socket.AF_INET6, socket.SOCK_STREAM)
        ipv6 = sorted({result[4][0] for result in answers})[0]
        print(f"  OK  {name:30s} {ipv6}")
    except socket.gaierror:
        print(f"  NO  {name:30s} No IPv6 result from resolver")
    except Exception as e:
        print(f"  ??  {name:30s} Error: {e}")
```

## Step 5: Inventory Summary Report

```markdown
# IPv4 Dependency Inventory Report

## Summary
- Source code files with hardcoded IPv4: 23
- IPv4-only socket bindings: 8
- Config files with explicit IPv4 listen/bind directives: 12
- Kubernetes services IPv4-only: 45
- Third-party services without IPv6: 3

## High Priority (blocking migration)
1. **payment-service**: Hardcodes payment gateway IPv4 (no AAAA available)
2. **user-auth**: Binds to `0.0.0.0:8080` - needs an IPv6 or dual-stack listener
3. **legacy-api**: Uses `socket.AF_INET` throughout codebase

## Medium Priority
1. Nginx configs bind to `0.0.0.0:80` instead of an IPv6 or dual-stack listener
2. 45 K8s services need `ipFamilyPolicy: PreferDualStack` once the cluster supports dual-stack

## External Dependencies Without IPv6
1. vendor-x.com - contact vendor for IPv6 timeline
2. analytics.internal - upgrade required
```

## Conclusion

A thorough IPv4 dependency inventory covers four areas: source code hardcoding, socket binding patterns, configuration files, and third-party services. Automated scanning with grep and Python finds the majority of issues. Build this inventory in Phase 1 of your migration roadmap and assign remediation owners for each finding before proceeding to Phase 2. Third-party services without IPv6 support require vendor engagement or may need a NAT64/proxy workaround during the transition period.
