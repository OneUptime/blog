# How to Trace PHP-FPM Processes with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PHP, PHP-FPM, Process Monitoring, Tracing

Description: Learn how to instrument PHP-FPM processes with OpenTelemetry to monitor worker pool performance, trace request lifecycle, and identify process bottlenecks.

PHP-FPM (FastCGI Process Manager) is the de facto standard for running PHP applications in production. Understanding how requests flow through the FPM process pool and identifying performance bottlenecks at the process level is critical for maintaining healthy applications. OpenTelemetry provides the visibility needed to track worker utilization, queue times, and request lifecycles across your entire PHP-FPM infrastructure.

## Understanding PHP-FPM Architecture

PHP-FPM uses a master process that manages a pool of worker processes. Each worker handles one request at a time. When all workers are busy, new requests queue until a worker becomes available. This architecture means performance problems often manifest as worker starvation or slow request processing.

```mermaid
graph TB
    A[NGINX/Apache] --> B[PHP-FPM Master Process]
    B --> C[Worker Process 1]
    B --> D[Worker Process 2]
    B --> E[Worker Process 3]
    B --> F[Worker Process N]
    C --> G[OpenTelemetry SDK]
    D --> G
    E --> G
    F --> G
    G --> H[OTLP Exporter]
    H --> I[Collector]
    I --> J[Backend]
```

## Instrumenting at the Process Level

To trace PHP-FPM effectively, you need to capture data at multiple levels: process startup, request handling, and resource utilization. This requires hooking into both the FPM lifecycle and individual request execution.

Create a file called `otel-fpm-bootstrap.php` that will be loaded before every request:

```php
<?php
/**
 * OpenTelemetry PHP-FPM Bootstrap
 * This file should be loaded via php-fpm.conf auto_prepend_file directive
 */

require_once '/path/to/vendor/autoload.php';

use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Trace\TracerProvider;
use OpenTelemetry\SDK\Trace\Sampler\ParentBased;
use OpenTelemetry\SDK\Trace\Sampler\TraceIdRatioBasedSampler;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessorBuilder;
use OpenTelemetry\Contrib\Otlp\SpanExporter;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Common\Attribute\Attributes;

class PHPFPMTracer {
    private static $instance = null;
    private $tracer;
    private $tracerProvider;
    private $requestSpan;
    private $requestScope;
    private $processId;
    private $startTime;

    private function __construct() {
        $this->processId = getmypid();
        $this->startTime = microtime(true);
        $this->initializeTracer();
        $this->startRequestTrace();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function initializeTracer() {
        // Gather PHP-FPM specific resource attributes
        $poolName = getenv('PHP_FPM_POOL') ?: 'default';
        $hostname = gethostname();

        $resource = ResourceInfoFactory::defaultResource()->merge(
            ResourceInfo::create(Attributes::create([
                'service.name' => 'php-fpm',
                'service.version' => PHP_VERSION,
                'process.pid' => $this->processId,
                'host.name' => $hostname,
                'php.fpm.pool' => $poolName,
                'php.sapi' => php_sapi_name(),
            ]))
        );

        $exporter = new SpanExporter(
            (new OtlpHttpTransportFactory())->create(
                getenv('OTEL_EXPORTER_OTLP_ENDPOINT') ?: 'http://localhost:4318/v1/traces',
                'application/json'
            )
        );

        $samplingRatio = (float) (getenv('OTEL_TRACES_SAMPLER_ARG') ?: 1.0);

        // Use batch processor for better performance in high-throughput scenarios
        $this->tracerProvider = TracerProvider::builder()
            ->addSpanProcessor((new BatchSpanProcessorBuilder($exporter))->build())
            ->setSampler(new ParentBased(new TraceIdRatioBasedSampler($samplingRatio)))
            ->setResource($resource)
            ->build();

        $this->tracer = $this->tracerProvider->getTracer('php-fpm-instrumentation');
    }

    private function startRequestTrace() {
        $requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'CLI';
        $requestUri = $_SERVER['REQUEST_URI'] ?? 'unknown';
        $scheme = $_SERVER['REQUEST_SCHEME'] ?? 'http';
        $serverAddress = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'), PHP_URL_HOST) ?: 'unknown';
        $serverPort = (int) ($_SERVER['SERVER_PORT'] ?? ($scheme === 'https' ? 443 : 80));

        $this->requestSpan = $this->tracer
            ->spanBuilder("$requestMethod $requestUri")
            ->setSpanKind(SpanKind::KIND_SERVER)
            ->setAttribute('http.request.method', $requestMethod)
            ->setAttribute('url.full', $this->buildFullUrl($requestUri))
            ->setAttribute('url.path', parse_url($requestUri, PHP_URL_PATH) ?: '/')
            ->setAttribute('url.scheme', $scheme)
            ->setAttribute('server.address', $serverAddress)
            ->setAttribute('server.port', $serverPort)
            ->setAttribute('client.address', $_SERVER['REMOTE_ADDR'] ?? 'unknown')
            ->setAttribute('php.fpm.process.id', $this->processId)
            ->setAttribute('php.fpm.process.start_time', $this->startTime)
            ->startSpan();

        $this->requestScope = $this->requestSpan->activate();

        // Register shutdown function to end the span
        register_shutdown_function([$this, 'endRequestTrace']);
    }

    public function endRequestTrace() {
        if ($this->requestSpan) {
            $endTime = microtime(true);
            $duration = $endTime - $this->startTime;
            $statusCode = http_response_code();
            $opcacheStatus = function_exists('opcache_get_status') ? opcache_get_status(false) : false;

            // Capture final request metrics
            $this->requestSpan
                ->setAttribute('http.response.status_code', $statusCode)
                ->setAttribute('php.memory.peak', memory_get_peak_usage(true))
                ->setAttribute('php.memory.current', memory_get_usage(true))
                ->setAttribute('php.duration', $duration)
                ->setAttribute('php.opcache.enabled', is_array($opcacheStatus) && ($opcacheStatus['opcache_enabled'] ?? false));

            if ($statusCode >= 500) {
                $this->requestSpan->setStatus(StatusCode::STATUS_ERROR);
            } else {
                $this->requestSpan->setStatus(StatusCode::STATUS_OK);
            }

            $this->requestSpan
                ->end();

            if ($this->requestScope) {
                $this->requestScope->detach();
            }

            $this->tracerProvider->shutdown();
        }
    }

    private function buildFullUrl(string $requestUri): string {
        $scheme = $_SERVER['REQUEST_SCHEME'] ?? 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return "$scheme://$host$requestUri";
    }

    public function traceFunction(string $functionName, callable $function, array $attributes = []) {
        $span = $this->tracer
            ->spanBuilder($functionName)
            ->setSpanKind(SpanKind::KIND_INTERNAL);

        foreach ($attributes as $key => $value) {
            $span->setAttribute($key, $value);
        }

        $span = $span->startSpan();
        $scope = $span->activate();

        try {
            $result = $function();
            $span->setStatus(StatusCode::STATUS_OK);
            return $result;
        } catch (\Throwable $e) {
            $span
                ->recordException($e)
                ->setStatus(StatusCode::STATUS_ERROR, $e->getMessage());
            throw $e;
        } finally {
            $span->end();
            $scope->detach();
        }
    }
}

// Initialize the tracer for this request
PHPFPMTracer::getInstance();
```

