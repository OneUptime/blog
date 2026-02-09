# How to use Grafana Synthetic Monitoring for uptime checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Synthetic Monitoring, Uptime

Description: Learn how to implement Grafana Synthetic Monitoring to proactively test endpoints, APIs, and multi-step user flows from locations worldwide.

---

Real-user monitoring shows you what actual users experience, but it can't tell you about problems before users encounter them. Grafana Synthetic Monitoring proactively tests your services from multiple locations, catching issues before they impact users and validating that critical user journeys work end-to-end.

## Understanding Synthetic Monitoring

Synthetic monitoring simulates user interactions by running automated tests against your applications at regular intervals. Unlike passive monitoring that waits for problems to occur, synthetic monitoring actively probes your services to verify they're working correctly.

Grafana Synthetic Monitoring extends this concept by integrating directly with your existing Grafana stack, storing check results as metrics in Prometheus and logs in Loki.

## Setting Up Grafana Synthetic Monitoring

For Grafana Cloud users, Synthetic Monitoring is available as a built-in feature. For self-hosted deployments, install the synthetic monitoring agent.

```bash
# Download and install the synthetic monitoring agent
wget https://github.com/grafana/synthetic-monitoring-agent/releases/latest/download/synthetic-monitoring-agent-linux-amd64

chmod +x synthetic-monitoring-agent-linux-amd64
sudo mv synthetic-monitoring-agent-linux-amd64 /usr/local/bin/synthetic-monitoring-agent

# Create configuration
sudo mkdir -p /etc/synthetic-monitoring

cat > /etc/synthetic-monitoring/config.yaml <<EOF
api:
  url: https://synthetic-monitoring-api.grafana.net
  token: YOUR_API_TOKEN

prometheus:
  url: http://prometheus:9090
  username: ""
  password: ""

loki:
  url: http://loki:3100
  username: ""
  password: ""
EOF

# Run the agent
synthetic-monitoring-agent -config /etc/synthetic-monitoring/config.yaml
```

## Creating HTTP Endpoint Checks

Start with simple HTTP checks to verify endpoint availability and response time.

```bash
# Create an HTTP check via API
curl -X POST https://synthetic-monitoring-api.grafana.net/api/v1/checks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job": "api-health-check",
    "target": "https://api.example.com/health",
    "enabled": true,
    "frequency": 60000,
    "timeout": 10000,
    "probes": [1, 2, 3],
    "settings": {
      "http": {
        "method": "GET",
        "headers": [
          "Authorization: Bearer token123"
        ],
        "body": "",
        "validStatusCodes": [200],
        "validHTTPVersions": ["HTTP/1.1", "HTTP/2.0"],
        "failIfSSL": false,
        "failIfNotSSL": false,
        "tlsConfig": {
          "insecureSkipVerify": false
        }
      }
    },
    "labels": [
      {
        "name": "environment",
        "value": "production"
      }
    ]
  }'
```

This check runs every 60 seconds from three probe locations.

## Validating Response Content

Check not just that endpoints respond, but that they return expected content.

```json
{
  "job": "api-validation",
  "target": "https://api.example.com/status",
  "settings": {
    "http": {
      "method": "GET",
      "validStatusCodes": [200],
      "validationRegex": "\"status\":\\s*\"healthy\"",
      "failIfBodyNotMatchesRegexp": ["\"status\":\\s*\"healthy\""],
      "failIfBodyMatchesRegexp": ["error", "failed"],
      "headers": [
        "Accept: application/json"
      ]
    }
  }
}
```

The check fails if the response doesn't contain `"status": "healthy"` or if it contains error keywords.

## Implementing Multi-Step Checks

Test complete user flows with scripted browser checks using the Playwright-based scripting.

```javascript
// checkout-flow.js
import { check } from 'k6';
import http from 'k6/http';

export default function() {
  // Step 1: Visit homepage
  let response = http.get('https://shop.example.com');
  check(response, {
    'homepage loaded': (r) => r.status === 200,
    'has products': (r) => r.body.includes('Add to Cart')
  });

  // Step 2: Add item to cart
  response = http.post('https://shop.example.com/api/cart', JSON.stringify({
    product_id: 12345,
    quantity: 1
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(response, {
    'item added': (r) => r.status === 200,
    'cart updated': (r) => JSON.parse(r.body).items.length > 0
  });

  // Step 3: Proceed to checkout
  response = http.get('https://shop.example.com/checkout');
  check(response, {
    'checkout loaded': (r) => r.status === 200,
    'has payment form': (r) => r.body.includes('payment-form')
  });

  // Step 4: Verify checkout can be completed
  // (Don't actually complete purchase in synthetic tests)
  check(response, {
    'checkout flow working': (r) => r.status === 200
  });
}
```

## Monitoring DNS Resolution

Check DNS resolution speed and correctness.

```json
{
  "job": "dns-check",
  "target": "example.com",
  "settings": {
    "dns": {
      "recordType": "A",
      "server": "8.8.8.8",
      "port": 53,
      "protocol": "UDP",
      "validRCodes": ["NOERROR"],
      "validateAnswerRRS": {
        "failIfMatchesRegexp": [],
        "failIfNotMatchesRegexp": ["^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$"]
      },
      "validateAuthorityRRS": {},
      "validateAdditionalRRS": {}
    }
  }
}
```

This verifies that DNS resolves correctly and returns valid IP addresses.

## Testing TCP and SSL Certificates

Monitor TCP port availability and SSL certificate validity.

```json
{
  "job": "tcp-ssl-check",
  "target": "api.example.com:443",
  "settings": {
    "tcp": {
      "tlsConfig": {
        "insecureSkipVerify": false,
        "serverName": "api.example.com"
      },
      "queryResponse": [],
      "tls": true
    }
  }
}
```

