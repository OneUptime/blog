# How to Use the OpenTelemetry Java Agent with Application Servers (Tomcat, WildFly, Liberty)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java Agent, Tomcat, WildFly, Liberty, Application Server

Description: Step-by-step guide to configuring and deploying the OpenTelemetry Java agent across popular application servers including Apache Tomcat, WildFly, and Open Liberty for automatic instrumentation.

The OpenTelemetry Java agent provides automatic instrumentation for Java applications without requiring code changes. This agent works by using bytecode manipulation to inject telemetry collection into your application at runtime. For enterprise applications running on application servers, proper configuration of the Java agent ensures comprehensive observability across all components.

## How the Java Agent Works

The OpenTelemetry Java agent attaches to the JVM using the `-javaagent` flag and automatically instruments hundreds of popular libraries and frameworks. When your application loads classes, the agent intercepts the class loading process and modifies the bytecode to add tracing, metrics, and logging capabilities.

```mermaid
graph LR
    A[JVM Startup] --> B[Java Agent Loads]
    B --> C[Bytecode Instrumentation]
    C --> D[Application Classes Load]
    D --> E[Automatic Telemetry Collection]
    E --> F[OTLP Exporter]
    F --> G[Observability Backend]
```

The agent instruments common components automatically, including:

- HTTP clients and servers (Servlet, JAX-RS, Spring Web)
- Database drivers (JDBC, MongoDB, Redis)
- Messaging systems (JMS, Kafka, RabbitMQ)
- RPC frameworks (gRPC, Apache Thrift)
- Popular frameworks (Spring, Hibernate, Quartz)

## Downloading and Verifying the Java Agent

Before configuring application servers, download the latest OpenTelemetry Java agent. Always download from the official GitHub releases:

```bash
# Download the latest stable release
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar

# Verify the download (check file size is reasonable, typically 50-60MB)
ls -lh opentelemetry-javaagent.jar

# Optional: Verify the SHA256 checksum
curl -L -o opentelemetry-javaagent.jar.sha256 \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar.sha256

sha256sum -c opentelemetry-javaagent.jar.sha256
```

Place the agent JAR in a stable location that your application server can access. Common locations include `/opt/opentelemetry/`, `/usr/local/lib/`, or within your application server's installation directory.

## Configuring Apache Tomcat

Apache Tomcat is one of the most popular servlet containers. Configuring the OpenTelemetry agent for Tomcat depends on how you start the server.

### Tomcat on Linux/macOS

For Tomcat installations on Unix-based systems, modify the `setenv.sh` file. If this file doesn't exist, create it in the `bin` directory of your Tomcat installation:

```bash
#!/bin/bash
# setenv.sh - Custom environment variables for Tomcat

# Path to the OpenTelemetry Java agent
OTEL_AGENT_PATH="/opt/opentelemetry/opentelemetry-javaagent.jar"

# Basic OpenTelemetry configuration
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:$OTEL_AGENT_PATH"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.service.name=my-tomcat-app"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.resource.attributes=service.namespace=production,deployment.environment=prod"

# Configure exporters
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.traces.exporter=otlp"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.metrics.exporter=otlp"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.logs.exporter=otlp"

# OTLP endpoint configuration
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.exporter.otlp.endpoint=http://localhost:4317"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.exporter.otlp.protocol=grpc"

# Optional: Configure sampling
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.traces.sampler=parentbased_traceidratio"
export CATALINA_OPTS="$CATALINA_OPTS -Dotel.traces.sampler.arg=1.0"

# Optional: Enable debug logging for troubleshooting
# export CATALINA_OPTS="$CATALINA_OPTS -Dotel.javaagent.debug=true"
```

Make the script executable:

```bash
chmod +x $TOMCAT_HOME/bin/setenv.sh
```

### Tomcat on Windows

For Windows installations, create or modify `setenv.bat` in the Tomcat `bin` directory:

```batch
@echo off
REM setenv.bat - Custom environment variables for Tomcat

REM Path to the OpenTelemetry Java agent
set OTEL_AGENT_PATH=C:\opt\opentelemetry\opentelemetry-javaagent.jar

REM Basic OpenTelemetry configuration
set CATALINA_OPTS=%CATALINA_OPTS% -javaagent:%OTEL_AGENT_PATH%
set CATALINA_OPTS=%CATALINA_OPTS% -Dotel.service.name=my-tomcat-app
set CATALINA_OPTS=%CATALINA_OPTS% -Dotel.resource.attributes=service.namespace=production

REM Configure exporters
set CATALINA_OPTS=%CATALINA_OPTS% -Dotel.traces.exporter=otlp
set CATALINA_OPTS=%CATALINA_OPTS% -Dotel.metrics.exporter=otlp
set CATALINA_OPTS=%CATALINA_OPTS% -Dotel.exporter.otlp.endpoint=http://localhost:4317
```

