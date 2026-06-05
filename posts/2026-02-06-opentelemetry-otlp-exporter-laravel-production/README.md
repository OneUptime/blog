# How to Configure OpenTelemetry OTLP Exporter in Laravel for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PHP, Laravel, OTLP, Exporter, Production

Description: Learn how to configure and optimize the OpenTelemetry OTLP exporter in Laravel for production environments with proper batching, error handling, and performance tuning.

Moving your Laravel application to production with OpenTelemetry requires careful configuration of the OTLP (OpenTelemetry Protocol) exporter. Unlike development environments where you can tolerate higher overhead and simpler setups, production demands efficient batching, proper error handling, and resource management.

## Understanding OTLP Export Strategies

The OTLP exporter supports gRPC and HTTP transports. HTTP is commonly used with the protobuf encoding. Each has different characteristics that affect your production deployment.

gRPC offers better performance through HTTP/2 multiplexing and built-in compression, making it ideal for high-throughput applications. HTTP with protobuf provides broader compatibility and easier debugging, which can be valuable when troubleshooting production issues.

## Installing Production Dependencies

First, ensure you have the required packages with appropriate version constraints for stability.

```bash
# Install the core OpenTelemetry SDK and OTLP exporter

composer require open-telemetry/sdk:^1.0
composer require open-telemetry/exporter-otlp:^1.0

# For gRPC transport, install the gRPC extension and transport library
pecl install grpc
composer require open-telemetry/transport-grpc:^1.0

# For HTTP transport (more common in production)
composer require php-http/guzzle7-adapter:^1.0
```

The version constraints use `^1.0` to ensure you get stable releases with backward compatibility guarantees.

## Creating a Production Exporter Configuration

Create a dedicated configuration file for your OpenTelemetry setup that respects Laravel's environment-based configuration pattern.

```php
// config/opentelemetry.php

return [
    'service_name' => env('OTEL_SERVICE_NAME', config('app.name')),
    'service_version' => env('OTEL_SERVICE_VERSION', '1.0.0'),
    'environment' => env('APP_ENV', 'production'),

    'otlp' => [
        // OTLP endpoint for traces
        'traces_endpoint' => env('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', 'http://localhost:4318/v1/traces'),

        // OTLP endpoint for metrics
        'metrics_endpoint' => env('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT', 'http://localhost:4318/v1/metrics'),

        // Transport protocol: grpc, http/protobuf, or http/json
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),

        // Request timeout in seconds
        'timeout' => env('OTEL_EXPORTER_OTLP_TIMEOUT', 10),

        // Authentication headers
        'headers' => [
            'Authorization' => env('OTEL_EXPORTER_OTLP_HEADERS_AUTHORIZATION', ''),
            'X-API-Key' => env('OTEL_EXPORTER_OTLP_API_KEY', ''),
        ],

        // Compression: none or gzip
        'compression' => env('OTEL_EXPORTER_OTLP_COMPRESSION', 'gzip'),
    ],

    'batch_processor' => [
        // Maximum batch size before forcing an export
        'max_queue_size' => env('OTEL_BSP_MAX_QUEUE_SIZE', 2048),

        // Maximum delay between exports in milliseconds
        'schedule_delay' => env('OTEL_BSP_SCHEDULE_DELAY', 5000),

        // Maximum batch size per export
        'export_batch_size' => env('OTEL_BSP_EXPORT_BATCH_SIZE', 512),

        // Export timeout in milliseconds
        'export_timeout' => env('OTEL_BSP_EXPORT_TIMEOUT', 30000),
    ],

    'sampling' => [
        // Sampling strategy: always_on, always_off, traceidratio, parentbased
        'strategy' => env('OTEL_TRACES_SAMPLER', 'parentbased_traceidratio'),

        // Sampling ratio (0.0 to 1.0) for traceidratio sampler
        'ratio' => env('OTEL_TRACES_SAMPLER_ARG', 1.0),
    ],
];
```

This configuration separates concerns and allows easy tuning through environment variables without code changes.

## Building a Production-Ready Service Provider

Create a service provider that initializes OpenTelemetry with production-optimized settings.

