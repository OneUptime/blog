# Validation Summary: How to Build RabbitMQ Consumers with MassTransit in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- C#
- MassTransit
- RabbitMQ
- NuGet
- ASP.NET Core dependency injection

## Sources Consulted
- MassTransit RabbitMQ transport documentation: https://masstransit.massient.com/configuration/transports/rabbitmq
- MassTransit consumer documentation: https://masstransit.massient.com/concepts/consumers
- MassTransit message serialization documentation: https://masstransit.massient.com/configuration/serialization
- MassTransit retry middleware documentation: https://masstransit.massient.com/configuration/middleware/retry
- MassTransit exceptions and error queue documentation: https://masstransit.massient.com/concepts/exceptions
- MassTransit request/response documentation: https://masstransit.massient.com/concepts/requests
- MassTransit middleware filter documentation: https://masstransit.massient.com/guides/middleware
- MassTransit test harness documentation: https://masstransit.massient.com/guides/unit-testing
- MassTransit supported NuGet packages: https://masstransit.massient.com/reference/packages
- Microsoft .NET CLI package command documentation: https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-package-add
- Microsoft NuGet package installation documentation: https://learn.microsoft.com/en-us/nuget/consume-packages/install-use-packages-dotnet-cli
- RabbitMQ dead letter exchange documentation: https://www.rabbitmq.com/docs/dlx

## Issues Found
- The comparison table said MassTransit provides built-in JSON/XML serialization. Current MassTransit documentation lists System.Text.Json as the default and XML support through the optional MassTransit.Newtonsoft package, so this was changed to "Built-in JSON with optional serializer packages."
- The comparison table and error handling section described MassTransit's default failed-message behavior as dead letter queues. MassTransit moves failed consumer messages to endpoint-specific `_error` queues by default, while RabbitMQ dead-letter exchanges are a separate broker feature. The wording was changed to "Error queues" and the section title was updated.
- The retry example mixed `Handle<T>` and `Ignore<T>` exception filters in the same retry policy. MassTransit documentation warns that combining `Handle` and `Ignore` in a single exception filter has unpredictable effects. The unnecessary `Ignore<ValidationException>()` line was removed.
- The error handling example replaced the default error pipeline with a custom `ConfigureError` filter and then configured a RabbitMQ dead-letter queue, which did not match the preceding claim that failed messages go to the `_error` queue. The snippet was simplified to the default, correct behavior: messages that fail retries on the `payment-processing` endpoint go to `payment-processing_error`.
- The consumer filter registration used `e.UseFilter(new LoggingFilter<OrderSubmitted>(logger))`, but `logger` was not defined in the snippet and this bypassed the scoped filter pattern needed for dependency injection. The example was changed to `e.UseConsumeFilter(typeof(LoggingFilter<>), context)`, matching MassTransit's scoped consume filter API.

## Review Notes
- The post does not specify a MassTransit version. The review used current official MassTransit documentation available on 2026-06-12.
- The local environment did not have the .NET SDK installed, so CLI validation was performed against Microsoft documentation rather than local `dotnet --help` output.
- The `dotnet add package` form remains documented for .NET 9 SDK and earlier; Microsoft documentation now shows `dotnet package add` as the .NET 10 noun-first form.
