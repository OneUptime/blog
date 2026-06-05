# How to Set Up the FriendsOfOpenTelemetry Bundle for Symfony

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PHP, Symfony, Bundles, FriendsOfOpenTelemetry, Setup

Description: Complete guide to installing and configuring the FriendsOfOpenTelemetry bundle in Symfony applications for comprehensive observability with automatic instrumentation.

The FriendsOfOpenTelemetry bundle brings first-class OpenTelemetry support to Symfony applications through automatic instrumentation of core framework components. Rather than manually creating spans for every database query, HTTP request, or console command, this bundle handles the heavy lifting while giving you full control over configuration and customization.

## Why Use the FriendsOfOpenTelemetry Bundle

Symfony's architecture with its event system and service container makes it an ideal candidate for automatic instrumentation. The bundle taps into Symfony's lifecycle events to create spans automatically for:

- HTTP requests and responses through the kernel
- Database queries via Doctrine integration
- HTTP client requests
- Message queue operations with Symfony Messenger
- Console command execution
- Cache operations
- Template rendering with Twig

This automatic instrumentation captures context that would be tedious to add manually, like route names, response codes, and timing information.

## Installation and Initial Setup

Start by installing the bundle through Composer. The current beta releases require PHP 8.2 or higher and Symfony 7.4 components.

```bash
# Install the FriendsOfOpenTelemetry bundle

composer require friendsofopentelemetry/opentelemetry-bundle

# Install the OTLP exporter for sending data to collectors
composer require open-telemetry/exporter-otlp

# Install Symfony's PSR-18 HTTP client for HTTP telemetry transports
composer require symfony/http-client
```

The bundle is not yet available through Symfony Flex, so register it manually in `config/bundles.php`:

```php
// config/bundles.php

return [
    // Other bundles...
    FriendsOfOpenTelemetry\OpenTelemetryBundle\OpenTelemetryBundle::class => ['all' => true],
];
```

## Basic Bundle Configuration

Create a configuration file that defines how the bundle should instrument your application.

```yaml
# config/packages/open_telemetry.yaml

open_telemetry:
  # Service attributes that identify your application
  service:
    namespace: '%env(OTEL_SERVICE_NAMESPACE)%'
    name: '%env(OTEL_SERVICE_NAME)%'
    version: '%env(OTEL_SERVICE_VERSION)%'
    environment: '%kernel.environment%'

  # Uses Symfony's Psr18Client when symfony/http-client is installed
  transport_http_client: null

  # Trace configuration
  traces:
    tracers:
      main:
        provider: 'open_telemetry.traces.providers.default'

    providers:
      default:
        type: default
        sampler:
          type: 'trace_id_ratio'
          options:
            ratio: '%env(float:OTEL_TRACES_SAMPLER_RATIO)%'
        processors:
          - 'open_telemetry.traces.processors.simple'

    # Span processors
    processors:
      simple:
        type: simple
        exporter: 'open_telemetry.traces.exporters.otlp'

    # Exporter configuration
    exporters:
      otlp:
        dsn: '%env(OTEL_EXPORTER_OTLP_TRACES_DSN)%'
        options:
          format: protobuf
          compression: gzip
          headers:
            Authorization: '%env(OTEL_EXPORTER_OTLP_AUTH_HEADER)%'
          timeout: 10

  # Instrumentation configuration
  instrumentation:
    http_kernel:
      type: auto
      tracing:
        enabled: true

    doctrine:
      tracing:
        enabled: true

    http_client:
      tracing:
        enabled: true

    messenger:
      type: auto
      tracing:
        enabled: true

    console:
      type: auto
      tracing:
        enabled: true

    cache:
      tracing:
        enabled: true

    twig:
      tracing:
        enabled: true
```

## Environment Variables Configuration

Set up environment variables for different deployment environments.

```bash
# .env

# Service identification
OTEL_SERVICE_NAMESPACE=MyCompany
OTEL_SERVICE_NAME=symfony-app
OTEL_SERVICE_VERSION=1.0.0

# OTLP exporter configuration
OTEL_EXPORTER_OTLP_TRACES_DSN=http+otlp://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_AUTH_HEADER=

# Sampling ratio (1.0 = 100%, 0.1 = 10%)
OTEL_TRACES_SAMPLER_RATIO=1.0
```