```php
// app/Providers/OpenTelemetryServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\API\Trace\TracerProviderInterface as ApiTracerProviderInterface;
use OpenTelemetry\API\Common\Time\Clock;
use OpenTelemetry\Context\ScopeInterface;
use OpenTelemetry\SDK\Sdk;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\TracerProviderInterface;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessor;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOffSampler;
use OpenTelemetry\SDK\Trace\Sampler\AlwaysOnSampler;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\Sampler\TraceIdRatioBasedSampler;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Common\Export\TransportInterface;

class OpenTelemetryServiceProvider extends ServiceProvider
{
    private ?ScopeInterface $otelScope = null;

    public function register(): void
    {
        $this->app->singleton(TracerProviderInterface::class, function ($app) {
            return $this->createTracerProvider($app);
        });

        $this->app->alias(TracerProviderInterface::class, ApiTracerProviderInterface::class);

        $this->app->singleton(TracerInterface::class, function ($app) {
            return $app->make(TracerProviderInterface::class)
                ->getTracer(
                    config('opentelemetry.service_name'),
                    config('opentelemetry.service_version')
                );
        });
    }

    public function boot(): void
    {
        // Set the global tracer provider for auto-instrumentation
        $this->otelScope = Sdk::builder()
            ->setTracerProvider($this->app->make(TracerProviderInterface::class))
            ->setAutoShutdown(true)
            ->buildAndRegisterGlobal();
    }

    private function createTracerProvider($app): TracerProviderInterface
    {
        // Create resource information that identifies your service
        $resource = ResourceInfoFactory::defaultResource()
            ->merge(ResourceInfo::create(Attributes::create([
                'service.name' => config('opentelemetry.service_name'),
                'service.version' => config('opentelemetry.service_version'),
                'deployment.environment' => config('opentelemetry.environment'),
                'host.name' => gethostname(),
            ])));

        // Create the OTLP exporter with production settings
        $transport = $this->createTransport();
        $exporter = new SpanExporter($transport);

        // Configure batch processor for efficient export
        $batchProcessor = new BatchSpanProcessor(
            $exporter,
            Clock::getDefault(),
            config('opentelemetry.batch_processor.max_queue_size'),
            config('opentelemetry.batch_processor.schedule_delay'),
            config('opentelemetry.batch_processor.export_timeout'),
            config('opentelemetry.batch_processor.export_batch_size')
        );

        // Build the tracer provider with sampler
        $sampler = $this->createSampler();

        return TracerProvider::builder()
            ->setResource($resource)
            ->addSpanProcessor($batchProcessor)
            ->setSampler($sampler)
            ->build();
    }

    private function createTransport(): TransportInterface
    {
        $endpoint = config('opentelemetry.otlp.traces_endpoint');
        $headers = array_filter(config('opentelemetry.otlp.headers'));
        $compression = config('opentelemetry.otlp.compression');
        $timeout = config('opentelemetry.otlp.timeout');

        // Create HTTP/protobuf transport with a PSR-18 client
        $factory = new OtlpHttpTransportFactory();

        return $factory->create(
            $endpoint,
            'application/x-protobuf',
            $headers,
            $compression,
            $timeout
        );
    }

    private function createSampler()
    {
        $strategy = config('opentelemetry.sampling.strategy');
        $ratio = (float) config('opentelemetry.sampling.ratio');

        return match($strategy) {
            'always_on' => new AlwaysOnSampler(),
            'always_off' => new AlwaysOffSampler(),
            'traceidratio' => new TraceIdRatioBasedSampler($ratio),
            'parentbased_traceidratio' => new ParentBased(
                new TraceIdRatioBasedSampler($ratio)
            ),
            default => new ParentBased(new AlwaysOnSampler()),
        };
    }
}
```

Register this provider in `bootstrap/providers.php` for current Laravel applications:

```php
return [
    App\Providers\AppServiceProvider::class,
    App\Providers\OpenTelemetryServiceProvider::class,
];
```

In older Laravel applications that still use the `config/app.php` providers array, add the provider there instead.

## Environment Configuration for Production

Set up your production environment variables with appropriate values for your observability backend.

```bash
# .env.production

# Service identification
OTEL_SERVICE_NAME=laravel-api-production
OTEL_SERVICE_VERSION=2.4.1
APP_ENV=production

# OTLP endpoints (adjust for your backend)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel-collector.example.com:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otel-collector.example.com:4318/v1/metrics

# Protocol and compression
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_COMPRESSION=gzip

# Authentication (use your actual API key)
OTEL_EXPORTER_OTLP_API_KEY=your-secret-api-key-here

# Timeouts (in seconds)
OTEL_EXPORTER_OTLP_TIMEOUT=10

# Batch processor tuning for high-traffic production
OTEL_BSP_MAX_QUEUE_SIZE=4096
OTEL_BSP_SCHEDULE_DELAY=5000
OTEL_BSP_EXPORT_BATCH_SIZE=512
OTEL_BSP_EXPORT_TIMEOUT=30000

# Sampling configuration (1.0 = 100%, 0.1 = 10%)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

The sampling ratio of 0.1 means you'll capture 10% of traces, which reduces overhead while maintaining observability for high-traffic applications.

## Handling Export Failures Gracefully

Production systems must handle export failures without impacting application performance or reliability.

```php
// app/Services/Telemetry/ResilientExporter.php

namespace App\Services\Telemetry;

