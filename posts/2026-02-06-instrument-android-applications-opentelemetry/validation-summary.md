# Validation Summary: How to Instrument Android Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Java API and SDK
- OpenTelemetry Android
- OpenTelemetry OkHttp instrumentation
- OTLP trace export
- Kotlin coroutines
- Android Activity lifecycle
- Android Room
- Gradle

## Sources Consulted
- OpenTelemetry Android documentation: https://opentelemetry.io/docs/platforms/client-apps/android/
- OpenTelemetry Java intro and BOM documentation: https://opentelemetry.io/docs/languages/java/intro/
- OpenTelemetry Java SDK/exporter documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry OkHttp instrumentation Javadocs: https://javadoc.io/doc/io.opentelemetry.instrumentation/opentelemetry-okhttp-3.0
- OpenTelemetry SDK and OTLP exporter Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk and https://javadoc.io/doc/io.opentelemetry/opentelemetry-exporter-otlp
- OpenTelemetry Android Maven metadata: https://repo1.maven.org/maven2/io/opentelemetry/android/opentelemetry-android-bom/maven-metadata.xml
- Android Room DAO documentation: https://developer.android.com/reference/androidx/room/Dao

## Issues Found
- The dependency block used outdated versions and an old Android artifact. Updated the Gradle snippet to use current OpenTelemetry BOM-managed dependencies, the current Android BOM artifact, `android-agent`, the Kotlin context propagation extension, and the current OkHttp instrumentation artifact.
- The setup snippet used `OtlpGrpcSpanExporter` against a `:4317` endpoint. For Android examples, OTLP/HTTP is a better fit and matches the Android documentation pattern, so the snippet now uses `OtlpHttpSpanExporter` with a `/v1/traces` endpoint.
- The semantic convention import path was incorrect for the version shown, and those generated constants have changed across releases. Replaced the generated `ResourceAttributes` constants with literal semantic attribute names to keep the sample compiling across the current dependency set.
- `openTelemetry` was declared private but later accessed from `NetworkClient`. Changed it to a public `lateinit var` with a private setter.
- The OkHttp example used the deprecated/old interceptor path. Updated it to wrap the base client with the current `createCallFactory(...)` API.
- Coroutine examples created spans but did not propagate OpenTelemetry context across coroutine suspension. Added `opentelemetry-extension-kotlin` and `asContextElement()` usage.
- Several Kotlin snippets had compile-time issues: `view.id` and `results.size` needed conversion to `Long` for span attributes, `this::class.simpleName` / `view::class.simpleName` could require Kotlin reflection, and several imports were missing. Updated the snippets accordingly.

## Review Notes
The examples remain illustrative and still use placeholder app types such as `User`, `UserProfile`, `UserDao`, and `parseUserProfile`. In a production Android app, avoid putting sensitive user identifiers directly into span attributes unless they are approved by your privacy policy and telemetry controls.