For production environments, create a separate configuration:

```bash
# .env.production

OTEL_SERVICE_NAME=symfony-app
OTEL_SERVICE_VERSION=1.0.0
OTEL_SERVICE_NAMESPACE=MyCompany
OTEL_EXPORTER_OTLP_TRACES_DSN=https+otlp://otel-collector.prod.example.com:4318/v1/traces
OTEL_EXPORTER_OTLP_AUTH_HEADER=Bearer your-secret-token-here
OTEL_TRACES_SAMPLER_RATIO=0.1
```

## Verifying the Installation

Create a simple controller to test that spans are being created and exported correctly.

```php
// src/Controller/TelemetryTestController.php

namespace App\Controller;

use OpenTelemetry\API\Trace\TracerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class TelemetryTestController extends AbstractController
{
    public function __construct(
        private TracerInterface $tracer
    ) {}

    #[Route('/telemetry/test', name: 'telemetry_test')]
    public function test(): JsonResponse
    {
        // The HTTP request span is created automatically by the bundle
        // Let's create a custom span to verify manual instrumentation works too

        $span = $this->tracer->spanBuilder('custom-operation')
            ->setAttribute('test.attribute', 'test-value')
            ->startSpan();

        try {
            // Simulate some work
            usleep(50000); // 50ms

            $span->setAttribute('operation.success', true);

            return $this->json([
                'status' => 'success',
                'message' => 'Telemetry is working',
                'trace_id' => $span->getContext()->getTraceId(),
                'span_id' => $span->getContext()->getSpanId(),
            ]);

        } finally {
            $span->end();
        }
    }
}
```

Visit `/telemetry/test` in your browser and check your observability backend for the traces. You should see both the automatic HTTP kernel span and your custom span.

## Configuring Instrumentation Per Environment

You may want different instrumentation settings for development versus production.

```yaml
# config/packages/dev/open_telemetry.yaml

open_telemetry:
  traces:
    providers:
      default:
        sampler:
          type: 'always_on' # Capture all traces in development

  instrumentation:
    doctrine:
      tracing:
        enabled: true

    messenger:
      tracing:
        enabled: true
```

```yaml
# config/packages/prod/open_telemetry.yaml

open_telemetry:
  traces:
    providers:
      default:
        sampler:
          type: 'trace_id_ratio'
          options:
            ratio: 0.1 # Sample only 10% in production

  instrumentation:
    doctrine:
      tracing:
        enabled: false # Disable database spans if query details are sensitive

    messenger:
      tracing:
        enabled: true

    http_kernel:
      tracing:
        enabled: true
```

## Advanced Configuration with Custom Services

The bundle allows you to override default services for advanced customization.

```yaml
# config/services.yaml

services:
  # Custom span processor for additional processing
  app.telemetry.custom_processor:
    decorates: 'open_telemetry.traces.processors.simple'
    class: App\Telemetry\CustomSpanProcessor
    arguments:
      - '@app.telemetry.custom_processor.inner'
      - '@logger'
```

Create a custom span processor that enriches spans with application-specific context:

```php
// src/Telemetry/CustomSpanProcessor.php

namespace App\Telemetry;

use OpenTelemetry\SDK\Trace\SpanProcessorInterface;
use OpenTelemetry\SDK\Trace\ReadWriteSpanInterface;
use OpenTelemetry\SDK\Trace\ReadableSpanInterface;
use OpenTelemetry\Context\ContextInterface;
use Psr\Log\LoggerInterface;

class CustomSpanProcessor implements SpanProcessorInterface
{
    private SpanProcessorInterface $processor;
    private LoggerInterface $logger;

    public function __construct(
        SpanProcessorInterface $processor,
        LoggerInterface $logger
    ) {
        $this->processor = $processor;
        $this->logger = $logger;
    }

    public function onStart(ReadWriteSpanInterface $span, ContextInterface $parentContext): void
    {
        // Add custom attributes to all spans
        $span->setAttribute('app.region', $_ENV['APP_REGION'] ?? 'default');
        $span->setAttribute('app.tenant_id', $this->getCurrentTenantId());

        $this->processor->onStart($span, $parentContext);
    }

    public function onEnd(ReadableSpanInterface $span): void
    {
        // Log spans that exceed duration threshold
        $duration = $span->getEndEpochNanos() - $span->getStartEpochNanos();
        $durationMs = $duration / 1_000_000;

        if ($durationMs > 1000) {
            $this->logger->warning('Slow span detected', [
                'span_name' => $span->getName(),
                'duration_ms' => $durationMs,
                'trace_id' => $span->getContext()->getTraceId(),
            ]);
        }

        $this->processor->onEnd($span);
    }

    public function forceFlush(): bool
    {
        return $this->processor->forceFlush();
    }

    public function shutdown(): bool
    {
        return $this->processor->shutdown();
    }

    private function getCurrentTenantId(): ?string
    {
        // Implement your tenant identification logic
        return $_SERVER['HTTP_X_TENANT_ID'] ?? null;
    }
}
```

