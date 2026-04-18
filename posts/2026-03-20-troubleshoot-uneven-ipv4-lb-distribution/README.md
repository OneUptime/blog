# How to Troubleshoot Uneven IPv4 Load Balancer Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancing, Troubleshooting, IPv4, HAProxy, Nginx, Distribution

Description: Diagnose and fix uneven traffic distribution across IPv4 load balancer backends caused by sticky sessions, long-lived connections, algorithm mismatches, or health check issues.

## Introduction

Uneven traffic distribution is a common load balancing problem. Some backends receive far more traffic than others, leading to hotspots and underutilized servers. Causes include sticky sessions, long-lived connections with round robin, misconfigured weights, or health checks removing servers from the pool.

## Diagnosing the Problem

### HAProxy: Check Per-Server Traffic

```bash
# Show connection counts per server

echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | \
  awk -F',' 'NR>1 && $2!="FRONTEND" && $2!="BACKEND" {
    printf "%-20s %-15s conns=%s req=%s status=%s\n", $1, $2, $5, $49, $18
  }'
```

Look for servers with disproportionately high `conns` or `req` values.

### Nginx: Check Upstream Response Counts

```bash
# Check Nginx access log for upstream IP distribution
sudo grep -oP 'upstream_addr="\K[^"]+' /var/log/nginx/access.log | \
  sort | uniq -c | sort -rn
```

### AWS ALB: Check per-Target Request Count

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCountPerTarget \
  --dimensions Name=TargetGroup,Value=targetgroup/web-tg/abc123 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## Common Causes and Fixes

### Cause 1: Long-Lived Connections with Round Robin

Round robin distributes new connections, not requests. If some clients hold connections for minutes, the server they connected to handles all their requests.

**Fix**: Use `leastconn` (HAProxy) or `least_conn` (Nginx) instead:

```nginx
# HAProxy
backend app-servers
    balance leastconn

# Nginx
upstream app-servers {
    least_conn;
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
}
```

### Cause 2: Sticky Sessions Pinning to One Server

If many clients share a NAT IP or cookie pinning is too aggressive, one server handles all pinned traffic.

**Fix**: Check stick table or cookie distribution:

```bash
# HAProxy: list all entries in the stick table
echo "show table app-servers" | sudo socat stdio /run/haproxy/admin.sock | \
  awk '{print $NF}' | sort | uniq -c | sort -rn
```

Reduce stick table entry lifetime or switch from `balance source` to cookie-based stickiness.

### Cause 3: Server Weights Are Unequal

```bash
# Check current weights in HAProxy
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | \
  awk -F',' '{print $1, $2, $19}' | head -20
```

**Fix**: Set equal weights unless servers have different capacities:

```bash
echo "set server web-backends/web1 weight 100" | sudo socat stdio /run/haproxy/admin.sock
echo "set server web-backends/web2 weight 100" | sudo socat stdio /run/haproxy/admin.sock
```

### Cause 4: AWS ALB Cross-Zone Load Balancing Disabled

When cross-zone LB is disabled, each AZ's LB node distributes only within its AZ. If AZs have different instance counts, distribution is uneven.

**Fix**:

```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

### Cause 5: Health Check Removing Servers Intermittently

If a server flaps between UP and DOWN, HAProxy/Nginx stops sending traffic to it, overloading the remaining servers.

```bash
# HAProxy: check fail/recovery counts
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | \
  awk -F',' '{print $1, $2, "fails="$22, "downs="$23}' | grep -v "^#"
```

**Fix**: Increase `rise` and `fall` thresholds to prevent flapping:

```text
server web2 10.0.1.11:8080 check inter 5000 rise 3 fall 5
```

### Cause 6: Session Affinity on AWS ALB Target Group

```bash
# Check if stickiness is enabled
aws elbv2 describe-target-group-attributes \
  --target-group-arn $TG_ARN \
  --query 'Attributes[?Key==`stickiness.enabled`]'

# Disable stickiness
aws elbv2 modify-target-group-attributes \
  --target-group-arn $TG_ARN \
  --attributes Key=stickiness.enabled,Value=false
```

## Verification After Fix

```bash
# HAProxy: watch per-server connection rate live
watch -n 1 "echo 'show stat' | sudo socat stdio /run/haproxy/admin.sock | awk -F',' 'NR>1 && \$2!=\"FRONTEND\" && \$2!=\"BACKEND\" {print \$1, \$2, \"sessions=\"\$5}'"
```

## Conclusion

Uneven distribution stems from algorithm mismatch, stickiness, weights, or health flapping. Use `leastconn`/`least_conn` for long-lived connections. Check stick table distribution for stickiness-related imbalances. Enable cross-zone load balancing in AWS. Monitor per-server request counts continuously to catch imbalance early.
