# Validation Summary: How to Build Custom Sleuth Samplers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Java
- Spring Cloud Sleuth
- OpenZipkin Brave
- Zipkin
- Micrometer
- Distributed tracing
- Trace sampling

## Sources Consulted
- Spring Cloud Sleuth Reference Documentation: https://docs.spring.io/spring-cloud-sleuth/docs/current/reference/htmlsingle/
- Spring Cloud Sleuth Brave sampling customization docs: https://docs.spring.io/spring-cloud-sleuth/docs/current-SNAPSHOT/reference/html/project-features.html#features-brave-sampling
- Spring Cloud 2023.0.0 release announcement: https://spring.io/blog/2023/12/06/spring-cloud-2023-0-0-aka-leyton-is-now-available
- Spring Cloud 2021.0.9 release announcement: https://spring.io/blog/2023/12/20/spring-cloud-2021-0-9-aka-jubilee-is-now-available
- Brave HttpTracing source documentation for request samplers: https://github.com/openzipkin/brave/blob/master/instrumentation/http/src/main/java/brave/http/HttpTracing.java
- Brave Sampler and RateLimitingSampler API documentation: https://zipkin.io/brave/5.12.3/brave/brave/sampler/class-use/Sampler.html
- Brave SpanHandler API documentation: https://javadoc.io/doc/io.zipkin.brave/brave/5.12.6/brave/handler/SpanHandler.html

## Issues Found
- The setup used Spring Cloud `2023.0.0`, which is a Spring Boot 3.x release train and does not include supported Spring Cloud Sleuth usage. Updated the example to Spring Cloud `2021.0.9` and added a Spring Boot 2.x caveat because Sleuth's last minor version is 3.1.
- The setup omitted dependencies needed by later snippets. Added `spring-boot-starter-actuator` for actuator endpoints and Micrometer registry usage, and `spring-boot-starter-test` for the JUnit/Mockito test example.
- The post described `SamplerFunction<HttpRequest>` as coming from Sleuth. Corrected the wording because the type is a Brave API that Sleuth wires by bean name.
- The `CompleteSamplerConfig` example did not implement the debug header behavior that the test expected. Added the `X-Debug-Trace` check to the sampler.
- Removed unused imports, including actuator health imports that would require types not used by the adaptive sampler example.
- The error-aware sampling section implied that a `SpanHandler` or interceptor could override an unsampled head-sampling decision after the response. Corrected the diagram and wording to clarify that these approaches only tag or retain spans that were already sampled.
- The rule-based sampler could match a path-only rule when the request path was null. Updated the path check so path-pattern rules require a non-null path.
- The composite sampler and monitored sampler examples depended on ambiguous self-referential `SamplerFunction<HttpRequest>` injection. Updated them to compose explicit delegates.

## Review Notes
Spring Cloud Sleuth is legacy technology as of 2026. The post is technically salvageable for Spring Boot 2.x maintenance applications, but a future article should cover Micrometer Tracing for Spring Boot 3.x and newer projects.
