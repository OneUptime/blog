# How to Set Up IPv6 Network Monitoring with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, OneUptime, Monitoring, Networking, Observability, DevOps

Description: A complete guide to configuring IPv6 network monitoring in OneUptime, covering setup, alerting, troubleshooting, and best practices for modern dual-stack infrastructure.

---

The internet is running out of IPv4 addresses. Actually, it already has. Regional Internet Registries exhausted their pools years ago, and the only reason the legacy protocol still functions is a patchwork of NAT, address trading, and creative conservation. Meanwhile, IPv6 adoption continues its steady climb, with major cloud providers, CDNs, and mobile carriers now routing significant traffic over the newer protocol.

If your infrastructure supports IPv6, you need to monitor it. If you plan to support IPv6, you need to monitor it even more carefully during the transition. Blind spots in IPv6 connectivity can silently break mobile users, degrade performance for customers on modern networks, and create hard-to-diagnose incidents that only affect a subset of traffic.

This guide walks you through setting up comprehensive IPv6 network monitoring with OneUptime. Whether you are monitoring a single IPv6-enabled service or managing a global dual-stack infrastructure, you will find practical configuration steps, alerting strategies, and troubleshooting techniques.

---

## Why IPv6 Monitoring Matters

IPv6 is not simply IPv4 with longer addresses. The protocol brings fundamental changes to how packets are routed, how addresses are assigned, and how networks are segmented. These differences create unique monitoring challenges.

### Dual-Stack Complexity

Most production environments run dual-stack configurations, serving traffic over both IPv4 and IPv6. This creates multiple failure modes:

- IPv6 connectivity fails while IPv4 remains healthy
- DNS returns AAAA records but the IPv6 path is broken
- Firewalls block IPv6 traffic but allow IPv4
- Load balancers route IPv6 differently than IPv4
- CDN edge nodes have inconsistent IPv6 support

Without dedicated IPv6 monitoring, these issues can persist for hours or days. Users on IPv6-preferring networks (common on mobile) experience failures while your IPv4 monitors show green.

### Mobile-First Traffic

Mobile carriers have led IPv6 adoption because they face the most acute address scarcity. In many regions, mobile traffic is predominantly IPv6. If your monitoring only covers IPv4, you are blind to how most mobile users experience your service.

### Cloud Provider Requirements

Major cloud platforms now provision IPv6 by default for many services. Kubernetes clusters, serverless functions, and managed databases increasingly use IPv6 for internal communication. Monitoring these endpoints requires IPv6 capability.

### Regulatory and Compliance

Some government and enterprise contracts require IPv6 support. Monitoring proves compliance and catches configuration drift before audits.

---

## OneUptime IPv6 Monitoring Capabilities

OneUptime provides native IPv6 support across all monitor types. You can monitor IPv6 endpoints using:

- **IP Monitors**: Check reachability of IPv6 addresses directly
- **Port Monitors**: Verify that services accept connections on IPv6
- **Website Monitors**: Test HTTP/HTTPS endpoints over IPv6
- **Synthetic Monitors**: Run complex user journeys over IPv6 paths
- **SSL Certificate Monitors**: Validate certificates served over IPv6

All probe locations support IPv6, and you can deploy self-hosted probes in IPv6-only or dual-stack networks.

---

## Setting Up Your First IPv6 Monitor

Let us start with the simplest case: monitoring the reachability of an IPv6 address.

### Step 1: Gather Your IPv6 Addresses

Before creating monitors, inventory the IPv6 addresses you need to track. Common sources include:

- DNS AAAA records for your domains
- Cloud provider console or API (EC2, GCE, Azure VMs)
- Container orchestrator outputs (kubectl get services)
- Load balancer configurations
- CDN edge node lists

Document each address with its purpose and owning team. This metadata helps during incident response.

### Step 2: Create an IP Monitor for IPv6

From the OneUptime dashboard:

1. Navigate to **Monitors** and click **Add Monitor**.
2. Select **IP** as the monitor type.
3. Enter a descriptive name such as "Production API IPv6" or "Edge Node Frankfurt IPv6".
4. In the **IP Address** field, enter the full IPv6 address.

