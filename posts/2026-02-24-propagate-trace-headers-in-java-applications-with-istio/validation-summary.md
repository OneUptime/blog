# Validation Summary: How to Propagate Trace Headers in Java Applications with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy distributed tracing
- Java
- Spring Boot
- Spring RestTemplate
- Spring WebClient / WebFlux
- Servlet filters
- OpenTelemetry Java agent
- gRPC Java
- Kubernetes `kubectl logs`

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio distributed tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- OpenTelemetry Java SDK and agent configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- Spring Framework `ClientHttpRequestInterceptor` API docs: https://docs.spring.io/spring-framework/docs/6.2.9/javadoc-api/org/springframework/http/client/ClientHttpRequestInterceptor.html
- Spring Framework WebClient filter docs: https://docs.spring.io/spring-framework/reference/web/webflux-webclient/client-filter.html
- Spring Framework `ClientRequest.Builder` API docs: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/reactive/function/client/ClientRequest.Builder.html
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- gRPC Java `Metadata` API docs: https://grpc.github.io/grpc-java/javadoc/io/grpc/Metadata.html

## Issues Found
- Several Java snippets omitted imports required for the examples to compile as written. I added missing Spring, Java collection, and gRPC-related imports where needed, and removed an unused `ServerWebExchange` import from the WebClient example.
- The WebClient example appended propagated trace headers with `builder.header(...)`, which can create duplicate singleton trace-context headers if the outgoing request already has a value. I changed it to set the header value through `builder.headers(...)`.
- The OpenTelemetry section said the agent intercepts HTTP calls and adds trace headers immediately after listing JDBC and Kafka clients. JDBC instrumentation creates database spans and does not add HTTP trace headers. I changed the wording to say the agent instruments many supported libraries and injects trace context automatically for supported HTTP and RPC clients.
- The gRPC section used `TraceHeaderFilter.getTraceHeaders()`, which only exists in the servlet-filter approach shown earlier. I narrowed the text so it accurately describes gRPC clients called from that servlet request context, rather than implying a complete standalone gRPC server-to-client propagation setup.

## Review Notes
- The main Istio guidance is accurate: Istio sidecars can emit spans, but applications must propagate trace context between inbound and outbound requests so spans can be joined into a single trace.
- The listed headers match Istio's current W3C and Zipkin B3 propagation guidance. Istio also documents additional vendor-specific headers for some tracing backends; this post reasonably focuses on the common W3C and B3 set.
- `OTEL_TRACES_EXPORTER=none` is a valid OpenTelemetry Java configuration value when Istio is expected to export proxy-generated spans, but teams should test the resulting trace shape because unexported application spans can still affect parent-child relationships in propagated context.
