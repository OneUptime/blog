# Validation Summary: How to Fix OpenTelemetry Java Agent Conflicts with SkyWalking or Other Bytecode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java agent
- Apache SkyWalking Java agent
- Java `java.lang.instrument` / `-javaagent`
- JVM system properties and `JAVA_TOOL_OPTIONS`
- Kubernetes Deployment environment variables
- W3C Trace Context

## Sources Consulted
- Oracle Java SE `java.lang.instrument` package documentation: https://docs.oracle.com/en/java/javase/25/docs/api/java.instrument/java/lang/instrument/package-summary.html
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent suppressing instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- Apache SkyWalking Java agent setup documentation: https://skywalking.apache.org/docs/skywalking-java/latest/en/setup/service-agent/java-agent/readme/
- Apache SkyWalking Java agent configuration properties: https://skywalking.apache.org/docs/skywalking-java/latest/en/setup/service-agent/java-agent/configurations/
- Apache SkyWalking Java agent setting override documentation: https://skywalking.apache.org/docs/skywalking-java/v9.3.0/en/setup/service-agent/java-agent/setting-override/
- Apache SkyWalking Cross Process Propagation Headers Protocol: https://skywalking.apache.org/docs/main/latest/en/api/x-process-propagation-headers-v3/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post claimed that SkyWalking Java agent W3C propagation can be enabled with `-Dskywalking.agent.propagation_format=W3C`. I could not verify this property in current official SkyWalking Java agent configuration documentation, and SkyWalking's official propagation protocol documentation describes the native `sw8` header. I removed the unsupported SkyWalking command and changed the guidance to warn readers to verify compatibility for their exact SkyWalking version or use an explicit bridge/gateway that supports both formats.

## Review Notes
The remaining Java agent examples and OpenTelemetry properties were consistent with official documentation. The recommendation to avoid running multiple bytecode instrumentation agents in one JVM is technically sound as operational guidance, although the Java platform itself does allow multiple `-javaagent` options and invokes them in command-line order.
