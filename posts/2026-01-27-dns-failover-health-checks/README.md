# How to Build DNS Failover with Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Failover, Health Checks, High Availability, Reliability

Description: Learn how to implement DNS failover with health checks for high availability, including active-passive and active-active configurations.

---

> DNS failover with health checks is one of the most effective ways to achieve high availability. When your primary server becomes unhealthy, traffic automatically routes to healthy backup servers - all without any manual intervention.

DNS failover ensures your application stays accessible even when servers fail. This guide covers practical implementations across major providers and self-hosted solutions.

---

## Why DNS Failover Matters

Traditional DNS returns the same IP address regardless of server health. If that server goes down, users see errors until you manually update DNS records or the server recovers.

DNS failover solves this by:
- Automatically detecting unhealthy servers through health checks
- Removing failed servers from DNS responses
- Routing traffic only to healthy endpoints
- Reducing downtime from hours to seconds

Without failover:
1. Server fails
2. Users get errors
3. You get paged
4. You manually update DNS
5. DNS propagates (minutes to hours)
6. Users can access the site again

With failover:
1. Server fails
2. Health check detects failure within seconds
3. DNS automatically returns healthy server IPs
4. Users experience minimal or no interruption

---

## Health Check Types

Health checks verify that your servers can actually serve requests. Choose the right type based on your application.

### HTTP Health Checks

HTTP checks verify your web application responds correctly. They can check status codes, response body content, and response times.

```bash
# Simple HTTP health check endpoint
# Returns 200 if healthy, 503 if unhealthy

# Example health endpoint in your application
# GET /health
# Response: {"status": "healthy", "database": "connected", "cache": "connected"}
```

Configure HTTP health checks to:
- Request a specific path (e.g., `/health` or `/api/status`)
- Expect a 2xx or 3xx status code
- Optionally validate response body contains specific text
- Timeout after a reasonable period (5-10 seconds)

### HTTPS Health Checks

HTTPS checks work like HTTP but also verify SSL/TLS certificates. Use these for production endpoints that require encryption.

```bash
# HTTPS health check verifies:
# 1. TCP connection succeeds
# 2. TLS handshake completes
# 3. Certificate is valid
# 4. HTTP response is healthy
```

### TCP Health Checks

TCP checks verify a port is open and accepting connections. Use these for non-HTTP services like databases, mail servers, or custom protocols.

```bash
# TCP check workflow:
# 1. Attempt TCP connection to host:port
# 2. If connection succeeds within timeout, mark healthy
# 3. If connection fails or times out, mark unhealthy
```

TCP checks are simpler but less thorough - a server might accept connections but return errors at the application layer.

---

## Active-Passive Failover

Active-passive is the simplest failover configuration. All traffic goes to the primary server. The secondary only receives traffic when the primary fails.

```plaintext
Normal operation:
    Users --> DNS --> Primary Server (active)
                      Secondary Server (standby)

During failover:
    Users --> DNS --> Primary Server (unhealthy, removed)
                      Secondary Server (now active)
```

### When to Use Active-Passive

- You have a primary and disaster recovery site
- Your application does not support multi-region writes
- You want to minimize costs by keeping standby servers small
- Database replication is one-way (primary to replica)

### Configuration Example

Most DNS providers support weighted or priority-based routing for active-passive setups.

```yaml
# Conceptual DNS configuration for active-passive
records:
  - name: api.example.com
    type: A
    value: 192.0.2.1          # Primary server
    health_check: http_primary
    priority: 1               # Lower priority = preferred

  - name: api.example.com
    type: A
    value: 192.0.2.2          # Secondary server
    health_check: http_secondary
    priority: 2               # Only used when primary fails

health_checks:
  http_primary:
    type: HTTP
    endpoint: http://192.0.2.1/health
    interval: 30s
    threshold: 3              # Mark unhealthy after 3 failures

  http_secondary:
    type: HTTP
    endpoint: http://192.0.2.2/health
    interval: 30s
    threshold: 3
```

