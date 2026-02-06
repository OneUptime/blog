# How to Set Up the FriendsOfOpenTelemetry Bundle for Symfony

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PHP, Symfony, Bundle, FriendsOfOpenTelemetry, Setup

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

This automatic instrumentation captures context that would be tedious to add manually, like query parameters, response codes, and timing information.

## Installation and Initial Setup

Start by installing the bundle through Composer. The bundle requires PHP 8.1 or higher and Symfony 6.0 or later.

```bash
# Install the FriendsOfOpenTelemetry bundle
composer require friendsofopentelemetry/opentelemetry-bundle

# Install the OTLP exporter for sending data to collectors
composer require open-telemetry/exporter-otlp

# Install Guzzle for HTTP transport
composer require guzzlehttp/guzzle
```

If you're using Symfony Flex (recommended), the bundle registers itself automatically. For manual registration, add it to `config/bundles.php`:

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
# config/packages/opentelemetry.yaml

opentelemetry:
  # Resource attributes that identify your service
  resource:
    service.name: '%env(OTEL_SERVICE_NAME)%'
    service.version: '%env(OTEL_SERVICE_VERSION)%'
    deployment.environment: '%kernel.environment%'

  # Trace configuration
  traces:
    enabled: true

    # Sampling configuration
    sampler:
      type: 'traceidratio'
      options:
        ratio: '%env(float:OTEL_TRACES_SAMPLER_RATIO)%'

    # Span processors
    processors:
      batch:
        enabled: true
        max_queue_size: 2048
        schedule_delay: 5000
        export_batch_size: 512
        export_timeout: 30000

  # Exporter configuration
  exporters:
    otlp:
      enabled: true
      endpoint: '%env(OTEL_EXPORTER_OTLP_ENDPOINT)%'
      protocol: '%env(OTEL_EXPORTER_OTLP_PROTOCOL)%'
      headers:
        Authorization: '%env(OTEL_EXPORTER_OTLP_AUTH_HEADER)%'
      compression: 'gzip'
      timeout: 10

  # Instrumentation configuration
  instrumentation:
    http_kernel:
      enabled: true
      # Include request/response details in spans
      capture_headers: true
      # List of headers to capture (avoid sensitive data)
      allowed_headers: ['content-type', 'user-agent', 'accept']

    doctrine:
      enabled: true
      # Include query parameters in spans
      capture_query_parameters: true
      # Capture stack traces for slow queries
      slow_query_threshold: 1000 # milliseconds

    http_client:
      enabled: true
      # Capture request and response headers
      capture_headers: true

    messenger:
      enabled: true
      # Capture message payload (be careful with sensitive data)
      capture_payload: false

    console:
      enabled: true
      # Capture command arguments and options
      capture_arguments: true

    cache:
      enabled: true
      # Capture cache keys
      capture_keys: true

    twig:
      enabled: true
      # Capture template names and rendering time
      capture_template_name: true
```

## Environment Variables Configuration

Set up environment variables for different deployment environments.

```bash
# .env

# Service identification
OTEL_SERVICE_NAME=symfony-app
OTEL_SERVICE_VERSION=1.0.0

# OTLP exporter configuration
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_AUTH_HEADER=

# Sampling ratio (1.0 = 100%, 0.1 = 10%)
OTEL_TRACES_SAMPLER_RATIO=1.0
```

For production environments, create a separate configuration:

```bash
# .env.production

OTEL_SERVICE_NAME=symfony-app
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.prod.example.com:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_AUTH_HEADER=Bearer your-secret-token-here
OTEL_TRACES_SAMPLER_RATIO=0.1
```

## Verifying the Installation

Create a simple controller to test that spans are being created and exported correctly.

```php
// src/Controller/TelemetryTestController.php

namespace App\Controller;