## Configuring PHP-FPM to Load the Bootstrap File

Modify your PHP-FPM pool configuration (typically in `/etc/php/8.x/fpm/pool.d/www.conf`):

```ini
[www]
; Existing configuration...

; Auto-prepend the OpenTelemetry bootstrap file to every request
php_admin_value[auto_prepend_file] = /var/www/otel-fpm-bootstrap.php

; Set environment variables for OpenTelemetry
env[OTEL_EXPORTER_OTLP_ENDPOINT] = http://localhost:4318/v1/traces
env[PHP_FPM_POOL] = www
env[OTEL_SERVICE_NAME] = php-fpm-www

; Increase process priority for monitoring (optional)
process.priority = -10
```

Restart PHP-FPM to apply changes:

```bash
sudo systemctl restart php8.2-fpm
```

## Monitoring Worker Pool Utilization

To understand worker pool health, collect metrics about process state. Create a monitoring script that runs periodically:

```php
<?php
/**
 * PHP-FPM Process Pool Monitor
 * Run this via cron every minute to export worker pool metrics
 */

require_once '/path/to/vendor/autoload.php';

use OpenTelemetry\API\Metrics\ObserverInterface;
use OpenTelemetry\Contrib\Otlp\MetricExporter;
use OpenTelemetry\Contrib\Otlp\OtlpHttpTransportFactory;
use OpenTelemetry\SDK\Metrics\MeterProvider;
use OpenTelemetry\SDK\Metrics\MetricReader\ExportingReader;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;

class FPMPoolMonitor {
    private $meter;
    private $reader;
    private $meterProvider;

    public function __construct() {
        $resource = ResourceInfoFactory::defaultResource();
        $exporter = new MetricExporter(
            (new OtlpHttpTransportFactory())->create(
                getenv('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') ?: 'http://localhost:4318/v1/metrics',
                'application/json'
            )
        );
        $this->reader = new ExportingReader($exporter);
        $this->meterProvider = MeterProvider::builder()
            ->setResource($resource)
            ->addReader($this->reader)
            ->build();
        $this->meter = $this->meterProvider->getMeter('php-fpm-pool-monitor');
    }

    public function collectMetrics() {
        $poolStatus = $this->getFPMStatus();

        if (!$poolStatus) {
            return;
        }

        // Create observable gauges for pool metrics
        $activeProcesses = $this->meter->createObservableGauge(
            'php.fpm.processes.active',
            'processes',
            'Number of active PHP-FPM processes'
        );

        $idleProcesses = $this->meter->createObservableGauge(
            'php.fpm.processes.idle',
            'processes',
            'Number of idle PHP-FPM processes'
        );

        $queuedRequests = $this->meter->createObservableGauge(
            'php.fpm.requests.queued',
            'requests',
            'Number of queued requests'
        );

        $maxActiveProcesses = $this->meter->createObservableGauge(
            'php.fpm.processes.max_active',
            'processes',
            'Maximum active processes reached'
        );

        // Register callbacks to provide metric values
        $activeProcesses->observe(function(ObserverInterface $observer) use ($poolStatus): void {
            $observer->observe($poolStatus['active processes']);
        });

        $idleProcesses->observe(function(ObserverInterface $observer) use ($poolStatus): void {
            $observer->observe($poolStatus['idle processes']);
        });

        $queuedRequests->observe(function(ObserverInterface $observer) use ($poolStatus): void {
            $observer->observe($poolStatus['listen queue']);
        });

        $maxActiveProcesses->observe(function(ObserverInterface $observer) use ($poolStatus): void {
            $observer->observe($poolStatus['max active processes']);
        });

        $this->reader->collect();
        $this->meterProvider->shutdown();
    }

    private function getFPMStatus() {
        // Parse PHP-FPM status page (requires pm.status_path configured)
        $statusUrl = 'http://localhost/fpm-status?json';

        $ch = curl_init($statusUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            error_log("Failed to fetch PHP-FPM status: HTTP $httpCode");
            return null;
        }

        return json_decode($response, true);
    }
}

$monitor = new FPMPoolMonitor();
$monitor->collectMetrics();
```