use OpenTelemetry\SDK\Trace\SpanExporterInterface;
use OpenTelemetry\SDK\Common\Future\CancellationInterface;
use OpenTelemetry\SDK\Common\Future\CompletedFuture;
use OpenTelemetry\SDK\Common\Future\FutureInterface;
use Psr\Log\LoggerInterface;
use Throwable;

class ResilientExporter implements SpanExporterInterface
{
    private SpanExporterInterface $exporter;
    private LoggerInterface $logger;
    private int $maxRetries;
    private int $retryDelay;

    public function __construct(
        SpanExporterInterface $exporter,
        LoggerInterface $logger,
        int $maxRetries = 3,
        int $retryDelay = 1000
    ) {
        $this->exporter = $exporter;
        $this->logger = $logger;
        $this->maxRetries = $maxRetries;
        $this->retryDelay = $retryDelay;
    }

    public function export(iterable $batch, ?CancellationInterface $cancellation = null): FutureInterface
    {
        $attempt = 0;

        while ($attempt < $this->maxRetries) {
            try {
                $result = $this->exporter->export($batch, $cancellation)->await();

                if ($attempt > 0) {
                    $this->logger->info('OTLP export succeeded after retry', [
                        'attempts' => $attempt + 1,
                    ]);
                }

                return new CompletedFuture($result);

            } catch (Throwable $e) {
                $attempt++;

                $this->logger->warning('OTLP export failed', [
                    'attempt' => $attempt,
                    'max_retries' => $this->maxRetries,
                    'error' => $e->getMessage(),
                ]);

                if ($attempt >= $this->maxRetries) {
                    $this->logger->error('OTLP export failed after all retries', [
                        'attempts' => $attempt,
                        'error' => $e->getMessage(),
                    ]);

                    // Return failure but don't throw to prevent application impact
                    return new CompletedFuture(false);
                }

                // Exponential backoff with jitter
                $delay = $this->retryDelay * pow(2, $attempt - 1);
                $jitter = rand(0, (int) ($delay / 2));
                usleep(($delay + $jitter) * 1000);
            }
        }

        return new CompletedFuture(false);
    }

    public function shutdown(?CancellationInterface $cancellation = null): bool
    {
        return $this->exporter->shutdown($cancellation);
    }

    public function forceFlush(?CancellationInterface $cancellation = null): bool
    {
        return $this->exporter->forceFlush($cancellation);
    }
}
```

Wrap your exporter with this resilient implementation in the service provider to add retry logic.

## Monitoring Export Health

Create a health check endpoint that verifies your OTLP exporter is functioning correctly.

```php
// app/Http/Controllers/HealthController.php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\SDK\Trace\TracerProviderInterface;

class HealthController extends Controller
{
    public function telemetry(
        TracerInterface $tracer,
        TracerProviderInterface $provider
    ): JsonResponse {
        try {
            // Create a test span
            $span = $tracer->spanBuilder('health-check')
                ->setAttribute('test', true)
                ->startSpan();

            $span->end();

            // Force flush to ensure export attempt
            $provider->forceFlush();

            return response()->json([
                'status' => 'healthy',
                'telemetry' => 'operational',
                'exporter' => 'connected',
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'degraded',
                'telemetry' => 'failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
```

Add this route to verify your configuration after deployment:

```php
// routes/web.php
Route::get('/health/telemetry', [HealthController::class, 'telemetry']);
```

## Performance Optimization Tips

For production environments, consider these performance optimizations:

**Batch Size Tuning**: Increase `export_batch_size` for high-throughput applications to reduce export frequency. Monitor memory usage to find the right balance.

**Schedule Delay**: Longer delays (5-10 seconds) reduce network overhead but increase memory usage. Shorter delays provide near-real-time visibility but increase CPU usage.

**Sampling Strategy**: Use `parentbased_traceidratio` to maintain trace continuity while reducing volume. Start with 10% sampling and adjust based on your needs.

**Transport Selection**: Use gRPC in environments where it's supported for better throughput. HTTP/protobuf is more universally compatible but slightly less efficient.

**Compression**: Always enable gzip compression in production to reduce bandwidth usage, especially if your collector is remote.

## Graceful Shutdown

Ensure spans are flushed during application shutdown to avoid losing telemetry data.

```php
// app/Console/Kernel.php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use OpenTelemetry\SDK\Trace\TracerProviderInterface;

class Kernel extends ConsoleKernel
{
    public function terminate($input, $status): void
    {
        // Flush pending spans before shutdown
        if ($this->app->bound(TracerProviderInterface::class)) {
            $provider = $this->app->make(TracerProviderInterface::class);
            $provider->shutdown();
        }

        parent::terminate($input, $status);
    }
}
```

With this production-ready configuration, your Laravel application will reliably export telemetry data to your OTLP-compatible backend while maintaining optimal performance and handling failures gracefully. The batching, retry logic, and proper resource management ensure your observability infrastructure scales with your application.
