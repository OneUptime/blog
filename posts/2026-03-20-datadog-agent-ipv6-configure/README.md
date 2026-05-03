# How to Configure Datadog Agent for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, IPv6, Monitoring, Agent, Cloud Monitoring, Observability

Description: A guide to configuring the Datadog Agent to collect metrics from IPv6 hosts, including network checks, custom checks, and synthetic monitoring.

The Datadog Agent supports IPv6 communication with the Datadog backend and can monitor IPv6 services through its built-in and custom checks. This guide covers agent configuration for IPv6 environments.

## Step 1: Configure Datadog Agent on an IPv6 Host

The Datadog Agent automatically detects and reports the host's IPv6 addresses. No special configuration is needed for basic metric collection:

```yaml
# /etc/datadog-agent/datadog.yaml - Core agent configuration

api_key: "{{ your_datadog_api_key }}"
site: "datadoghq.com"

# Agent will bind to all interfaces by default
# For IPv6-only hosts, optionally specify the IPv6 address
bind_host: "::"

# Enable network monitoring
network_config:
  enabled: true

# Log IPv6 connectivity information
log_level: info
```

## Step 2: Configure Network Check for IPv6 Metrics

The `network` check collects per-interface statistics including IPv6 interfaces:

```yaml
# /etc/datadog-agent/conf.d/network.d/conf.yaml
init_config:

instances:
  - collect_connection_state: true
    # Include IPv6 interfaces in collection
    excluded_interfaces:
      - lo    # Exclude loopback
    # Collect IPv6 socket stats
    collect_rate_metrics: true
```

Metrics collected include:
- `system.net.bytes_rcvd` - per interface (covers IPv6 traffic on dual-stack interfaces)
- `system.net.bytes_sent`
- `system.net.tcp6.established` - IPv6 TCP connections

## Step 3: Configure HTTP Check for IPv6 Endpoints

```yaml
# /etc/datadog-agent/conf.d/http_check.d/conf.yaml
init_config:

instances:
  # Monitor an IPv6 HTTP endpoint - using an IPv6 literal in the URL
  # ensures the HTTP check connects over IPv6.
  - name: "IPv6 Web Server Check"
    url: "http://[2001:db8::10]:80/"
    timeout: 5
    tags:
      - "env:production"
      - "ip_family:ipv6"

  # Monitor an HTTPS endpoint - resolves over IPv6 when the host has IPv6
  # connectivity and the target hostname has an AAAA record.
  - name: "IPv6 HTTPS Check"
    url: "https://www.example.com/"
    timeout: 10
    tls_verify: true
```

## Step 4: Custom Check for IPv6 Connectivity

```python
# /etc/datadog-agent/checks.d/ipv6_connectivity.py
# Custom Datadog check for IPv6 connectivity
import subprocess
from datadog_checks.base import AgentCheck

class IPv6ConnectivityCheck(AgentCheck):
    def check(self, instance):
        target = instance.get('target', '2001:4860:4860::8888')

        try:
            # Run ping6 to the target
            result = subprocess.run(
                ['ping6', '-c', '3', '-W', '5', target],
                capture_output=True, timeout=15
            )

            if result.returncode == 0:
                # Extract packet loss percentage
                output = result.stdout.decode()
                self.gauge('ipv6.connectivity.up', 1, tags=[f'target:{target}'])
            else:
                self.gauge('ipv6.connectivity.up', 0, tags=[f'target:{target}'])

        except subprocess.TimeoutExpired:
            self.gauge('ipv6.connectivity.up', 0, tags=[f'target:{target}', 'reason:timeout'])
```

Configuration for the custom check:

```yaml
# /etc/datadog-agent/conf.d/ipv6_connectivity.d/conf.yaml
init_config:

instances:
  - target: "2001:4860:4860::8888"
    min_collection_interval: 60
  - target: "2606:4700:4700::1111"
    min_collection_interval: 60
```

## Step 5: Datadog Network Performance Monitoring (NPM) for IPv6

Enable NPM to get per-flow IPv6 traffic visibility:

```yaml
# /etc/datadog-agent/datadog.yaml
network_config:
  enabled: true

system_probe_config:
  enabled: true
```

## Step 6: Create a Monitor for IPv6 Endpoint Health

```bash
# Create a Datadog monitor for IPv6 connectivity via API
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "DD-API-KEY: $DD_API_KEY" \
  -H "DD-APPLICATION-KEY: $DD_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "metric alert",
    "query": "avg(last_5m):avg:ipv6.connectivity.up{*} by {target} < 1",
    "name": "IPv6 Connectivity Down",
    "message": "IPv6 connectivity to {{target.name}} is DOWN @pagerduty-production",
    "tags": ["env:production", "check:ipv6-connectivity"]
  }'
```

## Verify Agent Is Collecting IPv6 Metrics

```bash
# Run agent status to see check statuses
datadog-agent status | grep -i ipv6

# Run the HTTP check manually
datadog-agent check http_check

# Run the custom check
datadog-agent check ipv6_connectivity
```

The Datadog Agent's HTTP check (using IPv6-literal URLs) and custom check capabilities make it straightforward to build comprehensive IPv6 monitoring coverage alongside standard infrastructure metrics.
