# How to Measure IPv6 Migration Progress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Metric, KPIs, Progress Tracking

Description: Define and measure key performance indicators for IPv6 migration progress including AAAA record coverage, IPv6 traffic percentage, and service readiness scores.

## Introduction

Measuring IPv6 migration progress requires quantitative metrics that track actual enablement rather than subjective assessment. Good metrics include the percentage of services with AAAA records, the share of production traffic carried over IPv6, the number of code repositories free of IPv4 hardcoding, and the percentage of infrastructure with IPv6 addresses.

## Key Metrics

### 1. AAAA Record Coverage

```python
#!/usr/bin/env python3
# Requires: pip install dnspython
# measure_aaaa_coverage.py

import dns.resolver
from typing import NamedTuple

class ServiceStatus(NamedTuple):
    hostname: str
    has_a: bool
    has_aaaa: bool

# All services that should have AAAA records

ALL_SERVICES = [
    "www.example.com",
    "api.example.com",
    "mail.example.com",
    "vpn.example.com",
    "auth.example.com",
    "docs.example.com",
    "cdn.example.com",
]

def check_dns(hostname: str) -> ServiceStatus:
    has_a = has_aaaa = False
    for record_type, flag in [('A', True), ('AAAA', False)]:
        try:
            dns.resolver.resolve(hostname, record_type)
            if record_type == 'A':
                has_a = True
            else:
                has_aaaa = True
        except:
            pass
    return ServiceStatus(hostname, has_a, has_aaaa)

results = [check_dns(s) for s in ALL_SERVICES]
coverage = sum(1 for r in results if r.has_aaaa) / len(results) * 100

print(f"AAAA Coverage: {coverage:.1f}% ({sum(1 for r in results if r.has_aaaa)}/{len(results)})")
for r in results:
    status = "OK" if r.has_aaaa else "MISSING"
    print(f"  [{status}] {r.hostname}")
```

### 2. IPv6 Traffic Percentage

```promql
# Example Prometheus query if your request metric includes an ip_version label
sum(rate(http_requests_total{ip_version="ipv6"}[1h]))
/
sum(rate(http_requests_total[1h]))
* 100
```

Track this metric weekly and trend toward a target based on your user base after full AAAA publication.

### 3. Infrastructure IPv6 Readiness

```bash
#!/bin/bash
# measure_infra_readiness.sh

TOTAL=0
IPV6_READY=0

# Check Kubernetes nodes
while IFS= read -r node; do
    TOTAL=$((TOTAL+1))
    # Check if node has IPv6 address
    if kubectl get node "$node" -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}' | grep -q ":"; then
        IPV6_READY=$((IPV6_READY+1))
    fi
done < <(kubectl get nodes -o name | sed 's/node\///')

echo "Kubernetes nodes with IPv6: $IPV6_READY/$TOTAL"

# Check services actually assigned dual-stack
TOTAL_SVC=$(kubectl get services --all-namespaces --no-headers | wc -l)
DUAL_STACK=$(kubectl get services --all-namespaces -o json | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
count = sum(1 for svc in data['items']
            if len(svc['spec'].get('clusterIPs', [])) > 1)
print(count)
")
echo "Dual-stack Kubernetes services: $DUAL_STACK/$TOTAL_SVC"
```

### 4. Application Readiness Score

```python
#!/usr/bin/env python3
# score_app_readiness.py

import subprocess
import os
from pathlib import Path

def check_repo(repo_path: str) -> dict:
    """Score an application repository for IPv6 readiness."""
    score = 0
    max_score = 100
    issues = []

    # Check 1: No hardcoded IPv4 addresses (20 points)
    result = subprocess.run(
        ["grep", "-r", "-E", r"\b([0-9]{1,3}\.){3}[0-9]{1,3}\b",
         "--include=*.py", "--include=*.go", "--include=*.js",
         repo_path],
        capture_output=True, text=True
    )
    ipv4_count = len(result.stdout.splitlines())
    if ipv4_count == 0:
        score += 20
    else:
        issues.append(f"Hardcoded IPv4 addresses: {ipv4_count}")

    # Check 2: No obvious IPv4-only bind addresses (20 points)
    result = subprocess.run(
        ["grep", "-r", "-E", r"\b0\.0\.0\.0\b", "--include=*.py", "--include=*.go",
         "--include=*.yaml", "--include=*.env", repo_path],
        capture_output=True, text=True
    )
    if len(result.stdout.splitlines()) == 0:
        score += 20
    else:
        issues.append("Explicit 0.0.0.0 bind address found; verify an IPv6 listener or dual-stack socket")

    # Check 3: Tests exist for IPv6 (20 points)
    has_ipv6_tests = False
    for pattern in ("test_*.py", "*_test.py", "*_test.go", "*.test.js", "*.spec.js"):
        for f in Path(repo_path).rglob(pattern):
            if f.stat().st_size >= 100000:
                continue
            if "ipv6" in f.read_text(encoding="utf-8", errors="ignore").lower():
                has_ipv6_tests = True
                break
        if has_ipv6_tests:
            break
    if has_ipv6_tests:
        score += 20
    else:
        issues.append("No IPv6 tests found")

    # Check 4: No obvious IPv4-only socket families (20 points)
    ipv4_only_socket_files = 0
    for f in Path(repo_path).rglob("*.py"):
        if f.stat().st_size >= 100000:
            continue
        content = f.read_text(encoding="utf-8", errors="ignore")
        if "AF_INET" in content and "AF_INET6" not in content and "AF_UNSPEC" not in content:
            ipv4_only_socket_files += 1
    if ipv4_only_socket_files == 0:
        score += 20
    else:
        issues.append(f"Possible IPv4-only socket usage: {ipv4_only_socket_files} file(s)")

    # Check 5: Container/K8s config references IPv6 (20 points)
    for fname in ["docker-compose.yml", "Dockerfile", "values.yaml"]:
        fpath = os.path.join(repo_path, fname)
        if os.path.exists(fpath):
            content = Path(fpath).read_text(encoding="utf-8", errors="ignore")
            if "::" in content or "ipv6" in content.lower():
                score += 20
                break
    else:
        issues.append("No IPv6 config in Docker/K8s files")

    return {"score": score, "max": max_score, "issues": issues}

result = check_repo(".")
print(f"IPv6 Readiness Score: {result['score']}/{result['max']}")
if result['issues']:
    print("Issues:")
    for issue in result['issues']:
        print(f"  - {issue}")
```

## Progress Dashboard Template

| Metric | Baseline | Week 4 | Week 8 | Week 12 | Target |
|--------|----------|--------|--------|---------|--------|
| AAAA record coverage | 0% | 20% | 60% | 100% | 100% |
| IPv6 traffic % | 0% | 2% | 15% | 40% | 40% |
| Services on dual-stack | 0 | 5 | 20 | All | All |
| App readiness score | 40/100 | 60/100 | 80/100 | 95/100 | 90/100 |
| IPv4 hardcoding issues | 48 | 30 | 10 | 2 | 0 |

## Conclusion

IPv6 migration progress measurement uses four primary metrics: AAAA DNS record coverage (percentage of services publishing AAAA records), production IPv6 traffic percentage (business outcome metric), infrastructure readiness (devices and services with IPv6 configured), and application readiness score (code quality metric). Report these weekly during the migration phase in a simple dashboard. The IPv6 traffic percentage is the most meaningful outcome metric - it directly reflects how many real users reach you over IPv6.
