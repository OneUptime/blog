# Validation Summary: Preserve Correlation IDs in Reactor and CompletableFuture MDC

## Status
validated

## Post Type
Technical guide with Java implementation examples.

## Technologies Covered
- Java collections, functional interfaces, executors, and CompletableFuture
- SLF4J mapped diagnostic context (MDC) and Logback
- Project Reactor Mono, schedulers, signals, and subscriber Context
- Spring/Reactor and Micrometer context propagation
- OpenTelemetry trace context and span parentage

## Sources Consulted
- SLF4J MDC API: https://www.slf4j.org/apidocs/org/slf4j/MDC.html
- Logback MDC manual: https://logback.qos.ch/manual/mdc.html
- Java SE 21 CompletableFuture API and execution policies: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html
- Java SE 21 Map API, including Map.of: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html
- Reactor subscriber Context guide: https://projectreactor.io/docs/core/release/reference/advancedFeatures/context.html
- Reactor contextual logging FAQ: https://projectreactor.io/docs/core/release/reference/faq.html#faq.mdc
- Reactor Mono API, including doOnEach and publishOn: https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html
- Reactor context propagation support: https://projectreactor.io/docs/core/release/reference/advanced-contextPropagation.html
- OpenTelemetry Java API, context and span parenting: https://opentelemetry.io/docs/languages/java/api/#context
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. There are no terminal commands or configuration snippets to correct.
- Confirmed that MDC copies may be null, setContextMap replaces the current thread's map, and finally-based restoration preserves the previous scope. The immutable snapshot is suitable for callbacks reused across threads.
- Confirmed CompletableFuture execution policies and registration-time capture. The callback wrappers capture before submission, so later execution does not depend on the submitting worker retaining request context. Cancellation is exceptional completion; logging completion/error handlers need their own suitable wrappers.
- Confirmed Reactor Context propagation toward upstream operators, the placement of contextWrite after doOnEach, signal context access, and callback-scoped MDC restoration. The example only bridges its own logging callback; it does not populate MDC throughout the pipeline. The Mono must be subscribed to by the caller or framework before logging occurs.
- The Reactor example preserves existing worker MDC fields and overrides correlation_id during logging. Other request-specific fields must be propagated deliberately if needed; retaining existing fields does not validate their provenance.
- Confirmed the distinction between MDC and OpenTelemetry parent context. Reactor's automatic propagation requires the relevant Micrometer integration and accessors; applications should check their existing configuration as the post recommends.
- Combined the four Java snippets into a temporary class, placing imports, utility methods, the constant, and example method bodies in their stated scopes and supplying a configured logger. Compilation with deprecation lint enabled succeeded without warnings on OpenJDK 17.0.16, SLF4J 2.0.17, Logback 1.5.18, Reactor Core 3.8.7, and Reactive Streams 1.0.4. These are the tested versions, not a claim that every dependency is the latest release.
- Executed both examples. The two future log messages and the Reactor log message contained correlation_id=request-42, and the Reactor result was available.
- Additional assertions passed for nested scopes, null captured context, restoration after an exception, preservation of an outer MDC scope, 100 distinct request chains sharing one worker, immediate and delayed continuations, and restoration of a pre-existing worker correlation ID.
- Runtime checks did not exercise Reactor inner flatMap branches, Reactor error/cancellation paths, CompletableFuture cancellation, or automatic propagation integrations. Those remain application-level test recommendations rather than claimed test coverage. Java 21 policies were reviewed against the linked documentation; local execution used Java 17.
- Map.of requires Java 9 or newer. The Reactor ContextView APIs require a compatible modern Reactor release. No deprecated APIs were identified in the examples.
- All post links resolved to the intended resources. SLF4J and Logback pages timed out in the browser fetch tool but were successfully retrieved directly over HTTPS for review.