IPv6 addresses can be entered in several formats:

- Full notation: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`
- Compressed notation: `2001:db8:85a3::8a2e:370:7334`
- With brackets (for URLs): `[2001:db8:85a3::8a2e:370:7334]`

OneUptime accepts all standard formats and validates the address before saving.

### Step 3: Configure Probe Locations

Select which probe locations will check this address. Consider:

- **Geographic coverage**: Choose probes near your users
- **Network diversity**: Mix cloud and non-cloud probes to catch provider-specific issues
- **IPv6 capability**: Verify the probe location has IPv6 connectivity (all OneUptime probes do)

For critical services, use at least three geographically distributed probes. This helps distinguish between localized network issues and actual service outages.

### Step 4: Set the Check Interval

The check interval determines how quickly you detect outages. Common configurations:

- **1 minute**: Critical user-facing services
- **5 minutes**: Internal services and secondary endpoints
- **15 minutes**: Low-priority or development environments

Balance detection speed against probe load. More frequent checks consume more resources but catch issues faster.

### Step 5: Configure Alert Rules

By default, OneUptime creates an incident when the IP becomes unreachable. Customize this behavior:

- **Failure threshold**: Require multiple consecutive failures before alerting (reduces false positives from transient network issues)
- **Success threshold**: Require multiple consecutive successes before auto-resolving (prevents flapping)
- **Severity levels**: Map different conditions to different incident severities

For IPv6 monitoring specifically, consider setting a slightly higher failure threshold than IPv4 monitors. IPv6 routing can experience more transient issues, especially on less-mature network paths.

### Step 6: Connect Notifications

Link the monitor to your alerting workflow:

- **On-call rotations**: Route alerts to the appropriate team based on time and ownership
- **Chat channels**: Post to Slack, Microsoft Teams, or Discord
- **Email**: Notify stakeholders who need awareness but not pages
- **Webhooks**: Trigger automated remediation scripts

Save the monitor and watch the first check complete. The timeline view shows each probe result with response time and status.

---

## Monitoring IPv6 Service Ports

IP reachability confirms network connectivity, but services can be down even when the host responds to ping. Port monitors verify that specific services accept connections.

### Creating an IPv6 Port Monitor

1. Navigate to **Monitors** and click **Add Monitor**.
2. Select **Port** as the monitor type.
3. Enter a descriptive name like "PostgreSQL Primary IPv6:5432".
4. In the **Hostname** field, enter the IPv6 address.
5. Specify the **Port Number** (e.g., 443, 5432, 6379).

OneUptime connects to the specified port and verifies that the service accepts TCP connections. For services that speak TLS, enable the **TLS** option to validate the connection completes the handshake.

### Common IPv6 Port Monitoring Scenarios

**Web Servers**

Monitor ports 80 and 443 on all IPv6-enabled web servers. Compare response times between IPv4 and IPv6 to catch routing inefficiencies.

```plaintext
Example configuration:
- Host: 2001:db8:1::80
- Port: 443
- TLS: Enabled
- Interval: 1 minute
```

**Database Servers**

Monitor database ports from application networks to verify that IPv6 connectivity works end-to-end.

```plaintext
Example configuration:
- Host: 2001:db8:2::db
- Port: 5432
- Interval: 1 minute
- Alert threshold: 2 consecutive failures
```

**Cache Servers**

Redis and Memcached servers handling IPv6 connections need monitoring, especially in containerized environments where addresses can change.

```plaintext
Example configuration:
- Host: 2001:db8:3::cache
- Port: 6379
- Interval: 1 minute
```

**Message Queues**

Monitor RabbitMQ, Kafka, or other message broker ports to catch IPv6-specific connectivity issues before they cause message delivery failures.

```plaintext
Example configuration:
- Host: 2001:db8:4::mq
- Port: 5672
- Interval: 2 minutes
```

---

## Website Monitoring Over IPv6

Website monitors provide the most complete view of user experience because they test the full HTTP stack. You can force monitors to use IPv6 exclusively.

### Creating an IPv6 Website Monitor

1. Navigate to **Monitors** and click **Add Monitor**.
2. Select **Website** as the monitor type.
3. Enter a descriptive name like "Production Website IPv6 Only".
4. Enter the URL with the IPv6 address in brackets: `https://[2001:db8::1]/health`

