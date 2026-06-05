# Validation Summary: How to Troubleshoot OpenTelemetry Java SDK Version Conflicts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java SDK
- Java servlet instrumentation
- Jakarta EE and Java EE namespace migration
- Apache Tomcat / TomEE
- WildFly / JBoss EAP
- Payara / GlassFish
- Maven dependencies

## Sources Consulted
- OpenTelemetry Java agent application server configuration: https://opentelemetry.io/docs/zero-code/java/agent/server-config/
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java supported libraries and application-server smoke tests: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK exporters: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- Apache Tomcat 10 migration guide: https://tomcat.apache.org/migration-10
- WildFly 27 release notes: https://www.wildfly.org/news/2022/11/09/WildFly-27-Final-is-released/
- Payara create-jvm-options command reference: https://docs.payara.fish/community/docs/Technical%20Documentation/Payara%20Server%20Documentation/Command%20Reference/create-jvm-option.html
- Payara create-system-properties command reference: https://docs.payara.fish/community/docs/Technical%20Documentation/Payara%20Server%20Documentation/Command%20Reference/create-system-properties.html

## Issues Found
- The post described `-Dotel.instrumentation.servlet.enabled=true` as a way to specify the servlet namespace. This property only enables servlet instrumentation, so the section was changed to explain that it verifies/enables servlet instrumentation and that the app and server must use matching servlet APIs.
- The diagnostic command used `java -jar myapp.war`, which is not a normal way to run a WAR on an application server. The example now uses `server.jar`.
- The Tomcat OTLP endpoint used port `4317` without setting the OTLP protocol to gRPC. Current OpenTelemetry Java agent versions default to `http/protobuf`, so the endpoint was changed to `http://collector:4318`.
- The WildFly section recommended a `jboss-deployment-structure.xml` system dependency for OpenTelemetry classes. That is not the correct way to provide application compile-time OpenTelemetry dependencies, so it now says to add the OpenTelemetry API or SDK dependencies to the WAR when application code uses them.
- The Payara command used an unescaped `-javaagent:` option and set `OTEL_SERVICE_NAME` as a system property. The command now uses the escaped `-javaagent\:` form from OpenTelemetry/Payara docs and sets `otel.service.name=payara-app`.
- The SDK dependency versions were outdated at `1.34.0`. They were updated to `1.62.0`, matching the current OpenTelemetry Java SDK documentation consulted during review.
- The SDK code used deprecated `ResourceAttributes.SERVICE_NAME`. It now uses `AttributeKey.stringKey("service.name")`.
- The common error message table implied the agent "expects" a servlet namespace. The causes and fixes were updated to describe application/server servlet API mismatches and server-provided API scoping more accurately.

## Review Notes
The snippets omit imports for brevity, so a complete application would need the corresponding OpenTelemetry and servlet imports. For Jakarta EE 9+ servers, the listener imports should use `jakarta.servlet.*`; for older Java EE servers, they should use `javax.servlet.*`.