The check validates that the TCP connection succeeds and the SSL certificate is valid and not expiring soon.

## Setting Up Ping Checks

Monitor network latency with ICMP ping checks.

```json
{
  "job": "ping-check",
  "target": "8.8.8.8",
  "settings": {
    "ping": {
      "ipVersion": "V4",
      "dontFragment": false,
      "payloadSize": 0
    }
  },
  "frequency": 10000,
  "timeout": 3000
}
```

Ping checks help identify network connectivity issues separate from application problems.

## Configuring Global Probe Locations

Run checks from multiple geographic locations to ensure global availability.

```bash
# List available probe locations
curl -X GET https://synthetic-monitoring-api.grafana.net/api/v1/probes \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Response shows available probes:
# - US East (Virginia)
# - US West (California)
# - EU West (Ireland)
# - Asia Pacific (Singapore)
# - etc.

# Configure check to run from multiple locations
{
  "job": "global-availability",
  "target": "https://api.example.com",
  "probes": [1, 4, 7, 10],  # IDs for US East, US West, EU, Asia
  "frequency": 30000
}
```

Multi-location checks reveal regional availability issues and performance variations.

## Creating Alerts on Check Failures

Alert when synthetic checks fail or performance degrades.

```promql
# Alert when check success rate drops below 95%
(
  sum(rate(probe_success_total{job="api-health-check"}[5m]))
  /
  sum(rate(probe_all_total{job="api-health-check"}[5m]))
) < 0.95

# Alert when response time exceeds threshold
probe_duration_seconds{job="api-health-check"} > 2

# Alert when SSL certificate expires soon
probe_ssl_earliest_cert_expiry{job="tcp-ssl-check"} - time() < 86400 * 7

# Alert when check fails from multiple locations
count by (job) (
  probe_success{job="api-health-check"} == 0
) >= 2
```

These alerts catch issues before users report them.

## Visualizing Synthetic Monitoring Data

Create dashboards showing check results and trends.

```json
{
  "panels": [
    {
      "title": "Check Success Rate",
      "targets": [
        {
          "expr": "avg(rate(probe_success_total[5m])) by (job)"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percentunit",
          "min": 0,
          "max": 1
        }
      }
    },
    {
      "title": "Response Time by Location",
      "targets": [
        {
          "expr": "probe_duration_seconds",
          "legendFormat": "{{probe}} - {{job}}"
        }
      ]
    },
    {
      "title": "SSL Certificate Expiry",
      "targets": [
        {
          "expr": "(probe_ssl_earliest_cert_expiry - time()) / 86400",
          "legendFormat": "{{instance}}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "days"
        }
      }
    },
    {
      "title": "Failed Checks",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"synthetic-monitoring\"} |= \"failed\"",
          "refId": "A"
        }
      ]
    }
  ]
}
```

## Implementing Check Dependencies

Configure checks that only run when dependent services are available.

```bash
# Primary service check
{
  "job": "database-check",
  "target": "db.example.com:5432",
  "enabled": true
}

# Dependent check - only alert if primary is healthy
# In alert rules:
probe_success{job="api-check"} == 0
and
probe_success{job="database-check"} == 1
```

This prevents cascading alerts when an upstream dependency fails.

## Monitoring API Rate Limits

Track API usage and alert before hitting rate limits.

```json
{
  "job": "api-rate-limit-check",
  "target": "https://api.example.com/status",
  "settings": {
    "http": {
      "method": "GET",
      "headers": [
        "Authorization: Bearer token"
      ],
      "responseHeaders": {
        "X-RateLimit-Remaining": {
          "failIfNotPresent": true,
          "regexp": "",
          "allowMissing": false
        }
      }
    }
  }
}
```

Parse response headers to track remaining API quota:

```promql
# Extract rate limit from logs
sum(rate({job="synthetic-monitoring"} | json | __error__="" | line_format "{{.X_RateLimit_Remaining}}" | unwrap remaining [5m]))

# Alert when approaching limit
probe_http_header_value{header="X-RateLimit-Remaining"} < 100
```

## Testing Behind Authentication

Run checks against authenticated endpoints.

```json
{
  "job": "authenticated-api-check",
  "target": "https://api.example.com/private/data",
  "settings": {
    "http": {
      "method": "GET",
      "headers": [
        "Authorization: Bearer ${API_TOKEN}",
        "X-API-Key: ${API_KEY}"
      ],
      "validStatusCodes": [200],
      "basicAuth": {
        "username": "${BASIC_AUTH_USER}",
        "password": "${BASIC_AUTH_PASS}"
      }
    }
  }
}
```

Store credentials securely and reference them via environment variables or secrets management.

## Best Practices for Synthetic Monitoring

Run checks at frequencies appropriate to your SLA. Critical services warrant checks every 30-60 seconds, while less critical services can be checked every few minutes.

Test from multiple geographic locations to catch regional issues and CDN problems.

Validate response content, not just status codes. A 200 response with error content is still a failure.

Use realistic user flows for multi-step checks. Test the paths your users actually take.

Set appropriate timeouts. Don't fail checks prematurely, but don't wait so long that real users would give up.

Monitor check execution time separately from target response time to identify agent issues.

Create dedicated test endpoints for synthetic monitoring rather than using production endpoints that might trigger side effects.

Alert on patterns, not individual failures. A single failed check might be a transient issue, but multiple failures indicate a real problem.

Document what each check validates and why it matters. This helps during incident response and check maintenance.

Review and update checks regularly as your application evolves. Remove checks for deprecated endpoints and add checks for new critical paths.

Grafana Synthetic Monitoring transforms uptime monitoring from reactive to proactive. By continuously validating that your services work correctly from the user's perspective, you catch and fix issues before they impact real users, improving reliability and user satisfaction.
