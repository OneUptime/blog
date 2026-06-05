# Validation Summary: How to Configure OpenTelemetry Twig Template Tracing in Symfony

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry PHP API and SDK
- Symfony
- Symfony TwigBundle
- FriendsOfOpenTelemetry Symfony bundle
- Twig profiler extension
- Twig extensions, functions, runtimes, includes, blocks, and macros
- PHP service instrumentation

## Sources Consulted
- Twig extending documentation: https://twig.symfony.com/doc/3.x/advanced.html
- Twig API and profiler extension documentation: https://twig.symfony.com/doc/3.x/api.html
- Twig `Profile` source: https://github.com/twigphp/Twig/blob/3.x/src/Profiler/Profile.php
- Twig `ProfilerExtension` source: https://github.com/twigphp/Twig/blob/3.x/src/Extension/ProfilerExtension.php
- Symfony TwigBundle configuration reference: https://symfony.com/doc/current/reference/configuration/twig.html
- Symfony TwigBundle configuration source: https://github.com/symfony/twig-bundle/blob/7.4/DependencyInjection/Configuration.php
- Symfony templates and Twig extension/runtime documentation: https://symfony.com/doc/current/templates.html
- OpenTelemetry PHP `TracerInterface` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Trace/TracerInterface.php
- OpenTelemetry PHP `SpanInterface` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Trace/SpanInterface.php
- OpenTelemetry PHP `SpanBuilderInterface` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Trace/SpanBuilderInterface.php
- OpenTelemetry PHP `SpanKind` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/API/Trace/SpanKind.php
- OpenTelemetry PHP `SpanProcessorInterface` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/SDK/Trace/SpanProcessorInterface.php
- OpenTelemetry PHP `ReadableSpanInterface` source: https://github.com/open-telemetry/opentelemetry-php/blob/main/src/SDK/Trace/ReadableSpanInterface.php
- FriendsOfOpenTelemetry Symfony bundle trace configuration docs: https://friendsofopentelemetry.github.io/opentelemetry-bundle/instrumentation/traces.html

## Issues Found
- The post presented an incomplete node visitor implementation as working code. Removed the executable code sample and kept the explanation focused on the Twig profiler extension approach, because a custom node visitor also needs a custom Twig node compiler implementation.
- The post attempted to extend `Twig\Profiler\Profile`, but current Twig marks `Profile` as `final` and profiling hooks live on `Twig\Extension\ProfilerExtension`. Changed the example to extend `ProfilerExtension` and pass a root `Profile` to the parent constructor.
- The post used a non-existent `twig.profiler.class` TwigBundle configuration key. Replaced it with a Symfony service tagged as `twig.extension`.
- The post referenced an incorrect tracer provider service ID. Updated the example to inject the FriendsOfOpenTelemetry bundle's documented default tracer service.
- The runtime-backed `trace_include` Twig function did not show the required `twig.runtime` service tag. Added the runtime service registration.
- The `trace_include` function returned rendered HTML but was not marked safe, so Twig autoescaping would escape the included markup when printed with `{{ ... }}`. Added `is_safe: ['html']` to the function options.
- The controller override used `Response $response = null`; updated it to `?Response $response = null` to match modern Symfony/PHP nullable typing.
- The custom Twig extension example referenced an undefined `$priceFormatter` property. Replaced that call with a local simplified helper method.
- The span processor example used methods not present on OpenTelemetry PHP `ReadableSpanInterface`: `getEndEpochNanos()`, `getStartEpochNanos()`, and `getAttributes()`. Updated it to use `getDuration()` and `getAttribute()`.
- The span processor example omitted the optional `CancellationInterface` parameters required by the current OpenTelemetry PHP `forceFlush()` and `shutdown()` signatures. Added the import and parameters.
- The post showed an unsupported `opentelemetry.span_processor` Symfony service tag. Replaced it with guidance to register the processor with the active OpenTelemetry tracer provider or the chosen Symfony bundle's processor configuration.

## Review Notes
FriendsOfOpenTelemetry's Symfony bundle documents built-in Twig instrumentation. This tutorial remains valid as a manual customization path, but future revisions could state the assumed OpenTelemetry Symfony bundle and installation steps explicitly.