---

## Active-Active with Weighted Routing

Active-active distributes traffic across multiple healthy servers simultaneously. Use weights to control traffic distribution.

```plaintext
Normal operation (50/50 split):
    Users --> DNS --> Server A (weight: 50)
                  --> Server B (weight: 50)

Server A fails (100% to B):
    Users --> DNS --> Server A (unhealthy, removed)
                  --> Server B (weight: 50, gets all traffic)
```

### When to Use Active-Active

- You need to distribute load across multiple servers
- Your application supports running in multiple locations
- You want gradual rollouts (shift traffic percentages)
- Maximizing resource utilization is important

### Weighted Routing Example

```yaml
# Active-active with weighted distribution
records:
  - name: api.example.com
    type: A
    value: 192.0.2.1
    weight: 70                # 70% of traffic
    health_check: check_server_a

  - name: api.example.com
    type: A
    value: 192.0.2.2
    weight: 20                # 20% of traffic
    health_check: check_server_b

  - name: api.example.com
    type: A
    value: 192.0.2.3
    weight: 10                # 10% of traffic
    health_check: check_server_c
```

When a server fails its health check, its weight effectively becomes zero and traffic redistributes among remaining healthy servers.

---

## TTL Considerations

Time To Live (TTL) controls how long DNS resolvers cache your records. This directly impacts failover speed.

### Low TTL (30-60 seconds)

Pros:
- Faster failover - changes propagate in under a minute
- More responsive to health check results

Cons:
- Higher DNS query volume
- Slightly increased latency for first requests
- More load on DNS infrastructure

### High TTL (300+ seconds)

Pros:
- Better caching, lower DNS costs
- Reduced latency for repeat visitors

Cons:
- Slower failover - users may hit failed servers for minutes
- Health checks become less effective

### Recommended TTL Strategy

```yaml
# Production configuration
records:
  - name: api.example.com
    type: A
    ttl: 60                   # 60 seconds for failover-enabled records
    value: 192.0.2.1
    health_check: enabled

# Static resources that rarely change
  - name: cdn.example.com
    type: CNAME
    ttl: 3600                 # 1 hour for stable endpoints
    value: cdn.provider.com
```

For failover records, use TTLs between 30-60 seconds. The performance impact is minimal with modern DNS infrastructure, and the improved failover time is worth it.

---

## AWS Route 53 Health Checks

Route 53 provides robust health checking with multiple checker locations worldwide.

### Creating a Health Check

```bash
# Create HTTP health check using AWS CLI
aws route53 create-health-check \
  --caller-reference "api-primary-$(date +%s)" \
  --health-check-config '{
    "IPAddress": "192.0.2.1",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "FullyQualifiedDomainName": "api.example.com",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'
```

### Route 53 Failover Policy

```bash
# Create primary record with failover routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "primary",
        "Failover": "PRIMARY",
        "TTL": 60,
        "ResourceRecords": [{"Value": "192.0.2.1"}],
        "HealthCheckId": "health-check-id-primary"
      }
    }]
  }'

# Create secondary record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "secondary",
        "Failover": "SECONDARY",
        "TTL": 60,
        "ResourceRecords": [{"Value": "192.0.2.2"}],
        "HealthCheckId": "health-check-id-secondary"
      }
    }]
  }'
```

### Route 53 Health Check Options

```yaml
# Health check configuration options
health_check:
  type: HTTPS                 # HTTP, HTTPS, TCP, HTTPS_STR_MATCH, HTTP_STR_MATCH
  port: 443
  path: /health
  fqdn: api.example.com
  request_interval: 30        # 10 or 30 seconds
  failure_threshold: 3        # 1-10 failures before unhealthy
  measure_latency: true       # Enable latency measurements
  regions:                    # Checker locations
    - us-east-1
    - us-west-2
    - eu-west-1
  enable_sni: true            # Server Name Indication for HTTPS
  search_string: "healthy"    # For STR_MATCH types
```

