# Validation Summary: How to Instrument Polly Resilience Policies with OpenTelemetry in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- Polly v8 resilience pipelines
- Polly.Extensions telemetry
- Microsoft.Extensions.Http.Resilience
- OpenTelemetry .NET tracing and metrics
- PromQL

## Sources Consulted
- Polly telemetry documentation: https://www.pollydocs.org/advanced/telemetry.html
- Polly retry strategy documentation: https://www.pollydocs.org/strategies/retry
- Polly circuit breaker strategy documentation: https://www.pollydocs.org/strategies/circuit-breaker.html
- Polly fallback strategy documentation: https://www.pollydocs.org/strategies/fallback.html
- Polly telemetry API reference: https://www.pollydocs.org/api/Polly.Telemetry.html
- Polly `TelemetryEventArguments<TResult, TArgs>` API reference: https://www.pollydocs.org/api/Polly.Telemetry.TelemetryEventArguments-2.html
- Polly `OnRetryArguments<TResult>` API reference: https://www.pollydocs.org/api/Polly.Retry.OnRetryArguments-1.html
- Polly `OnTimeoutArguments` API reference: https://www.pollydocs.org/api/Polly.Timeout.OnTimeoutArguments.html
- Polly custom proactive strategy documentation: https://www.pollydocs.org/extensibility/proactive-strategy.html
- Microsoft Learn HTTP resilience documentation: https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience
- OpenTelemetry .NET resource documentation: https://opentelemetry.io/docs/languages/dotnet/resources/
- NuGet package metadata for Polly, Polly.Extensions, Microsoft.Extensions.Http.Resilience, and OpenTelemetry packages.

## Issues Found
- The post claimed that Polly/OpenTelemetry automatically creates spans for every retry and timeout. Polly v8 telemetry emits events, logs, and metrics; custom tracing requires a listener or explicit `ActivitySource` usage. Updated the prose, diagram, and retry comment to describe events and metrics accurately.
- The package list used `Microsoft.Extensions.Http.Polly`, which is the older HttpClient Polly integration package and does not match the v8 `Microsoft.Extensions.Http.Resilience` examples. Replaced it with `Microsoft.Extensions.Http.Resilience` and updated package versions to current stable releases available on NuGet.
- The package list omitted `OpenTelemetry.Instrumentation.AspNetCore` while the code used `.AddAspNetCoreInstrumentation()`. Added the missing package.
- The OpenTelemetry setup used `.AddSource("Polly")`, but Polly's built-in telemetry is metrics under the `Polly` meter rather than spans from a `Polly` activity source. Replaced it with the custom activity sources used later and added the custom meters.
- The `ResourceBuilder.AddService` example passed the version as a positional second argument, which maps to service namespace rather than service version. Changed it to named arguments.
- The custom telemetry listener used nonexistent argument types (`RetryArguments` and `TimeoutArguments`). Replaced them with `OnRetryArguments<TResult>` and `OnTimeoutArguments`.
- The telemetry listener accessed `args.Outcome` as non-null even though the API exposes it as nullable. Updated exception access to use null-safe operators.
- The `ConfigureTelemetry` registration snippet used an unsupported lambda overload. Changed it to create a `TelemetryOptions` instance and pass it to `ConfigureTelemetry`.
- The HttpClient snippet omitted Polly namespaces needed for `DelayBackoffType`, `PredicateResult`, and HTTP strategy option types. Added the required using directives.
- The custom rate-limit strategy tagged `_semaphore.CurrentCount` as max concurrency, which actually reports currently available slots. Stored and reported the configured maximum concurrency separately.
- The fallback example returned `Outcome.FromResultAsValueTask(...)` from an `async` fallback lambda. Changed it back to returning `Outcome.FromResult(...)`, which matches the delegate shape when the lambda is async.
- The PromQL examples used an average over a counter, an invalid circuit breaker percentage expression, and a timeout metric not defined in the article. Replaced them with rate, gauge, histogram, and Polly built-in event counter examples.

## Review Notes
The local environment does not have the `dotnet` CLI installed, so I could not compile the snippets. The review was performed against official Polly, Microsoft Learn, OpenTelemetry documentation, and current NuGet metadata.
