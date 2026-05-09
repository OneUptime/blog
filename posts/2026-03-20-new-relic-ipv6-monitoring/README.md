# How to Configure New Relic for IPv6 Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: New Relic, IPv6, Monitoring, Infrastructure, Synthetic Monitoring, APM

Description: A guide to configuring New Relic Infrastructure Agent and Synthetic Monitors to collect metrics from and test IPv6-addressed services.

New Relic supports IPv6 through its Infrastructure Agent network checks, Synthetic Monitors with IPv6 destinations, and Network Performance Monitoring. This guide covers configuring each component for IPv6.

## Step 1: Configure the New Relic Infrastructure Agent

The Infrastructure Agent collects system metrics and reports them to New Relic. On IPv6-connected hosts, it works automatically:

```yaml
# /etc/newrelic-infra.yml - Infrastructure Agent configuration

license_key: "{{ your_license_key }}"

# The agent uses the host's resolver/network stack, so it will use
# IPv6 to reach the New Relic collector when the OS prefers IPv6.

# Filter out unwanted interfaces from NetworkSample. Default filters
# already exclude lo, dummy, vmnet, sit, tun, tap, veth - extend here
# if you need to hide additional interfaces by prefix or by suffix
# after a leading digit (index-1).
network_interface_filters:
  prefix:
    - "lo"
  index-1:
    - "tun"
```

Start the agent and confirm it's running:

```bash
sudo systemctl start newrelic-infra

# Verify the agent service is active
sudo systemctl status newrelic-infra
```

## Step 2: Configure a Flex Integration for IPv6 Ping Checks

The `nri-flex` integration (bundled with the Infrastructure Agent) lets you wrap any command - including `ping6` - and ship the parsed output to New Relic as a custom event:

```yaml
# /etc/newrelic-infra/integrations.d/ipv6-ping.yml - Ping check for IPv6
integrations:
  - name: nri-flex
    config:
      name: IPv6PingCheck
      apis:
        - event_type: IPv6PingResult
          commands:
            - run: "ping6 -c 3 -q 2001:4860:4860::8888 2>&1 | tail -2"
              split: horizontal
              regex_match: true
              split_by: "(\d+)% packet loss.*rtt.*=.*\/(\d+\.\d+)\/"
              set_header:
                - packet_loss
                - avg_rtt_ms
```

## Step 3: Create a Synthetic Monitor for IPv6 Endpoints

New Relic Synthetics can test IPv6 endpoints from multiple global locations:

```bash
# Create a Synthetic simple browser monitor via NerdGraph API
curl -X POST "https://api.newrelic.com/graphql" \
  -H "Api-Key: $NR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { syntheticsCreateSimpleMonitor(accountId: YOUR_ACCOUNT_ID, monitor: { name: \"IPv6 Web Check\", period: EVERY_5_MINUTES, status: ENABLED, uri: \"https://www.example.com/\", locations: { public: [\"AWS_US_EAST_1\"] }, advancedOptions: { customHeaders: [{ name: \"X-IPv6-Test\", value: \"true\" }] } }) { monitor { guid } } }"
  }'
```

## Step 4: Scripted API Monitor for IPv6

For more control - for example, hitting a literal IPv6 address while sending a specific Host header - use a Scripted API monitor. The `$http` global is provided by the runtime (powered by `got`, with a request-compatible surface), so you do not need to `require` it:

```javascript
// New Relic Scripted API monitor: Test IPv6 endpoint
var assert = require('assert');

// Target the IPv6 address directly (using brackets in URL)
var options = {
    url: 'http://[2001:db8::10]:80/',
    headers: {
        'Host': 'www.example.com'
    }
};

$http.get(options, function(error, response, body) {
    assert.equal(error, null, 'Error: ' + error);
    assert.equal(response.statusCode, 200, 'Expected HTTP 200, got: ' + response.statusCode);
    $util.insights.set('ipv6_response_time_ms', response.timingPhases.total);
});
```

## Step 5: Custom NRQL Queries for IPv6 Metrics

```sql
-- Query infrastructure network metrics for IPv6 interfaces
SELECT average(transmitBytesPerSecond), average(receiveBytesPerSecond)
FROM NetworkSample
WHERE interfaceName NOT IN ('lo', 'docker0')
FACET hostname, interfaceName
SINCE 1 hour ago

-- Query synthetic monitor results for IPv6 endpoints
SELECT average(duration), percentage(count(*), WHERE result = 'SUCCESS') AS 'Availability'
FROM SyntheticCheck
WHERE monitorName = 'IPv6 Web Check'
SINCE 24 hours ago
TIMESERIES 1 hour

-- Custom metric from nri-flex ping check
SELECT average(avg_rtt_ms), average(packet_loss)
FROM IPv6PingResult
FACET target
SINCE 1 hour ago
```

## Step 6: Create a New Relic Alert for IPv6 Failures

NerdGraph is the preferred API for managing alert conditions, but the REST v2 endpoint still works. The endpoint is scoped to a specific policy, and each term needs `duration` (minutes) and `time_function`:

```bash
# Create a static NRQL alert condition under an existing policy
curl -X POST "https://api.newrelic.com/v2/alerts_nrql_conditions/policies/${POLICY_ID}.json" \
  -H "Api-Key: $NR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nrql_condition": {
      "name": "IPv6 Endpoint Failure",
      "enabled": true,
      "type": "static",
      "value_function": "single_value",
      "nrql": { "query": "SELECT percentage(count(*), WHERE result = '\''FAILED'\'') FROM SyntheticCheck WHERE monitorName = '\''IPv6 Web Check'\''" },
      "terms": [{
        "threshold": "50",
        "operator": "above",
        "priority": "critical",
        "duration": "5",
        "time_function": "all"
      }]
    }
  }'
```

New Relic's combination of Infrastructure Agent network data, Synthetic Monitors, and flexible NRQL queries provides comprehensive IPv6 observability without requiring dedicated IPv6 monitoring tools.
