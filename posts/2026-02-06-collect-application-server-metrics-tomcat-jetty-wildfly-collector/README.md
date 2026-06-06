# How to Collect Application Server Metrics with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Tomcat, Jetty, WildFly, JMX, Java, Application Server, Metric, Observability

Description: Learn how to collect performance metrics from Java application servers like Tomcat, Jetty, and WildFly using the OpenTelemetry Collector JMX receiver.

---

Java application servers are the backbone of enterprise web applications. Whether you are running Apache Tomcat for servlet-based apps, Eclipse Jetty for lightweight embedded deployments, or WildFly (formerly JBoss) for full Jakarta EE workloads, monitoring the health of these servers is essential. Thread pools fill up, heap memory gets consumed, and connection pools become exhausted. Without visibility into these metrics, you are left guessing when things go wrong.

The OpenTelemetry Collector provides a JMX receiver that connects to any Java application server and collects metrics through the standard Java Management Extensions interface. This means you get a single, vendor-neutral approach to monitoring all three servers.

## How JMX Monitoring Works

Every Java application server exposes internal metrics through JMX MBeans (Managed Beans). These are structured objects that contain attributes like thread counts, memory usage, request statistics, and connection pool sizes. The JMX protocol allows remote tools to query these MBeans over a network connection.

```mermaid
graph LR
    A[Tomcat / Jetty / WildFly] -->|JMX MBeans| B[JMX Remote Port]
    B -->|JMX Connection| C[OTel Collector JMX Receiver]
    C -->|Metrics Pipeline| D[Processors]
    D -->|Export| E[OneUptime / Backend]
```

The OpenTelemetry Collector's JMX receiver acts as a JMX client. It connects to the application server's JMX port, queries specific MBeans, and converts the results into OpenTelemetry metrics. The receiver ships with predefined metric gathering configurations for popular servers, so you do not need to figure out every MBean path yourself.

## Prerequisites

Before configuring the collector, you need to enable JMX remote access on each application server. This involves adding JVM flags that open a JMX port for remote connections.

### Enabling JMX on Tomcat

Edit the `setenv.sh` (Linux) or `setenv.bat` (Windows) file in Tomcat's `bin` directory:

```bash
# setenv.sh - Enable JMX remote access for Tomcat

# Place this file in CATALINA_HOME/bin/

export CATALINA_OPTS="$CATALINA_OPTS \
  -Dcom.sun.management.jmxremote \
  -Dcom.sun.management.jmxremote.port=9010 \
  -Dcom.sun.management.jmxremote.rmi.port=9010 \
  -Dcom.sun.management.jmxremote.ssl=false \
  -Dcom.sun.management.jmxremote.authenticate=true \
  -Dcom.sun.management.jmxremote.password.file=/opt/tomcat/conf/jmxremote.password \
  -Dcom.sun.management.jmxremote.access.file=/opt/tomcat/conf/jmxremote.access"
```

### Enabling JMX on Jetty

For Jetty, enable the remote JMX module:

```bash
java -jar $JETTY_HOME/start.jar --add-modules=jmx-remote-auth

# Then configure $JETTY_BASE/start.d/jmx-remote.ini and
# $JETTY_BASE/etc/jmxremote.password / jmxremote.access
# for the remote port, username, and permissions.
```

### Enabling JMX on WildFly

WildFly uses a different remoting protocol. In standalone mode, the JMX subsystem is exposed through the management interface on port `9990` by default:

```bash
# WildFly remote JMX service URL format
service:jmx:remote+http://wildfly-host:9990
```

For production deployments, always enable authentication and consider using SSL for the JMX connection. Running JMX without authentication is only appropriate in isolated development environments.

## Configuring the Collector

The OpenTelemetry Collector's JMX receiver requires the Contrib distribution. It uses a JMX scraper JAR file that runs alongside the collector to handle the actual JMX connections. Here is a configuration that monitors all three application servers:

```yaml
# config.yaml - OpenTelemetry Collector configuration for Java app servers
receivers:
  # Tomcat JMX receiver
  jmx/tomcat:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:rmi:///jndi/rmi://tomcat-host:9010/jmxrmi"
    target_system: tomcat
    collection_interval: 30s
    username: monitor
    password: "${env:JMX_TOMCAT_PASSWORD}"

  # Jetty JMX receiver
  jmx/jetty:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:rmi:///jndi/rmi://jetty-host:9011/jmxrmi"
    target_system: jetty
    collection_interval: 30s
    username: monitor
    password: "${env:JMX_JETTY_PASSWORD}"

  # WildFly JMX receiver
  jmx/wildfly:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:remote+http://wildfly-host:9990"
    target_system: wildfly
    additional_jars:
      - /opt/wildfly/bin/client/jboss-client.jar
    collection_interval: 30s
    username: monitor
    password: "${env:JMX_WILDFLY_PASSWORD}"

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Tag metrics with the application server type
  resource/tomcat:
    attributes:
      - key: server.type
        value: "tomcat"
        action: upsert
      - key: service.name
        value: "tomcat-app-server"
        action: upsert

  resource/jetty:
    attributes:
      - key: server.type
        value: "jetty"
        action: upsert
      - key: service.name
        value: "jetty-app-server"
        action: upsert

  resource/wildfly:
    attributes:
      - key: server.type
        value: "wildfly"
        action: upsert
      - key: service.name
        value: "wildfly-app-server"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics/tomcat:
      receivers: [jmx/tomcat]
      processors: [resource/tomcat, batch]
      exporters: [otlp]

    metrics/jetty:
      receivers: [jmx/jetty]
      processors: [resource/jetty, batch]
      exporters: [otlp]

    metrics/wildfly:
      receivers: [jmx/wildfly]
      processors: [resource/wildfly, batch]
      exporters: [otlp]
```