---

## Cloudflare Health Checks

Cloudflare provides health checks through their Load Balancing feature.

### Pool and Health Check Setup

```bash
# Using Cloudflare API to create a pool with health checks

# Create a health check monitor
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/load_balancers/monitors" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "https",
    "description": "API health check",
    "method": "GET",
    "path": "/health",
    "header": {
      "Host": ["api.example.com"]
    },
    "port": 443,
    "timeout": 5,
    "retries": 2,
    "interval": 60,
    "expected_codes": "2xx",
    "expected_body": "healthy",
    "follow_redirects": true,
    "allow_insecure": false
  }'

# Create origin pool with the monitor
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/load_balancers/pools" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "api-pool",
    "description": "API server pool",
    "enabled": true,
    "minimum_origins": 1,
    "monitor": "{monitor_id}",
    "notification_email": "ops@example.com",
    "origins": [
      {
        "name": "server-1",
        "address": "192.0.2.1",
        "enabled": true,
        "weight": 1
      },
      {
        "name": "server-2",
        "address": "192.0.2.2",
        "enabled": true,
        "weight": 1
      }
    ]
  }'
```

### Cloudflare Load Balancer

```bash
# Create load balancer with failover
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/load_balancers" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "api.example.com",
    "description": "API load balancer with failover",
    "ttl": 30,
    "proxied": true,
    "enabled": true,
    "default_pools": ["{primary_pool_id}"],
    "fallback_pool": "{secondary_pool_id}",
    "steering_policy": "failover"
  }'
```

### Cloudflare Steering Policies

```yaml
# Available steering policies
steering_policies:
  off: "Use default pool only"
  failover: "Use pools in order, failover to next"
  random: "Random selection from healthy origins"
  dynamic_latency: "Route to lowest latency pool"
  geo: "Route based on user geography"
  proximity: "Route to nearest pool"
  least_outstanding: "Route to pool with fewest requests"
  least_connections: "Route to pool with fewest connections"
```

---

## Self-Hosted Solutions

For teams preferring self-hosted infrastructure, several options exist for DNS failover.

### PowerDNS with Lua Records

PowerDNS supports dynamic records using Lua scripts for health-aware responses.

```lua
-- /etc/pdns/lua-records/failover.lua
-- Dynamic A record with health checks

function failover(dname, bestwho, bestwhat)
    local servers = {
        {ip = "192.0.2.1", check = "http://192.0.2.1/health"},
        {ip = "192.0.2.2", check = "http://192.0.2.2/health"}
    }

    for _, server in ipairs(servers) do
        -- Simple HTTP health check
        local result = ifurlup(server.check, {{server.ip}})
        if result then
            return {server.ip}
        end
    end

    -- Return all if none healthy (let client retry)
    return {"192.0.2.1", "192.0.2.2"}
end
```

```sql
-- PowerDNS record configuration
INSERT INTO records (domain_id, name, type, content, ttl)
VALUES (
    1,
    'api.example.com',
    'LUA',
    'A "failover()"',
    60
);
```

### CoreDNS with Health Plugin

CoreDNS can perform health checks with the health plugin and forward to healthy upstreams.

```corefile
# /etc/coredns/Corefile
example.com {
    loadbalance round_robin

    # Health check every 5 seconds
    health {
        lameduck 5s
    }

    # Forward with health checks
    forward . 192.0.2.1 192.0.2.2 {
        health_check 5s
        policy round_robin
    }

    log
    errors
}
```

### HAProxy with DNS

Use HAProxy as a DNS-aware load balancer with health checks.

