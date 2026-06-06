# Validation Summary: How to Collect Application Server Metrics with the Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry JMX receiver
- OpenTelemetry JMX Scraper
- Java Management Extensions (JMX)
- Apache Tomcat
- Eclipse Jetty
- WildFly
- JVM runtime metrics

## Sources Consulted
- OpenTelemetry Java JMX Metrics documentation: https://opentelemetry.io/docs/languages/java/jmx/
- OpenTelemetry Collector Contrib JMX receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/jmxreceiver
- OpenTelemetry JMX Scraper documentation: https://github.com/open-telemetry/opentelemetry-java-contrib/tree/main/jmx-scraper
- OpenTelemetry Java instrumentation JMX target-system metrics for Tomcat: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/tomcat.md
- OpenTelemetry Java instrumentation JMX target-system metrics for Jetty: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/jetty.md
- OpenTelemetry Java instrumentation JMX target-system metrics for WildFly: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/wildfly.md
- OpenTelemetry Java instrumentation JMX target-system metrics for JVM: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/jmx-metrics/library/jvm.md
- Apache Tomcat 10.1 Monitoring and Managing Tomcat: https://tomcat.apache.org/tomcat-10.1-doc/monitoring.html
- Eclipse Jetty 12.1 JMX Monitoring and Management: https://jetty.org/docs/jetty/12.1/operations-guide/jmx/index.html
- WildFly JMX subsystem configuration: https://docs.jboss.org/author/display/WFLY/JMX%20subsystem%20configuration.html

## Issues Found
1. The Collector examples used the old `opentelemetry-jmx-metrics.jar` name. Updated them to use `opentelemetry-jmx-scraper.jar`, which matches the current OpenTelemetry JMX Scraper guidance.
2. The WildFly section described standard JVM RMI JMX flags and an RMI endpoint even though WildFly exposes JMX through its management remoting connector by default. Updated the example to use `service:jmx:remote+http://wildfly-host:9990` and added the required `jboss-client.jar` to the Collector receiver's `additional_jars`.
3. The Jetty JMX setup used a generic `jmx-remote` module pattern. Updated it to the documented `jmx-remote-auth` module flow and noted the generated password/access files.
4. Several metric names used legacy or incorrect names, including Tomcat session/thread/network metrics, Jetty thread/session/select metrics, and WildFly request/session/datasource metrics. Updated the metric list to current OpenTelemetry JMX target-system metric names.
5. The JVM metrics section claimed GC counts and durations are collected by adding `jvm`. Updated it because the current JMX YAML-based JVM metric definitions do not support `jvm.gc.duration`; the post now points readers to Java agent runtime telemetry when GC duration is required.
6. The text referred to a JMX metrics gatherer JAR. Updated it to describe the current JMX scraper JAR.

## Review Notes
The Collector JMX receiver remains documented in OpenTelemetry Collector Contrib and can launch the JMX Scraper JAR. OpenTelemetry's Java JMX documentation also documents running the JMX Scraper as a standalone JVM, so future revisions could consider showing the standalone scraper plus an OTLP receiver as an alternative deployment model.