The `target_system` field is the key setting here. It tells the JMX receiver which predefined MBean queries to use. When you set `target_system: tomcat`, the receiver automatically knows to query Tomcat-specific MBeans for thread pools, sessions, connectors, and request processors. The same applies for Jetty and WildFly. Each target system maps to a curated set of metrics that the OpenTelemetry community maintains.

Notice that each server gets its own pipeline with a dedicated resource processor. This ensures that metrics from different servers are properly labeled and do not get mixed up in your backend.

## Key Metrics by Server

Each application server exposes different MBeans, but the critical metrics fall into similar categories.

### Tomcat Metrics

The Tomcat target system collects metrics from the Catalina MBeans:

- `tomcat.session.active.count` tracks the number of active HTTP sessions. A steady increase without a corresponding decrease means sessions are not being invalidated, which can lead to memory pressure.
- `tomcat.thread.busy.count` and `tomcat.thread.limit` tell you how close the thread pool is to capacity. When busy threads approach the maximum, new requests start queuing.
- `tomcat.request.count` and `tomcat.error.count` give you throughput and error rates at the connector level.
- `tomcat.network.io` measures network I/O through the server, with the direction recorded as an attribute.

### Jetty Metrics

Jetty exposes metrics through its own MBean structure:

- `jetty.session.count` tracks session count on Jetty 12 and later.
- `jetty.thread.busy.count` and `jetty.thread.idle.count` show thread pool utilization.
- `jetty.thread.queue.size` shows how many jobs are waiting in the thread pool queue.
- `jetty.io.select.count` tracks NIO selector activity, which is specific to Jetty's non-blocking I/O architecture.

### WildFly Metrics

WildFly provides detailed subsystem metrics:

- `wildfly.session.active.count` tracks active sessions across deployed applications.
- `wildfly.request.count` and `wildfly.request.duration.sum` measure request throughput and cumulative request processing time.
- `wildfly.db.client.connection.count` monitors JDBC connection pool usage by connection state, which is critical for database-backed applications.
- `wildfly.error.count` tracks requests that resulted in 5xx responses.

## Adding JVM Metrics

Regardless of which application server you use, JVM-level metrics are universally important. The JMX receiver can also collect JVM metrics by adding `jvm` to the target system:

```yaml
receivers:
  jmx/tomcat:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:rmi:///jndi/rmi://tomcat-host:9010/jmxrmi"
    # Comma-separated list to collect both Tomcat and JVM metrics
    target_system: tomcat,jvm
    collection_interval: 30s
    username: monitor
    password: "${env:JMX_TOMCAT_PASSWORD}"
```

This adds heap memory usage, class loading statistics, thread counts, CPU metrics, and buffer pool metrics. JVM garbage collection pauses are one of the most common causes of application latency spikes, but GC duration is exposed through JVM notifications and is not collected by the JMX scraper's YAML-based JVM metric definitions. Use the OpenTelemetry Java agent runtime telemetry if you need GC duration metrics.

## Monitoring Multiple Instances

In production, you likely have multiple instances of each server behind a load balancer. Use environment variables or configuration templating to avoid duplicating your configuration:

```yaml
receivers:
  jmx/tomcat-1:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:rmi:///jndi/rmi://tomcat-1.internal:9010/jmxrmi"
    target_system: tomcat,jvm
    collection_interval: 30s
    resource_attributes:
      # Identify each instance in the metrics
      host.name: "tomcat-1"
      deployment.environment: "production"

  jmx/tomcat-2:
    jar_path: /opt/otelcol/opentelemetry-jmx-scraper.jar
    endpoint: "service:jmx:rmi:///jndi/rmi://tomcat-2.internal:9010/jmxrmi"
    target_system: tomcat,jvm
    collection_interval: 30s
    resource_attributes:
      host.name: "tomcat-2"
      deployment.environment: "production"
```

## Troubleshooting

The most common issue with JMX monitoring is connection failures. If the collector cannot reach the JMX port, verify that the port is open in your firewall and that the RMI port matches the JMX port. When these ports differ, Java creates a secondary RMI connection on a random port, which firewalls will block.

If metrics appear but values seem stale, check the collection interval. Setting it too low (under 10 seconds) can cause the JMX connection to time out before completing all MBean queries, especially on servers with many deployed applications.

Authentication failures usually manifest as "SecurityException" messages in the collector logs. Double-check the username and password, and make sure the access and password files have the correct file permissions. On Linux, these files must be readable only by the owner.

## Conclusion

The JMX receiver in the OpenTelemetry Collector provides a unified way to monitor Tomcat, Jetty, and WildFly. By leveraging the predefined target system configurations, you can get comprehensive metrics flowing within minutes. The key is to enable JMX remote access on your servers, point the collector at the right ports, and use separate pipelines with resource attributes to keep metrics organized. Combined with JVM metrics, this gives you full visibility into your Java application server fleet.