### Tomcat as a Service

When running Tomcat as a Windows service, use the Tomcat configuration tool:

```batch
REM Stop the service first
net stop Tomcat9

REM Configure Java options using the Tomcat service manager
%TOMCAT_HOME%\bin\tomcat9w.exe //US//Tomcat9 ^
  ++JvmOptions=-javaagent:C:\opt\opentelemetry\opentelemetry-javaagent.jar ^
  ++JvmOptions=-Dotel.service.name=my-tomcat-app ^
  ++JvmOptions=-Dotel.exporter.otlp.endpoint=http://localhost:4317

REM Start the service
net start Tomcat9
```

### Verifying Tomcat Configuration

After configuring Tomcat, verify the agent loads correctly by checking the logs:

```bash
# Start Tomcat and watch the logs
tail -f $TOMCAT_HOME/logs/catalina.out
```

You should see output indicating the OpenTelemetry agent has loaded:

```
[otel.javaagent 2026-02-06 10:15:30:123] OpenTelemetry Javaagent started
[otel.javaagent 2026-02-06 10:15:30:124] Service name: my-tomcat-app
[otel.javaagent 2026-02-06 10:15:30:125] Instrumentation enabled: [servlet, jdbc, httpclient, ...]
```

## Configuring WildFly

WildFly (formerly JBoss AS) is a full Jakarta EE application server. Configure the OpenTelemetry agent through WildFly's configuration files.

### WildFly Standalone Mode

For standalone server instances, modify the `standalone.conf` file (Linux/macOS) or `standalone.conf.bat` (Windows):

```bash
#!/bin/bash
# standalone.conf - Add near the end of the file

# OpenTelemetry Java Agent configuration
OTEL_AGENT_PATH="/opt/opentelemetry/opentelemetry-javaagent.jar"

JAVA_OPTS="$JAVA_OPTS -javaagent:$OTEL_AGENT_PATH"
JAVA_OPTS="$JAVA_OPTS -Dotel.service.name=wildfly-application"
JAVA_OPTS="$JAVA_OPTS -Dotel.resource.attributes=service.namespace=wildfly,server.type=standalone"

# Configure OTLP exporter
JAVA_OPTS="$JAVA_OPTS -Dotel.traces.exporter=otlp"
JAVA_OPTS="$JAVA_OPTS -Dotel.metrics.exporter=otlp"
JAVA_OPTS="$JAVA_OPTS -Dotel.logs.exporter=otlp"
JAVA_OPTS="$JAVA_OPTS -Dotel.exporter.otlp.endpoint=http://localhost:4317"

# WildFly-specific: Ensure module system compatibility
JAVA_OPTS="$JAVA_OPTS -Dotel.instrumentation.jboss-modules.enabled=true"

# Configure batch span processing for better performance
JAVA_OPTS="$JAVA_OPTS -Dotel.bsp.schedule.delay=5000"
JAVA_OPTS="$JAVA_OPTS -Dotel.bsp.max.queue.size=2048"
JAVA_OPTS="$JAVA_OPTS -Dotel.bsp.max.export.batch.size=512"

# Optional: Instrument internal WildFly components
JAVA_OPTS="$JAVA_OPTS -Dotel.instrumentation.undertow.enabled=true"
JAVA_OPTS="$JAVA_OPTS -Dotel.instrumentation.jaxrs.enabled=true"
```

### WildFly Domain Mode

In domain mode, configure the agent in `domain.conf` and reference it in your server group configuration. Edit `domain.conf`:

```bash
#!/bin/bash
# domain.conf

OTEL_AGENT_PATH="/opt/opentelemetry/opentelemetry-javaagent.jar"
JAVA_OPTS="$JAVA_OPTS -javaagent:$OTEL_AGENT_PATH"
```

Then modify your domain configuration XML to add service-specific properties. Edit `domain.xml` and add to the appropriate server group:

```xml
<server-group name="main-server-group" profile="full">
    <jvm name="default">
        <jvm-options>
            <option value="-Dotel.service.name=wildfly-domain-server"/>
            <option value="-Dotel.resource.attributes=service.namespace=wildfly,server.type=domain"/>
            <option value="-Dotel.traces.exporter=otlp"/>
            <option value="-Dotel.metrics.exporter=otlp"/>
            <option value="-Dotel.exporter.otlp.endpoint=http://localhost:4317"/>
        </jvm-options>
    </jvm>
    <socket-binding-group ref="full-sockets"/>
</server-group>
```

### WildFly with Docker

When running WildFly in containers, pass the agent configuration as environment variables:

```dockerfile
FROM quay.io/wildfly/wildfly:latest

# Copy the OpenTelemetry agent
COPY opentelemetry-javaagent.jar /opt/opentelemetry/

# Set environment variables for OpenTelemetry
ENV JAVA_OPTS="-javaagent:/opt/opentelemetry/opentelemetry-javaagent.jar \
    -Dotel.service.name=wildfly-container \
    -Dotel.traces.exporter=otlp \
    -Dotel.metrics.exporter=otlp \
    -Dotel.exporter.otlp.endpoint=http://otel-collector:4317"

# Copy your application
COPY target/myapp.war /opt/jboss/wildfly/standalone/deployments/
```

Or using Docker Compose:

```yaml
version: '3.8'

services:
  wildfly:
    image: quay.io/wildfly/wildfly:latest
    volumes:
      - ./opentelemetry-javaagent.jar:/opt/opentelemetry/opentelemetry-javaagent.jar
      - ./target/myapp.war:/opt/jboss/wildfly/standalone/deployments/myapp.war
    environment:
      - JAVA_OPTS=-javaagent:/opt/opentelemetry/opentelemetry-javaagent.jar
        -Dotel.service.name=wildfly-app
        -Dotel.exporter.otlp.endpoint=http://otel-collector:4317
        -Dotel.traces.exporter=otlp
        -Dotel.metrics.exporter=otlp
    ports:
      - "8080:8080"
      - "9990:9990"
    networks:
      - monitoring

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    networks:
      - monitoring

networks:
  monitoring:
```

## Configuring Open Liberty

Open Liberty is IBM's lightweight Jakarta EE and MicroProfile runtime. It has excellent integration with OpenTelemetry through both the Java agent and native MicroProfile Telemetry support.

### Open Liberty with jvm.options

The recommended way to configure the Java agent in Open Liberty is using the `jvm.options` file in your server configuration:

```properties
# jvm.options - Located at wlp/usr/servers/defaultServer/jvm.options

# OpenTelemetry Java Agent
-javaagent:/opt/opentelemetry/opentelemetry-javaagent.jar

# Service identification
-Dotel.service.name=liberty-application
-Dotel.resource.attributes=service.namespace=liberty,runtime=openliberty

# Exporter configuration
-Dotel.traces.exporter=otlp
-Dotel.metrics.exporter=otlp
-Dotel.logs.exporter=otlp
-Dotel.exporter.otlp.endpoint=http://localhost:4317
-Dotel.exporter.otlp.protocol=grpc

# Propagation configuration for distributed tracing
-Dotel.propagators=tracecontext,baggage

# Performance tuning
-Dotel.bsp.schedule.delay=5000
-Dotel.bsp.max.queue.size=2048
-Dotel.metric.export.interval=60000

# Liberty-specific optimizations
-Dotel.instrumentation.liberty.enabled=true
-Dotel.instrumentation.jaxrs.enabled=true
-Dotel.instrumentation.servlet.enabled=true
```

### Open Liberty server.xml Configuration

You can also set system properties in `server.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<server description="Liberty Server with OpenTelemetry">

    <featureManager>
        <feature>jaxrs-3.1</feature>
        <feature>cdi-4.0</feature>
        <feature>jsonb-3.0</feature>
        <feature>mpConfig-3.1</feature>
        <!-- MicroProfile Telemetry can work alongside the agent -->
        <feature>mpTelemetry-1.1</feature>
    </featureManager>

    <httpEndpoint id="defaultHttpEndpoint"
                  httpPort="9080"
                  httpsPort="9443" />

    <webApplication location="myapp.war" contextRoot="/">
        <classloader delegation="parentLast" />
    </webApplication>

    <!-- Application-specific OpenTelemetry configuration -->
    <variable name="otel.service.name" value="liberty-application"/>
    <variable name="otel.exporter.otlp.endpoint" value="http://localhost:4317"/>

</server>
```

### Liberty with Environment Variables

For containerized Liberty deployments, use environment variables:

```dockerfile
FROM icr.io/appcafe/open-liberty:full-java11-openj9-ubi

# Copy OpenTelemetry agent
COPY --chown=1001:0 opentelemetry-javaagent.jar /opt/opentelemetry/

# Copy server configuration
COPY --chown=1001:0 server.xml /config/

# Copy application
COPY --chown=1001:0 target/myapp.war /config/apps/

# Configure OpenTelemetry via JVM options
RUN echo '-javaagent:/opt/opentelemetry/opentelemetry-javaagent.jar' >> /config/jvm.options && \
    echo '-Dotel.service.name=liberty-app' >> /config/jvm.options && \
    echo '-Dotel.exporter.otlp.endpoint=http://otel-collector:4317' >> /config/jvm.options

EXPOSE 9080 9443

CMD ["/opt/ol/wlp/bin/server", "run", "defaultServer"]
```

## Advanced Configuration Options

### Using Configuration Files

Instead of passing all configuration as system properties, use a configuration file for better maintainability:

```yaml
# otel-config.yaml
resource:
  attributes:
    service.name: my-application
    service.namespace: production
    service.version: "1.0.0"
    deployment.environment: prod
    host.name: ${HOSTNAME}

exporter:
  otlp:
    endpoint: http://localhost:4317
    protocol: grpc
    compression: gzip
    timeout: 10000
    headers:
      api-key: ${OTEL_API_KEY}

traces:
  exporter: otlp
  sampler:
    type: parentbased_traceidratio
    argument: 1.0

metrics:
  exporter: otlp
  interval: 60000

logs:
  exporter: otlp
```

Reference this file when starting your application server:

```bash
# For any application server
export JAVA_OPTS="$JAVA_OPTS -javaagent:/opt/opentelemetry/opentelemetry-javaagent.jar"
export OTEL_CONFIG_FILE="/etc/opentelemetry/otel-config.yaml"
```

### Securing Credentials

Never hardcode sensitive credentials. Use environment variables or secret management:

```bash
#!/bin/bash
# secure-startup.sh

# Load secrets from secure vault or environment
export OTEL_EXPORTER_OTLP_HEADERS="api-key=${OTEL_API_KEY}"
export OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_ENDPOINT}"

# Use TLS for secure communication
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_CERTIFICATE=/etc/ssl/certs/ca-bundle.crt

# Start your application server
$CATALINA_HOME/bin/startup.sh
```

### Performance Tuning

Adjust batch processing and export settings based on your application's load:

```bash
# High-throughput configuration
-Dotel.bsp.schedule.delay=5000                    # Export every 5 seconds
-Dotel.bsp.max.queue.size=4096                    # Larger queue for high volume
-Dotel.bsp.max.export.batch.size=512              # Export in larger batches
-Dotel.bsp.export.timeout=30000                   # 30 second export timeout

# Memory-constrained configuration
-Dotel.bsp.max.queue.size=512                     # Smaller queue
-Dotel.bsp.max.export.batch.size=128              # Smaller batches
-Dotel.metric.export.interval=120000              # Export metrics every 2 minutes
```

## Troubleshooting Common Issues

### Agent Not Loading

If the agent doesn't load, verify the path and permissions:

```bash
# Check if the JAR exists and is readable
ls -l /opt/opentelemetry/opentelemetry-javaagent.jar

# Verify it's a valid JAR file
jar tf /opt/opentelemetry/opentelemetry-javaagent.jar | head

# Enable debug logging
-Dotel.javaagent.debug=true
```

### Connection Issues

If spans aren't reaching your backend, check connectivity:

```bash
# Test connection to OTLP endpoint
curl -v http://localhost:4317

# Enable verbose logging
-Dotel.javaagent.debug=true
-Dotel.exporter.otlp.timeout=10000
```

### Class Loading Conflicts

Some application servers may have class loading conflicts:

```bash
# Exclude problematic instrumentations
-Dotel.instrumentation.[library-name].enabled=false

# For WildFly, ensure module system compatibility
-Dotel.instrumentation.jboss-modules.enabled=true
```

## Monitoring Agent Health

Create a health check endpoint to verify OpenTelemetry is working:

```bash
# Check if spans are being exported by looking at logs
grep "BatchSpanProcessor" $CATALINA_HOME/logs/catalina.out

# Monitor agent metrics if using Prometheus
curl http://localhost:9464/metrics | grep otel
```

The OpenTelemetry Java agent provides powerful automatic instrumentation across all major Java application servers. Proper configuration ensures minimal performance impact while providing comprehensive observability data. Choose the configuration method that best fits your deployment model, whether running servers directly, in containers, or in cloud environments.