```haproxy
# /etc/haproxy/haproxy.cfg

global
    log stdout format raw local0

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httpchk GET /health

frontend api
    bind *:80
    default_backend api_servers

backend api_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ api.example.com

    # Health check every 3 seconds, mark down after 3 failures
    server server1 192.0.2.1:80 check inter 3000 fall 3 rise 2
    server server2 192.0.2.2:80 check inter 3000 fall 3 rise 2 backup
```

---

## Testing Failover

Before relying on failover in production, test it thoroughly.

### Manual Failover Testing

```bash
# 1. Verify current DNS resolution
dig api.example.com +short
# Expected: 192.0.2.1 (primary)

# 2. Stop health endpoint on primary server
# On primary server:
sudo systemctl stop nginx
# Or return unhealthy status from /health endpoint

# 3. Wait for health check interval + failure threshold
# For 30s interval and 3 failures: wait ~90-120 seconds

# 4. Verify DNS now returns secondary
dig api.example.com +short
# Expected: 192.0.2.2 (secondary)

# 5. Restore primary server
sudo systemctl start nginx

# 6. Verify DNS returns to primary
dig api.example.com +short
# Expected: 192.0.2.1 (primary)
```

### Automated Failover Testing

```python
#!/usr/bin/env python3
"""
DNS failover test script
Tests that DNS correctly fails over when health checks fail
"""

import dns.resolver
import requests
import time
import sys

# Configuration
DOMAIN = "api.example.com"
PRIMARY_IP = "192.0.2.1"
SECONDARY_IP = "192.0.2.2"
HEALTH_ENDPOINT = "/health"
CHECK_INTERVAL = 10  # seconds
MAX_WAIT_TIME = 180  # seconds

def resolve_dns(domain):
    """Resolve domain and return list of IPs"""
    try:
        answers = dns.resolver.resolve(domain, 'A')
        return [rdata.address for rdata in answers]
    except Exception as e:
        print(f"DNS resolution failed: {e}")
        return []

def check_health(ip):
    """Check if server is healthy"""
    try:
        response = requests.get(
            f"http://{ip}{HEALTH_ENDPOINT}",
            timeout=5,
            headers={"Host": DOMAIN}
        )
        return response.status_code == 200
    except:
        return False

def test_failover():
    """Test DNS failover behavior"""
    print(f"Testing DNS failover for {DOMAIN}")

    # Step 1: Verify initial state
    print("\n1. Checking initial state...")
    ips = resolve_dns(DOMAIN)
    print(f"   Current DNS: {ips}")

    if PRIMARY_IP not in ips:
        print("   WARNING: Primary IP not in DNS response")

    # Step 2: Verify primary is healthy
    print("\n2. Verifying primary server health...")
    if check_health(PRIMARY_IP):
        print(f"   Primary ({PRIMARY_IP}) is healthy")
    else:
        print(f"   ERROR: Primary ({PRIMARY_IP}) is not healthy")
        sys.exit(1)

    # Step 3: Simulate failure (manual step)
    print("\n3. Simulate failure on primary server now...")
    print("   (Stop the health endpoint or service)")
    input("   Press Enter when primary is unhealthy...")

    # Step 4: Wait for failover
    print("\n4. Waiting for DNS failover...")
    start_time = time.time()

    while time.time() - start_time < MAX_WAIT_TIME:
        ips = resolve_dns(DOMAIN)
        elapsed = int(time.time() - start_time)

        if PRIMARY_IP not in ips and SECONDARY_IP in ips:
            print(f"   SUCCESS: Failover detected after {elapsed} seconds")
            print(f"   DNS now returns: {ips}")
            return True

        print(f"   [{elapsed}s] DNS returns: {ips}")
        time.sleep(CHECK_INTERVAL)

    print(f"   FAILED: Failover did not occur within {MAX_WAIT_TIME} seconds")
    return False

if __name__ == "__main__":
    success = test_failover()
    sys.exit(0 if success else 1)
```

### Chaos Engineering Approach