## Integrating with Symfony Security

Capture authentication information in your traces to correlate telemetry with user actions.

```php
// src/EventSubscriber/TelemetrySecuritySubscriber.php

namespace App\EventSubscriber;

use OpenTelemetry\API\Trace\TracerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;

class TelemetrySecuritySubscriber implements EventSubscriberInterface
{
    public function __construct(
        private TracerInterface $tracer
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
            LoginFailureEvent::class => 'onLoginFailure',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $span = $this->tracer->spanBuilder('authentication.success')
            ->setAttribute('user.email', $event->getUser()->getUserIdentifier())
            ->setAttribute('auth.method', $event->getAuthenticator()::class)
            ->startSpan();

        $span->end();
    }

    public function onLoginFailure(LoginFailureEvent $event): void
    {
        $span = $this->tracer->spanBuilder('authentication.failure')
            ->setAttribute('error', true)
            ->setAttribute('exception.message', $event->getException()->getMessage())
            ->startSpan();

        $span->end();
    }
}
```

## Filtering Sensitive Data

Protect sensitive information from being included in telemetry data.

```php
// src/Telemetry/SensitiveDataFilter.php

namespace App\Telemetry;

class SensitiveDataFilter
{
    private const SENSITIVE_PATTERNS = [
        'password',
        'token',
        'secret',
        'api_key',
        'credit_card',
        'ssn',
    ];

    public static function filterHeaders(array $headers): array
    {
        $filtered = [];

        foreach ($headers as $name => $value) {
            $lowerName = strtolower($name);

            if (self::isSensitive($lowerName)) {
                $filtered[$name] = '[REDACTED]';
            } else {
                $filtered[$name] = $value;
            }
        }

        return $filtered;
    }

    public static function filterQueryParameters(array $params): array
    {
        $filtered = [];

        foreach ($params as $key => $value) {
            if (self::isSensitive($key)) {
                $filtered[$key] = '[REDACTED]';
            } else {
                $filtered[$key] = $value;
            }
        }

        return $filtered;
    }

    private static function isSensitive(string $key): bool
    {
        $lowerKey = strtolower($key);

        foreach (self::SENSITIVE_PATTERNS as $pattern) {
            if (str_contains($lowerKey, $pattern)) {
                return true;
            }
        }

        return false;
    }
}
```

## Troubleshooting Common Issues

**Bundle not registering**: Manually register the bundle in `config/bundles.php`.

**No spans appearing**: Check that the exporter DSN is correct and accessible. Use the test controller to verify trace IDs are being generated.

**High memory usage**: Reduce the sampling ratio to reduce trace volume, or switch noisy instrumentation components off in production.

**Spans missing attributes**: Verify that the specific instrumentation component is enabled in the configuration and that you're using compatible versions of dependencies.

**Performance degradation**: Disable instrumentation components you do not need in production. Reduce the sampling ratio to reduce overhead.

## Visualizing Your Traces

Use your OpenTelemetry backend to inspect the exported trace ID, span hierarchy, and timing information for each request. In development, the test controller above also returns the trace ID and span ID so you can correlate a Symfony request with the exported trace.

The FriendsOfOpenTelemetry bundle transforms Symfony's built-in observability into production-grade distributed tracing. By leveraging Symfony's event system and service container, it provides comprehensive automatic instrumentation while maintaining the flexibility to customize behavior for your specific needs.
