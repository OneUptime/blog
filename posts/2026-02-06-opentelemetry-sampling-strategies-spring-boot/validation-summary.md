# Validation Summary: How to Configure OpenTelemetry Sampling Strategies in Spring Boot Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Java SDK
- OpenTelemetry Spring Boot starter
- OpenTelemetry sampling
- Spring Boot
- Spring Cloud refresh
- Java
- Maven
- YAML configuration
- Micrometer

## Sources Consulted
- OpenTelemetry Spring Boot starter getting started documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/getting-started/
- OpenTelemetry Spring Boot starter SDK configuration documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Spring Boot starter programmatic configuration documentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/programmatic-configuration/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry Java semantic conventions API documentation: https://opentelemetry.io/docs/languages/java/api/
- Maven Central entry for `io.opentelemetry.instrumentation:opentelemetry-spring-boot-starter`: https://central.sonatype.com/artifact/io.opentelemetry.instrumentation/opentelemetry-spring-boot-starter
- OpenTelemetry Collector tail sampling example: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/

## Issues Found
- The dependency snippet used outdated explicit versions and added `opentelemetry-sdk-extension-autoconfigure` directly. Updated it to use the current OpenTelemetry instrumentation BOM and the Spring Boot starter dependency, matching official starter guidance.
- The YAML sampler configuration used an invalid nested `type`/`arg` shape. Replaced it with the supported `otel.traces.sampler` and `otel.traces.sampler.arg` properties and used `parentbased_traceidratio` so parent sampling decisions are respected.
- The custom sampler examples returned plain Spring `Sampler` beans. The OpenTelemetry Spring Boot starter documents `AutoConfigurationCustomizerProvider` as the programmatic customization hook, so the examples now register sampler customizers through that API.
- The rule-based sampler attempted to sample errors using HTTP status code attributes during head sampling. The OpenTelemetry Trace SDK calls samplers before the span is created, so completed response status is not reliably available. The post now explains that completed error or latency decisions require tail-based sampling.
- The code used deprecated HTTP semantic convention constants such as `SemanticAttributes.HTTP_TARGET` and `HTTP_STATUS_CODE`. Updated the examples and tests to use current semantic convention constants for URL path matching.
- The `RuleBasedSampler` constructor and tests included an unused `errorRate` argument after removing head-sampled error logic. Updated the constructor, configuration, and tests to match.
- The dynamic sampler was shown as a component but was not registered with OpenTelemetry autoconfiguration. Added the required `AutoConfigurationCustomizerProvider` registration example.
- The monitored sampler used `result.getDecision().isSampled()`, which is not part of the Java `SamplingDecision` enum API. Replaced it with an explicit comparison to `SamplingDecision.RECORD_AND_SAMPLE`.
- The monitored sampler was annotated as a Spring component with a `Sampler` constructor dependency that would not reliably be supplied by the starter. Updated it to be a wrapper created by an OpenTelemetry sampler customizer.

## Review Notes
- The post remains focused on head-based SDK sampling in Spring Boot. For production policies that depend on final trace state, such as errors or latency, the post now points readers toward tail-based sampling in the Collector or backend.