Alternatively, if your DNS returns both A and AAAA records, you can configure the monitor to prefer or require IPv6 resolution.

### Monitoring Dual-Stack Endpoints

For comprehensive dual-stack monitoring, create parallel monitors:

| Monitor Name | URL/Target | Protocol |
|--------------|------------|----------|
| API IPv4 | https://api.example.com (force IPv4) | IPv4 |
| API IPv6 | https://api.example.com (force IPv6) | IPv6 |
| API Auto | https://api.example.com (system default) | Dual |

This configuration catches:
- IPv6-only failures (API IPv6 fails, API IPv4 succeeds)
- IPv4-only failures (API IPv4 fails, API IPv6 succeeds)
- Total outages (both fail)
- Resolution issues (API Auto fails, direct IP monitors succeed)

### Testing HTTP Response Content Over IPv6

Website monitors can validate response content, not just connectivity. Configure assertions to verify:

- **Status code**: Expect 200 or specific codes
- **Response body contains**: Check for expected strings
- **Response body does not contain**: Catch error messages
- **Response headers**: Verify server headers
- **Response time**: Alert on slow IPv6 responses

Example assertions for an API health endpoint:

```json
{
  "assertions": [
    {
      "type": "status_code",
      "operator": "equals",
      "value": 200
    },
    {
      "type": "body_contains",
      "value": "\"status\":\"healthy\""
    },
    {
      "type": "response_time",
      "operator": "less_than",
      "value": 500
    }
  ]
}
```

---

## SSL Certificate Monitoring for IPv6

SSL certificates must be valid regardless of how users connect. Certificate monitors verify that IPv6 endpoints serve correct, unexpired certificates.

### Why IPv6 SSL Monitoring Matters

Misconfigured servers might serve different certificates over IPv4 and IPv6. This happens when:

- Load balancers have inconsistent TLS configurations
- IPv6 traffic routes to different backend servers
- Certificate renewal scripts only update IPv4 listeners
- CDN IPv6 nodes have stale certificates

### Creating an IPv6 SSL Monitor

1. Navigate to **Monitors** and click **Add Monitor**.
2. Select **SSL Certificate** as the monitor type.
3. Enter a descriptive name like "API SSL Certificate IPv6".
4. Enter the hostname or IPv6 address.
5. Configure expiration warnings (default: 30, 14, and 7 days).

### Certificate Monitoring Best Practices

- Monitor certificates on both IPv4 and IPv6 endpoints
- Set expiration alerts with enough lead time for renewal workflows
- Include staging environments to catch renewal issues before production
- Document certificate ownership and renewal procedures in runbooks

---

## Building a Comprehensive IPv6 Monitoring Dashboard

Individual monitors provide point-in-time status. Dashboards aggregate this information into actionable views.

### Recommended Dashboard Sections

**IPv6 Health Overview**

Display an at-a-glance status of all IPv6 monitors grouped by:
- Service tier (critical, standard, development)
- Geographic region
- Monitor type (IP, port, website, SSL)

**Dual-Stack Comparison**

Show side-by-side IPv4 and IPv6 metrics for the same services:
- Availability percentage
- Average response time
- P95/P99 latency
- Error rates

This comparison reveals IPv6-specific performance issues that raw numbers might hide.

**IPv6 Response Time Trends**

Graph IPv6 response times over time to identify:
- Routing changes
- Network degradation
- Time-of-day patterns
- Correlation with incidents

**Incident Timeline**

Display recent IPv6-related incidents with:
- Time to detection
- Time to resolution
- Root cause category
- Affected services

---

## Configuring IPv6-Specific Alerts

Generic alerts work for IPv6, but tailored alert rules improve signal quality.

### Alert Rule Examples

**IPv6 Connectivity Loss**

Trigger when any IPv6 monitor fails while the corresponding IPv4 monitor succeeds. This catches IPv6-specific outages.