```bash
# Use tc (traffic control) to simulate network issues
# This is less disruptive than stopping services

# Simulate 100% packet loss to health check port
sudo iptables -A OUTPUT -p tcp --dport 80 -d health-checker-ip -j DROP

# Wait for failover
sleep 120

# Verify failover occurred
dig api.example.com +short

# Remove the rule to restore
sudo iptables -D OUTPUT -p tcp --dport 80 -d health-checker-ip -j DROP
```

---

## Monitoring and Alerting

Failover is only useful if you know it happened. Set up monitoring for health check status and failover events.

### Key Metrics to Monitor

```yaml
# Essential metrics for DNS failover
metrics:
  health_check_status:
    description: "Current health status of each endpoint"
    alert_on: "Any endpoint unhealthy for > 5 minutes"

  failover_events:
    description: "Count of failover events"
    alert_on: "Any failover event"

  dns_resolution_time:
    description: "Time to resolve DNS"
    alert_on: "> 500ms p95"

  health_check_latency:
    description: "Response time of health endpoints"
    alert_on: "> 2 seconds"

  active_endpoints:
    description: "Number of healthy endpoints"
    alert_on: "< 2 endpoints healthy"
```

### Alert Configuration Example

```yaml
# Alerting rules for DNS failover
alerts:
  - name: HealthCheckFailed
    condition: health_check_status == "unhealthy"
    for: 2m
    severity: warning
    message: "Health check failing for {{ endpoint }}"

  - name: FailoverOccurred
    condition: failover_event == true
    severity: critical
    message: "DNS failover triggered - primary server unhealthy"

  - name: AllEndpointsUnhealthy
    condition: healthy_endpoints == 0
    severity: critical
    message: "All endpoints unhealthy - service degraded"

  - name: SingleEndpointRemaining
    condition: healthy_endpoints == 1
    for: 5m
    severity: warning
    message: "Only one healthy endpoint - no failover protection"
```

### Integration with OneUptime

[OneUptime](https://oneuptime.com) provides synthetic monitoring that can verify your failover is working correctly.

```yaml
# OneUptime monitor configuration
monitors:
  - name: API Failover Test
    type: synthetic
    url: https://api.example.com/health
    interval: 1m
    locations:
      - us-east
      - us-west
      - eu-west
    assertions:
      - type: status_code
        value: 200
      - type: response_time
        operator: less_than
        value: 2000
    alerts:
      - type: email
        recipients: [ops@example.com]
      - type: slack
        channel: "#incidents"
```

---

## Best Practices Summary

1. **Use appropriate TTLs** - Keep TTLs between 30-60 seconds for failover records. The small performance cost is worth the faster failover.

2. **Implement proper health endpoints** - Health checks should verify actual application health, not just return 200. Check database connectivity, cache availability, and critical dependencies.

3. **Test failover regularly** - Schedule quarterly failover drills. Untested failover is unreliable failover.

4. **Monitor health check status** - Alert on health check failures before failover occurs. Early warning lets you investigate proactively.

5. **Use multiple health check locations** - A single checker can have network issues. Multiple locations provide more reliable health assessment.

6. **Plan for split-brain scenarios** - In active-active setups, consider what happens if servers cannot communicate but both are serving traffic.

7. **Document your failover procedures** - Even with automated failover, teams need to know how to investigate and manually intervene if needed.

8. **Consider cascading failures** - If primary fails due to database issues, secondary might fail too. Ensure your failover actually provides resilience.

---

*Need comprehensive monitoring with health checks and synthetic testing? [OneUptime](https://oneuptime.com) provides DNS monitoring, uptime checks, and incident management in one platform. Start monitoring your infrastructure with our free tier today.*

**Related Reading:**
- [What is SLA, SLI and SLO's?](https://oneuptime.com/blog/post/2023-06-12-sli-sla-slo/view)
- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [Logs, Metrics and Traces: Turning Three Noisy Streams into One Story](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
