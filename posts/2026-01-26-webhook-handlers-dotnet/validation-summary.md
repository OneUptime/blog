# Validation Summary: How to Build Webhook Handlers in .NET

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- .NET
- ASP.NET Core controllers and hosted background services
- Stripe webhooks and stripe-dotnet signature verification
- GitHub webhook HMAC signature verification
- Redis idempotency locks
- System.Threading.Channels
- RabbitMQ .NET client
- System.Diagnostics.Metrics
- xUnit and ASP.NET Core integration testing

## Sources Consulted
- Microsoft Learn: Background tasks with hosted services in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services
- Microsoft Learn: Channels in .NET - https://learn.microsoft.com/en-us/dotnet/core/extensions/channels
- Microsoft Learn: CryptographicOperations.FixedTimeEquals - https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.fixedtimeequals
- Microsoft Learn: DistributedCacheExtensions.SetStringAsync - https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.distributed.distributedcacheextensions.setstringasync
- Microsoft Learn: Creating Metrics in .NET - https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
- Stripe Docs: Receive Stripe events in your webhook endpoint - https://docs.stripe.com/webhooks
- stripe-dotnet EventUtility source - https://github.com/stripe/stripe-dotnet/blob/master/src/Stripe.net/Services/Events/EventUtility.cs
- GitHub Docs: Validating webhook deliveries - https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub Docs: Webhook events and payloads - https://docs.github.com/en/webhooks/webhook-events-and-payloads
- Redis Docs: SET command and NX option - https://redis.io/docs/latest/commands/set/
- RabbitMQ Docs: .NET/C# Client API Guide - https://www.rabbitmq.com/client-libraries/dotnet-api-guide
- RabbitMQ Docs: Work Queues tutorial for .NET - https://www.rabbitmq.com/tutorials/tutorial-two-dotnet
- RabbitMQ .NET API Reference: BasicProperties - https://rabbitmq.github.io/rabbitmq-dotnet-client/api/RabbitMQ.Client.BasicProperties.html

## Issues Found
- The Stripe processor example returned `Task<StripeEvent>` from an `async` method even though `EventUtility.ConstructEvent` is synchronous and returns `Stripe.Event` in stripe-dotnet. Changed the example to return `Stripe.Event` synchronously.
- The generic HMAC verifier compared lowercase hex strings as UTF-8 bytes and stripped signature prefixes with broad `Replace` calls. Changed it to strip only the expected prefix, decode the provided hex digest with `Convert.FromHexString`, check length, and compare digest bytes with `CryptographicOperations.FixedTimeEquals`.
- The GitHub webhook example did not guard against a missing configured webhook secret. Added a configuration check that throws if `GitHub:WebhookSecret` is missing.
- The idempotency example claimed Redis `SET NX` behavior but implemented a non-atomic `IDistributedCache.GetStringAsync` followed by `SetStringAsync`. Reworked the example to use StackExchange.Redis `StringSetAsync(..., When.NotExists)` for the processing lock.
- The idempotency example set the processed key before work completed, so its failure path comment about allowing retries was incorrect. Split processing locks from processed markers and added `ReleaseProcessingLockAsync` on failure.
- The queued Stripe handler treated a signature verifier as if it returned a `WebhookEvent`. Changed it to verify with `EventUtility.ConstructEvent`, handle `StripeException` as an unauthorized request, and convert the verified Stripe event to the domain event before enqueueing.
- The RabbitMQ publisher used the pre-v7 synchronous `CreateModel`, `QueueDeclare`, `CreateBasicProperties`, and `BasicPublish` API shape. Updated the snippet to current RabbitMQ .NET client v7 async APIs: `CreateChannelAsync`, `QueueDeclareAsync`, `BasicProperties`, and `BasicPublishAsync`.

## Review Notes
The post is now technically sound as a tutorial, but several snippets are intentionally partial and assume application-specific types such as `WebhookEvent`, `IWebhookProcessor`, and `WebhookEvent.FromStripeEvent`. No full project build was run because the post contains illustrative snippets rather than a compilable sample project.