use OpenTelemetry\API\Trace\TracerProviderInterface;
use OpenTelemetry\API\Trace\SpanKind;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class TelemetryTestController extends AbstractController
{
    public function __construct(
        private TracerProviderInterface $tracerProvider
    ) {}

    #[Route('/telemetry/test', name: 'telemetry_test')]
    public function test(): JsonResponse
    {
        // The HTTP request span is created automatically by the bundle
        // Let's create a custom span to verify manual instrumentation works too

        $tracer = $this->tracerProvider->getTracer('app.telemetry_test');

        $span = $tracer->spanBuilder('custom-operation')
            ->setSpanKind(SpanKind::KIND_INTERNAL)
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
# config/packages/dev/opentelemetry.yaml

opentelemetry:
  traces:
    sampler:
      type: 'always_on' # Capture all traces in development

  instrumentation:
    doctrine:
      capture_query_parameters: true # Verbose query info for debugging
      slow_query_threshold: 100 # Lower threshold in dev

    messenger:
      capture_payload: true # See full message content in dev
```

```yaml
# config/packages/prod/opentelemetry.yaml

opentelemetry:
  traces:
    sampler:
      type: 'traceidratio'
      options:
        ratio: 0.1 # Sample only 10% in production

  instrumentation:
    doctrine:
      capture_query_parameters: false # Don't capture potentially sensitive data

    messenger:
      capture_payload: false # Protect sensitive message content

    http_kernel:
      capture_headers: false # Reduce overhead and protect privacy
```

## Advanced Configuration with Custom Services

The bundle allows you to override default services for advanced customization.

```yaml
# config/services.yaml

services:
  # Custom span processor for additional processing
  app.telemetry.custom_processor:
    class: App\Telemetry\CustomSpanProcessor
    arguments:
      - '@opentelemetry.trace.exporter'
      - '@logger'

  # Decorate the default tracer provider
  app.telemetry.tracer_provider:
    decorates: 'opentelemetry.trace.tracer_provider'
    class: App\Telemetry\CustomTracerProvider
    arguments:
      - '@.inner'
      - '@app.telemetry.custom_processor'
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

use OpenTelemetry\API\Trace\TracerProviderInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;

class TelemetrySecuritySubscriber implements EventSubscriberInterface
{
    public function __construct(
        private TracerProviderInterface $tracerProvider
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
        $tracer = $this->tracerProvider->getTracer('app.security');

        $span = $tracer->spanBuilder('authentication.success')
            ->setAttribute('user.email', $event->getUser()->getUserIdentifier())
            ->setAttribute('auth.method', $event->getAuthenticator()::class)
            ->startSpan();

        $span->end();
    }

    public function onLoginFailure(LoginFailureEvent $event): void
    {
        $tracer = $this->tracerProvider->getTracer('app.security');

        $span = $tracer->spanBuilder('authentication.failure')
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

**Bundle not registering**: Ensure Symfony Flex is installed or manually register the bundle in `config/bundles.php`.

**No spans appearing**: Check that the exporter endpoint is correct and accessible. Use the test controller to verify trace IDs are being generated.

**High memory usage**: Reduce the `max_queue_size` in the batch processor configuration. Also consider increasing the sampling ratio to reduce trace volume.

**Spans missing attributes**: Verify that the specific instrumentation component is enabled in the configuration and that you're using compatible versions of dependencies.

**Performance degradation**: Disable verbose options like `capture_query_parameters` and `capture_headers` in production. Increase the sampling ratio to reduce overhead.

## Visualizing Your Traces

The bundle integrates seamlessly with the Symfony profiler in development mode, adding a new panel that displays OpenTelemetry information.

```yaml
# config/packages/dev/opentelemetry.yaml

opentelemetry:
  profiler:
    enabled: true
    # Show trace information in the Symfony debug toolbar
    toolbar: true
```

This adds a dedicated panel to the Symfony profiler showing the trace ID, span hierarchy, and timing information for the current request.

The FriendsOfOpenTelemetry bundle transforms Symfony's built-in observability into production-grade distributed tracing. By leveraging Symfony's event system and service container, it provides comprehensive automatic instrumentation while maintaining the flexibility to customize behavior for your specific needs.