```yaml
name: IPv6 Connectivity Loss
condition:
  monitor_group: ipv6
  status: offline
  duration: 3 minutes
severity: critical
notification:
  - on_call_rotation: network_team
  - channel: #ipv6-alerts
```

**IPv6 Performance Degradation**

Alert when IPv6 response times exceed IPv4 by a significant margin.

```yaml
name: IPv6 Performance Degradation
condition:
  metric: response_time
  comparison: ipv6_vs_ipv4
  threshold: 50% slower
  duration: 10 minutes
severity: warning
notification:
  - channel: #network-performance
```

**IPv6 SSL Certificate Expiring**

Dedicated alerts for IPv6 SSL certificates with appropriate lead times.

```yaml
name: IPv6 SSL Expiry Warning
condition:
  monitor_type: ssl_certificate
  endpoint_protocol: ipv6
  days_until_expiry: 14
severity: warning
notification:
  - email: security-team@example.com
```

### Reducing Alert Noise

IPv6 networks can experience more transient issues than IPv4. Reduce noise without missing real incidents:

- **Increase failure thresholds**: Require 2-3 consecutive failures before alerting
- **Use multiple probe locations**: Only alert when multiple probes report failure
- **Implement alert deduplication**: Group related IPv6 alerts into single incidents
- **Configure maintenance windows**: Suppress alerts during planned network changes

---

## Integrating IPv6 Monitoring with Incident Management

Monitors detect problems. Incident management coordinates response. Connect them for effective operations.

### Automatic Incident Creation

Configure OneUptime to create incidents automatically when IPv6 monitors fail:

1. Navigate to **On-Call Duty** and configure escalation policies.
2. Link monitor alert rules to incident creation.
3. Set incident severity based on monitor criticality.
4. Configure auto-resolution when monitors recover.

### Incident Templates for IPv6 Issues

Create templates that streamline IPv6 incident response:

**Template: IPv6 Connectivity Incident**

```markdown
## Summary
IPv6 connectivity to [SERVICE] is degraded or unavailable.

## Impact
- Users on IPv6-preferring networks (mobile, modern ISPs) may experience failures
- Estimated user impact: [PERCENTAGE]% of traffic

## Initial Checklist
- [ ] Verify IPv4 connectivity (confirm IPv6-specific issue)
- [ ] Check DNS AAAA records
- [ ] Verify firewall rules for IPv6
- [ ] Check load balancer IPv6 listeners
- [ ] Review recent network changes

## Escalation
- Network team: [CONTACT]
- Cloud provider support: [TICKET_PROCESS]
```

### Status Page Updates

Configure your status page to reflect IPv6-specific incidents:

1. Create a component for "IPv6 Connectivity" or "IPv6-enabled Services".
2. Link monitors to the component.
3. Configure automatic status updates based on monitor state.
4. Provide subscriber notifications for IPv6 incidents.

Users on IPv6 networks appreciate knowing that you are aware of and working on issues specific to their connectivity.

---

## Troubleshooting Common IPv6 Monitoring Issues

When IPv6 monitors report failures, systematic troubleshooting identifies root causes quickly.

### Issue: Monitor Shows Offline, But Service Works Manually

**Possible causes:**

1. **Firewall blocking probe IPs**: Add OneUptime probe IP ranges to allow lists.
2. **Path MTU discovery issues**: IPv6 relies on Path MTU Discovery; blocked ICMPv6 breaks it.
3. **Routing asymmetry**: Outbound packets use different paths than inbound.
4. **DNS resolution differences**: Probe resolves to different address than your test.

**Diagnostic steps:**

```bash
# Test from probe location if you have access
ping6 -c 4 2001:db8::1

# Check MTU
ping6 -c 4 -s 1452 2001:db8::1

# Verify route
traceroute6 2001:db8::1

# Check DNS resolution
dig AAAA example.com @8.8.8.8
dig AAAA example.com @2001:4860:4860::8888
```

### Issue: Intermittent IPv6 Failures

**Possible causes:**

