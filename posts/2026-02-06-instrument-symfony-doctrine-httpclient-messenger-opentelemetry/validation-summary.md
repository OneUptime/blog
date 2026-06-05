# Validation Summary: How to Instrument Symfony Doctrine, HttpClient, and Messenger with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- Symfony HttpClient
- Symfony Messenger
- Doctrine DBAL
- DoctrineBundle middleware registration
- OpenTelemetry PHP SDK/API
- OpenTelemetry W3C trace context propagation

## Sources Consulted
- OpenTelemetry PHP propagation documentation: https://opentelemetry.io/docs/languages/php/propagation/
- OpenTelemetry PHP context documentation: https://opentelemetry.io/docs/languages/php/context/
- OpenTelemetry PHP API source for TraceContextPropagator, SpanInterface, SpanBuilderInterface, SpanKind, and Context: https://github.com/open-telemetry/opentelemetry-php
- Symfony HttpClient documentation: https://symfony.com/doc/current/http_client.html
- Symfony HttpClient Contracts source for HttpClientInterface and ResponseInterface: https://github.com/symfony/http-client-contracts
- Symfony Messenger documentation: https://symfony.com/doc/current/messenger.html
- Symfony Messenger source for MiddlewareInterface, StackInterface, StampInterface, SentStamp, and transport serialization: https://github.com/symfony/messenger
- DoctrineBundle middleware documentation: https://www.doctrine-project.org/projects/doctrine-bundle/en/3.2/middlewares.html
- Doctrine DBAL 4.4 source for Driver, Driver\Connection, Driver\Statement, and Driver\Middleware: https://github.com/doctrine/dbal

## Issues Found
- The Doctrine driver wrapper used outdated DBAL driver methods. Updated the snippet to use the current `getDatabasePlatform(ServerVersionProvider $versionProvider)` signature and to implement `getExceptionConverter()`.
- The Doctrine connection wrapper did not fully match the current `Doctrine\DBAL\Driver\Connection` interface. Updated return types and delegated `quote()`, `getNativeConnection()`, and `getServerVersion()`.
- The Doctrine sample referenced `OpenTelemetryStatement` without defining it. Added a statement wrapper that implements the current `Doctrine\DBAL\Driver\Statement` interface and traces prepared statement execution.
- The Doctrine registration snippet used a `doctrine.dbal.middlewares` configuration shape that is not how DoctrineBundle documents middleware registration. Updated it to register the middleware service with the `doctrine.middleware` tag.
- The HttpClient wrapper used an incorrect propagation call, `Context::getCurrent()->propagate()`. Replaced it with `TraceContextPropagator::getInstance()->inject()`, matching OpenTelemetry PHP documentation.
- The HttpClient wrapper passed a tracer object back into a constructor that expected `TracerProviderInterface` in `withOptions()`. Stored the tracer provider and passed it correctly.
- The HttpClient `stream()` and response `getInfo()` methods did not match the current Symfony contracts. Updated their signatures.
- The response wrapper did not end spans when callers used `toArray()`. Added exception recording and span cleanup for that method.
- The Messenger middleware used nonexistent `Context::toArray()` and `Context::fromArray()` helpers. Replaced them with W3C trace context injection and extraction through `TraceContextPropagator`.
- The Doctrine DB spans hardcoded `db.system` to MySQL. Updated the driver wrapper to derive the database system from Doctrine connection parameters.

## Review Notes
The snippets are now aligned with current upstream interfaces, but they remain illustrative custom instrumentation. In a production Symfony application, using maintained OpenTelemetry PHP auto-instrumentation or a maintained Symfony integration should be considered first because those integrations handle edge cases such as semantic convention changes, lazy HTTP responses, transport-specific Messenger serialization, and sensitive attribute filtering.
