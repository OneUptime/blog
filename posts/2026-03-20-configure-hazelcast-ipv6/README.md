# How to Configure Hazelcast with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hazelcast, In-Memory Data Grid, Distributed Cache, Java

Description: Learn how to configure Hazelcast to use IPv6 addresses for cluster member discovery, client connections, and inter-member communication in a distributed in-memory data grid.

## Hazelcast XML Configuration for IPv6

```xml
<!-- hazelcast.xml -->
<hazelcast xmlns="http://www.hazelcast.com/schema/config"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

    <instance-name>my-hazelcast</instance-name>

    <network>
        <!-- Listen on specific IPv6 address (bracketed when port is included) -->
        <public-address>[2001:db8::10]:5701</public-address>

        <!-- Port configuration -->
        <port auto-increment="true" port-count="100">5701</port>

        <!-- Bind to specific IPv6 address -->
        <interfaces enabled="true">
            <interface>2001:db8::10</interface>
        </interfaces>

        <!-- Member discovery via TCP/IP with IPv6 -->
        <join>
            <multicast enabled="false"/>
            <tcp-ip enabled="true">
                <member>[2001:db8::10]:5701</member>
                <member>[2001:db8::11]:5701</member>
                <member>[2001:db8::12]:5701</member>
            </tcp-ip>
        </join>
    </network>
</hazelcast>
```

## Hazelcast YAML Configuration

```yaml
# hazelcast.yaml

hazelcast:
  instance-name: my-hazelcast

  network:
    public-address: "[2001:db8::10]:5701"
    port:
      auto-increment: true
      port-count: 100
      port: 5701

    interfaces:
      enabled: true
      interfaces:
        - "2001:db8::10"

    join:
      multicast:
        enabled: false
      tcp-ip:
        enabled: true
        member-list:
          - "[2001:db8::10]:5701"
          - "[2001:db8::11]:5701"
          - "[2001:db8::12]:5701"
```

## JVM Flags for IPv6

```bash
# Hazelcast runs on JVM - configure for IPv6

# Required: prefer IPv6 addresses when both stacks are available

# Set in startup script or environment
export JAVA_OPTS="-Djava.net.preferIPv6Addresses=true $JAVA_OPTS"

# Ensure IPv4-only stack is not forced (this is the default)
export JAVA_OPTS="-Djava.net.preferIPv4Stack=false $JAVA_OPTS"

# Start Hazelcast with IPv6
java -Djava.net.preferIPv6Addresses=true \
     -Dhazelcast.config=/etc/hazelcast/hazelcast.xml \
     -jar hazelcast.jar
```

## Java Client over IPv6

```java
import com.hazelcast.client.HazelcastClient;
import com.hazelcast.client.config.ClientConfig;
import com.hazelcast.core.HazelcastInstance;
import java.util.Map;

public class IPv6HazelcastClient {
    public static void main(String[] args) {
        // Configure client for IPv6
        System.setProperty("java.net.preferIPv6Addresses", "true");

        ClientConfig clientConfig = new ClientConfig();
        clientConfig.getNetworkConfig()
            .addAddress("[2001:db8::10]:5701")
            .addAddress("[2001:db8::11]:5701");

        HazelcastInstance client = HazelcastClient.newHazelcastClient(clientConfig);

        // Use distributed map
        Map<String, String> map = client.getMap("my-distributed-map");
        map.put("key1", "value from IPv6 client");
        String value = map.get("key1");
        System.out.println("Retrieved: " + value);

        client.shutdown();
    }
}
```

## Verify Cluster Formation

```bash
# Check Hazelcast member list via management center or logs
# Look for log messages like:
# "Members {size:3, ver:3} ["
# "[2001:db8::10]:5701 - ..."
# "[2001:db8::11]:5701 - ..."

# Check listening ports
ss -6 -tlnp | grep java | grep 5701

# Check cluster health via REST API (HEALTH_CHECK endpoint group must be enabled)
curl -6 http://[2001:db8::10]:5701/hazelcast/health/node-state
```

## Summary

Configure Hazelcast for IPv6 by setting `<public-address>[2001:db8::10]:5701</public-address>` (brackets are required when including a port), enabling `<interfaces>` with your IPv6 address, and listing cluster members in bracket notation in `<tcp-ip>`. Disable multicast and use TCP-IP discovery for IPv6 clusters. Critically, add `-Djava.net.preferIPv6Addresses=true` to JVM options (and ensure `-Djava.net.preferIPv4Stack` is not set to `true`). Clients connect using `[2001:db8::10]:5701` address notation.