1. **BGP route flapping**: IPv6 routing tables can be less stable than IPv4.
2. **Tunnel instability**: If IPv6 uses tunneling (6to4, Teredo), the tunnel can fail.
3. **Load balancer health checks**: Backend servers cycling in/out of rotation.
4. **Rate limiting**: IPv6 requests hitting different rate limits.

**Diagnostic steps:**

- Compare failure times across multiple probe locations
- Check provider status pages for network issues
- Review load balancer logs for health check failures
- Analyze traffic patterns around failure times

### Issue: IPv6 Monitors Slower Than IPv4

**Possible causes:**

1. **Suboptimal routing**: IPv6 paths may traverse more hops or slower links.
2. **Provider peering**: IPv6 peering arrangements differ from IPv4.
3. **Server configuration**: IPv6 listeners may have different settings.
4. **DNS resolution time**: AAAA lookups may be slower than A lookups.

**Diagnostic steps:**

```bash
# Compare routes
traceroute api.example.com
traceroute6 api.example.com

# Compare DNS resolution time
time dig A api.example.com
time dig AAAA api.example.com

# Compare connection times
curl -4 -w "%{time_connect}\n" -o /dev/null -s https://api.example.com
curl -6 -w "%{time_connect}\n" -o /dev/null -s https://api.example.com
```

### Issue: SSL Certificate Errors Only on IPv6

**Possible causes:**

1. **Certificate mismatch**: IPv6 endpoint serves different certificate.
2. **SNI issues**: Server not handling Server Name Indication correctly on IPv6.
3. **Load balancer configuration**: IPv6 listener has stale certificate.
4. **CDN configuration**: IPv6 edge nodes have different TLS settings.

**Diagnostic steps:**

```bash
# Compare certificates
openssl s_client -connect api.example.com:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -text
openssl s_client -connect [2001:db8::1]:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -text
```

---

## Self-Hosted Probes for IPv6 Monitoring

OneUptime's managed probes cover most scenarios, but some environments require self-hosted probes:

- **Private IPv6 networks**: Internal addresses not routable from the internet
- **Specific network perspectives**: Test from your data center or cloud VPC
- **Compliance requirements**: Keep probe traffic within certain boundaries

### Deploying an IPv6-Capable Probe

1. Ensure the host has IPv6 connectivity:

```bash
# Verify IPv6 is enabled
ip -6 addr show

# Test IPv6 connectivity
ping6 -c 4 2001:4860:4860::8888
```

2. Deploy the OneUptime probe using Docker:

```bash
docker run -d \
  --name oneuptime-probe \
  --network host \
  -e PROBE_KEY=your-probe-key \
  -e ONEUPTIME_URL=https://oneuptime.com \
  oneuptime/probe:latest
```

The `--network host` flag ensures the container uses the host's IPv6 stack.

3. Verify the probe appears in your OneUptime dashboard and can reach IPv6 targets.

### Kubernetes Deployment for IPv6 Probes

For Kubernetes environments with IPv6:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oneuptime-probe
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oneuptime-probe
  template:
    metadata:
      labels:
        app: oneuptime-probe
    spec:
      hostNetwork: true
      containers:
      - name: probe
        image: oneuptime/probe:latest
        env:
        - name: PROBE_KEY
          valueFrom:
            secretKeyRef:
              name: oneuptime-probe-secret
              key: probe-key
        - name: ONEUPTIME_URL
          value: "https://oneuptime.com"