Enable the PHP-FPM status page by adding to your pool configuration:

```ini
pm.status_path = /fpm-status
```

And configure NGINX to expose it:

```nginx
location /fpm-status {
    access_log off;
    allow 127.0.0.1;
    deny all;
    include fastcgi_params;
    fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

## Tracing Slow Requests

Identify slow requests by adding custom instrumentation for critical sections:

```php
<?php
// In your application code
$tracer = PHPFPMTracer::getInstance();

// Trace database operations
$tracer->traceFunction('database.query', function() use ($pdo, $sql) {
    return $pdo->query($sql);
}, [
    'db.system' => 'mysql',
    'db.query.text' => $sql,
]);

// Trace external API calls
$tracer->traceFunction('external.api.call', function() use ($url) {
    return file_get_contents($url);
}, [
    'url.full' => $url,
    'http.request.method' => 'GET',
]);

// Trace cache operations
$tracer->traceFunction('cache.get', function() use ($redis, $key) {
    return $redis->get($key);
}, [
    'cache.system' => 'redis',
    'cache.key' => $key,
]);
```

## Analyzing Process Lifecycle

Track how long individual PHP-FPM processes have been running and how many requests they've handled. This helps identify memory leaks or process degradation:

```php
<?php
// Add to otel-fpm-bootstrap.php

// Track requests handled by this process
$processStateFile = sys_get_temp_dir() . '/php-fpm-' . getmypid() . '.json';
$processState = is_file($processStateFile)
    ? json_decode(file_get_contents($processStateFile), true)
    : null;

if (!is_array($processState)) {
    $processState = [
        'started_at' => time(),
        'request_count' => 0,
    ];
}

$processState['request_count']++;
file_put_contents($processStateFile, json_encode($processState), LOCK_EX);

// Calculate process uptime
$processUptime = time() - $processState['started_at'];

// Add to request span
$this->requestSpan
    ->setAttribute('php.fpm.process.uptime', $processUptime)
    ->setAttribute('php.fpm.process.request_count', $processState['request_count']);
```

## Performance Considerations

PHP-FPM instrumentation adds overhead to every request. Minimize impact by:

1. Using batch span processors instead of simple processors
2. Sampling traces rather than capturing every request
3. Avoiding synchronous exports in the request path
4. Pre-loading instrumentation code in PHP-FPM workers

Configure sampling in your PHP-FPM pool:

```ini
env[OTEL_TRACES_SAMPLER] = parentbased_traceidratio
env[OTEL_TRACES_SAMPLER_ARG] = 0.05
```

## Conclusion

Tracing PHP-FPM processes with OpenTelemetry provides unprecedented visibility into your application's request handling. You can identify worker pool saturation, track individual process health, and pinpoint performance bottlenecks at the process level. This detailed instrumentation enables proactive scaling decisions and rapid troubleshooting when issues arise in production environments.
