# Validation Summary: How to Monitor Laravel Queue Jobs with OpenTelemetry Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Laravel queues and queue events
- Laravel job chaining and batching
- PHP
- OpenTelemetry PHP tracing
- OpenTelemetry PHP context propagation
- OpenTelemetry PHP metrics
- Redis queue depth inspection

## Sources Consulted
- Laravel 12.x Queues documentation: https://laravel.com/docs/12.x/queues
- Laravel Queue facade source, including `createPayloadUsing()`: https://github.com/laravel/framework/blob/12.x/src/Illuminate/Support/Facades/Queue.php
- Laravel base Queue source, including payload creation hooks: https://github.com/laravel/framework/blob/12.x/src/Illuminate/Queue/Queue.php
- Laravel queue job contract/source for `attempts()`, `maxTries()`, `release()`, and `fail()`: https://github.com/laravel/framework/blob/12.x/src/Illuminate/Contracts/Queue/Job.php
- OpenTelemetry PHP propagation documentation: https://opentelemetry.io/docs/languages/php/propagation/
- OpenTelemetry PHP context documentation: https://opentelemetry.io/docs/languages/php/context/
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP API source for `TraceContextPropagator`, span builders, and metrics instruments: https://github.com/open-telemetry/opentelemetry-php
- Packagist package metadata for `open-telemetry/opentelemetry-auto-laravel`: https://packagist.org/packages/open-telemetry/opentelemetry-auto-laravel

## Issues Found
- The original propagation trait used Laravel job middleware to capture trace context at dispatch time. Laravel job middleware runs when the worker handles an already-queued job, so it cannot inject the request context into the queued payload. Replaced this with Laravel's `Queue::createPayloadUsing()` hook in the tracing service.
- The original examples used nonexistent OpenTelemetry PHP context serialization/restoration calls such as `Context::storage()->serialize()`, `Context::storage()->unserialize()`, and `Context::restore()`. Replaced them with `TraceContextPropagator::inject()` and `TraceContextPropagator::extract()` using a W3C trace context carrier in the queue payload.
- Several PHP examples referenced `Globals` or `StatusCode` without importing them. Added the missing `use OpenTelemetry\API\Globals;` and `use OpenTelemetry\API\Trace\StatusCode;` statements where needed.
- The job examples continued to call `restoreTraceContext()` after the trait was removed. Removed those calls and clarified that spans inside `handle()` inherit from the active queue span created by the queue event listener.
- The batch callback example captured and modified a span after dispatch, but Laravel batch callbacks run later and are serialized for queued execution. Changed the callbacks to create their own spans instead of using an already-ended dispatch span.
- The queue failure metadata assumed `maxTries()` always returns an integer. Laravel allows it to return `null`, so the code now avoids null OpenTelemetry attributes and computes `job.will_retry` safely.

## Review Notes
The article is now technically consistent with current Laravel queue behavior and OpenTelemetry PHP propagation APIs. A production implementation should still include complete SDK/exporter configuration and ensure PHP auto-instrumentation requirements, including the OpenTelemetry extension when using `open-telemetry/opentelemetry-auto-laravel`, are installed in the target environment.