```

Ensure your Kubernetes cluster has IPv6 enabled and properly configured.

---

## Best Practices for Production IPv6 Monitoring

These practices help you build reliable, maintainable IPv6 monitoring.

### 1. Monitor Both Protocols for Critical Services

Never assume IPv4 health implies IPv6 health. Create parallel monitors for any service that handles production traffic.

### 2. Use Meaningful Monitor Names

Include the protocol in monitor names:
- Good: "Payment API IPv6", "Payment API IPv4"
- Bad: "Payment API 1", "Payment API 2"

Clear names reduce confusion during incidents.

### 3. Document IPv6 Dependencies

Maintain a dependency map showing which services require IPv6 connectivity. Update this map when adding monitors.

### 4. Test Failover Scenarios

If your architecture fails over between IPv4 and IPv6, test that failover works. Configure monitors to detect when failover engages.

### 5. Monitor IPv6 at Multiple Layers

Combine different monitor types for comprehensive coverage:

| Layer | Monitor Type | Example |
|-------|--------------|---------|
| Network | IP Monitor | Ping IPv6 address |
| Transport | Port Monitor | TCP connect to port |
| Application | Website Monitor | HTTP request with assertions |
| Security | SSL Monitor | Certificate validation |

### 6. Set Appropriate Thresholds

IPv6 networks may have different baseline performance. Analyze historical data before setting alert thresholds.

### 7. Include IPv6 in Runbooks

Update incident runbooks to include IPv6-specific diagnostic steps. Train on-call responders to troubleshoot IPv6 issues.

### 8. Review Regularly

Schedule quarterly reviews of IPv6 monitoring coverage. As your infrastructure evolves, ensure monitors keep pace.

---

## IPv6 Monitoring Checklist

Use this checklist when implementing IPv6 monitoring for a new service.

### Discovery Phase

- [ ] Identify all IPv6-enabled endpoints
- [ ] Document IPv6 addresses and their purposes
- [ ] Map IPv6 dependencies
- [ ] Identify critical user paths that traverse IPv6

### Implementation Phase

- [ ] Create IP monitors for IPv6 addresses
- [ ] Create port monitors for IPv6 services
- [ ] Create website monitors for IPv6 HTTP endpoints
- [ ] Create SSL monitors for IPv6 TLS endpoints
- [ ] Configure probe locations for geographic coverage
- [ ] Set appropriate check intervals

### Alerting Phase

- [ ] Configure alert rules for IPv6 monitors
- [ ] Set up dual-stack comparison alerts
- [ ] Link alerts to on-call rotations
- [ ] Configure notification channels
- [ ] Create incident templates

### Documentation Phase

- [ ] Update runbooks with IPv6 procedures
- [ ] Document escalation paths
- [ ] Create status page components
- [ ] Train team on IPv6 troubleshooting

### Validation Phase

- [ ] Verify monitors are collecting data
- [ ] Test alerting workflows
- [ ] Confirm dashboard visibility
- [ ] Validate incident creation

---

## Summary Table: IPv6 Monitor Configuration Reference

| Monitor Type | Use Case | Key Configuration | Recommended Interval |
|--------------|----------|-------------------|---------------------|
| IP Monitor | Network reachability | IPv6 address, multiple probes | 1-5 minutes |
| Port Monitor | Service availability | IPv6 address, port number, TLS option | 1-5 minutes |
| Website Monitor | HTTP endpoint health | URL with IPv6, assertions | 1-5 minutes |
| SSL Monitor | Certificate validity | IPv6 endpoint, expiry thresholds | 1 hour - 1 day |
| Synthetic Monitor | User journey testing | IPv6 network path, multi-step scripts | 5-15 minutes |

---

## Conclusion

IPv6 monitoring is not optional for modern infrastructure. Mobile users, cloud platforms, and regulatory requirements all push toward IPv6 adoption. Without monitoring, you are blind to how a significant portion of your users experience your service.

OneUptime provides the tools you need to monitor IPv6 endpoints effectively. Native IPv6 support across all monitor types, flexible probe locations, and integrated incident management make it straightforward to build comprehensive dual-stack monitoring.

Start with your most critical services. Create parallel IPv4 and IPv6 monitors. Configure alerts that distinguish between protocol-specific and total outages. Build dashboards that show dual-stack performance side by side. Document IPv6 procedures in your runbooks.

The transition to IPv6 is gradual but inevitable. Monitoring prepares you for that transition and ensures you catch issues before your users report them.

---

## Related Resources

- [Monitor Every IP Address with OneUptime](https://oneuptime.com/blog/post/2025-10-27-monitor-ip-addresses-with-oneuptime/view)
- [Keep Critical Ports Available with OneUptime](https://oneuptime.com/blog/post/2025-10-27-monitor-service-ports-with-oneuptime/view)
- [The Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Why You Need a Status Page](https://oneuptime.com/blog/post/2025-10-27-why-you-need-a-status-page/view)
