# Validation Summary: How to Troubleshoot Slow Spring Boot Startup Caused by OpenTelemetry Java Agent

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry Java instrumentation configuration
- OpenTelemetry Spring Boot starter
- Java Application Class Data Sharing
- Spring Boot executable jars
- Kubernetes startup and readiness probes

## Sources Consulted
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent suppressing instrumentation documentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java agent supported libraries documentation: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java instrumentation repository README: https://github.com/open-telemetry/opentelemetry-java-instrumentation
- OpenTelemetry Java instrumentation extension example: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/examples/extension
- OpenTelemetry Java instrumentation distribution example: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/main/examples/distro
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- Spring Boot Class Data Sharing documentation: https://docs.spring.io/spring-boot/3.5/reference/packaging/class-data-sharing.html
- Oracle Java command documentation for CDS options: https://docs.oracle.com/en/java/javase/22/docs/specs/man/java.html
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post used the incorrect property `otel.instrumentation.default.enabled=false`. I changed it to the documented `otel.instrumentation.common.default-enabled=false` and updated the prose accordingly.
- The debug logging section claimed the agent logs per-class transformation times. The agent debug setting is valid, but current logs show transformed classes and are verbose; they do not provide reliable per-class timing. I corrected the explanation.
- The lazy instrumentation section used an unsupported `otel.javaagent.experimental.early-class-transform=false` property. I replaced it with the documented advanced `otel.javaagent.exclude-classes` option and added the required caution about partial instrumentation.
- The custom slim agent example showed a plain Maven dependency on an outdated agent version, which is not sufficient to build a custom distribution. I replaced it with the OpenTelemetry Java instrumentation distribution pattern and current agent version, and noted that extensions are usually easier to maintain.
- The AppCDS section claimed CDS caches transformed classes and used a static CDS workflow that is not the Spring Boot documented workflow. I changed it to the Spring Boot extraction plus `ArchiveClassesAtExit` workflow and clarified that CDS reduces JVM class loading work but does not replace agent transformation work.
- The Spring Boot starter dependency example omitted the required OpenTelemetry instrumentation BOM. I added BOM dependency management and corrected the explanation to say the starter avoids Java agent bytecode transformation but has less out-of-the-box coverage.
- The comparison table used precise startup overhead ranges that are not guaranteed by official documentation. I changed those values to relative impact levels while keeping the intended comparison.

## Review Notes
The Kubernetes startup probe example is structurally valid for a container spec. The exact startup savings from each approach remain workload-specific and should be measured in the target service and JVM environment.
