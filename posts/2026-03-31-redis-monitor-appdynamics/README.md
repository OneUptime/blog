# How to Monitor Redis with AppDynamics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AppDynamics, Monitoring, APM, Observability

Description: Learn how to monitor Redis with AppDynamics - covering Machine Agent setup, Redis extension configuration, business transaction tracing, and health rule configuration.

---

AppDynamics monitors Redis through its Machine Agent extension, which collects Redis INFO metrics, and through application agents that capture Redis calls within business transactions. This guide covers both approaches.

## Install the AppDynamics Machine Agent

Download and install the Machine Agent on the Redis host:

```bash
# Extract the Machine Agent
unzip machineagent-bundle-64bit-linux.zip -d /opt/appdynamics/machine-agent

# Configure the agent
cat > /opt/appdynamics/machine-agent/conf/controller-info.xml << 'EOF'
<controller-info>
  <controller-host>your-controller.saas.appdynamics.com</controller-host>
  <controller-port>443</controller-port>
  <controller-ssl-enabled>true</controller-ssl-enabled>
  <account-name>your-account</account-name>
  <account-access-key>your-access-key</account-access-key>
  <application-name>Redis-Infrastructure</application-name>
  <tier-name>Redis-Tier</tier-name>
</controller-info>
EOF
```

## Configure the Redis Monitoring Extension

Download the Redis extension and configure it:

```bash
# Place the extension in the Machine Agent monitors directory
mkdir -p /opt/appdynamics/machine-agent/monitors/RedisMonitor
cd /opt/appdynamics/machine-agent/monitors/RedisMonitor
# Download from AppDynamics Exchange
```

```yaml
# config.yml
servers:
  - displayName: "Redis Primary"
    host: "localhost"
    port: 6379
    password: ""

metrics:
  - info:
      - connected_clients
      - used_memory
      - used_memory_rss
      - keyspace_hits
      - keyspace_misses
      - evicted_keys
      - rejected_connections
      - instantaneous_ops_per_sec

metricPrefix: "Custom Metrics|Redis|"
```

## Start the Machine Agent

```bash
java -jar /opt/appdynamics/machine-agent/machineagent.jar &
```

Metrics appear in AppDynamics under Metrics Browser as `Custom Metrics|Redis|*`.

## Trace Redis in Business Transactions (Java)

For Java applications, the AppDynamics Java Agent automatically captures Redis calls as exit points:

```java
// No code changes needed - add JVM flag
// -javaagent:/path/to/javaagent.jar
// -Dappdynamics.agent.applicationName=MyApp
// -Dappdynamics.agent.tierName=AppServer
// -Dappdynamics.agent.nodeName=Node1
// -Dappdynamics.controller.hostName=your-controller.saas.appdynamics.com

import redis.clients.jedis.Jedis;

// These operations are automatically traced
try (Jedis jedis = jedisPool.getResource()) {
    String cached = jedis.get("product:" + productId);
    if (cached == null) {
        jedis.setex("product:" + productId, 600, productJson);
    }
}
```

Redis exit points appear in the AppDynamics flow map and transaction snapshots.

## Create Health Rules for Redis Metrics

In the AppDynamics UI:

```text
Alert & Respond > Health Rules > Create Health Rule

Name: Redis Memory Warning
Condition:
  Custom Metric: Custom Metrics|Redis|used_memory
  Operator: greater than
  Value: 3221225472  (3GB in bytes)
  Duration: 5 minutes

Severity: Warning

Create a second rule at 85% of maxmemory as Critical.
```

## Monitor Call Rate and Response Time

For Redis exit point metrics in AppDynamics:

```text
Application Dashboard > Flow Map

Click the Redis exit point to see:
- Calls per minute
- Average response time (ms)
- Errors per minute
- 95th percentile response time
```

Set health rules on exit point response time:
```text
Redis Exit Point response time > 10ms for 5 minutes = Warning
Redis Exit Point response time > 50ms for 2 minutes = Critical
```

## Summary

AppDynamics monitors Redis through the Machine Agent extension for infrastructure-level metrics and through application agents that automatically capture Redis calls within business transactions. Configure health rules on memory usage, connection counts, and Redis exit point response times to detect problems early. The flow map visualization shows Redis as a downstream dependency with real-time call rate and latency metrics.
