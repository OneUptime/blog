# How to Configure Istio for PHP Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PHP, Kubernetes, Laravel, Service Mesh

Description: How to configure Istio for PHP applications running with PHP-FPM and Nginx, covering health checks, trace headers, and common deployment patterns.

---

PHP applications have a unique deployment model compared to other languages. They typically run behind a web server like Nginx that communicates with PHP-FPM over FastCGI. This two-process architecture adds a layer of complexity when integrating with Istio, but it is manageable once you understand the setup.

## Typical PHP Deployment Architecture

In Kubernetes, PHP apps usually run as a pod with two containers (or a single container with both Nginx and PHP-FPM):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop-api
      version: v1
  template:
    metadata:
      labels:
        app: shop-api
        version: v1
    spec:
      containers:
      - name: nginx
        image: myregistry/shop-api-nginx:1.0.0
        ports:
        - name: http-web
          containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
        volumeMounts:
        - name: shared-files
          mountPath: /var/www/html
      - name: php-fpm
        image: myregistry/shop-api:1.0.0
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 512Mi
        volumeMounts:
        - name: shared-files
          mountPath: /var/www/html
        env:
        - name: APP_ENV
          value: "production"
      volumes:
      - name: shared-files
        emptyDir: {}
```

With Istio, this pod gets a third container - the istio-proxy sidecar. Traffic flows like this: Client -> Envoy Sidecar -> Nginx -> PHP-FPM.

### Single Container Alternative

For simpler setups, use a single container image with both Nginx and PHP-FPM:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
spec:
  template:
    metadata:
      labels:
        app: shop-api
        version: v1
    spec:
      containers:
      - name: shop-api
        image: myregistry/shop-api:1.0.0
        ports:
        - name: http-web
          containerPort: 80
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 512Mi
```

This is simpler for Istio because there are fewer containers to manage.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: shop-api
  namespace: production
spec:
  selector:
    app: shop-api
  ports:
  - name: http-web
    port: 80
    targetPort: http-web
```

## Nginx Configuration for Istio

Configure Nginx to work well with the Envoy sidecar:

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html/public;
    index index.php;

    # Health check endpoint served directly by Nginx
    location /healthz {
        access_log off;
        return 200 '{"status":"alive"}';
        add_header Content-Type application/json;
    }

    # PHP health check
    location /ready {
        try_files $uri /index.php?$query_string;
    }

    location / {
        try_files $uri /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;

        # Timeouts aligned with Istio
        fastcgi_connect_timeout 5s;
        fastcgi_send_timeout 60s;
        fastcgi_read_timeout 60s;

        # Pass trace headers to PHP
        fastcgi_param HTTP_X_REQUEST_ID $http_x_request_id;
        fastcgi_param HTTP_X_B3_TRACEID $http_x_b3_traceid;
        fastcgi_param HTTP_X_B3_SPANID $http_x_b3_spanid;
        fastcgi_param HTTP_X_B3_PARENTSPANID $http_x_b3_parentspanid;
        fastcgi_param HTTP_X_B3_SAMPLED $http_x_b3_sampled;
        fastcgi_param HTTP_TRACEPARENT $http_traceparent;
        fastcgi_param HTTP_TRACESTATE $http_tracestate;
    }

    # Keep alive settings
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

## Health Checks

For the Nginx-served liveness check and a PHP-based readiness check:

```php
<?php
// routes/api.php (Laravel example)

Route::get('/ready', function () {
    try {
        DB::connection()->getPdo();
        Cache::store('redis')->get('health_check');

        return response()->json(['status' => 'ready'], 200);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'not ready',
            'error' => $e->getMessage()
        ], 503);
    }
});
```

For non-Laravel PHP:

```php
<?php
// public/ready.php

header('Content-Type: application/json');

try {
    $pdo = new PDO(
        "mysql:host=" . getenv('DB_HOST') . ";dbname=" . getenv('DB_NAME'),
        getenv('DB_USER'),
        getenv('DB_PASS'),
        [PDO::ATTR_TIMEOUT => 5]
    );
    $pdo->query('SELECT 1');

    http_response_code(200);
    echo json_encode(['status' => 'ready']);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode(['status' => 'not ready']);
}
```

Configure the probes:

```yaml
containers:
- name: nginx
  livenessProbe:
    httpGet:
      path: /healthz
      port: 80
    initialDelaySeconds: 5
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /ready
      port: 80
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 80
    periodSeconds: 3
    failureThreshold: 20
```

## Trace Header Propagation in PHP

### Laravel Middleware

```php
<?php
// app/Http/Middleware/TraceHeaders.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class TraceHeaders
{
    private const TRACE_HEADERS = [
        'x-request-id',
        'x-b3-traceid',
        'x-b3-spanid',
        'x-b3-parentspanid',
        'x-b3-sampled',
        'x-b3-flags',
        'b3',
        'traceparent',
        'tracestate',
    ];

    public function handle(Request $request, Closure $next)
    {
        $traceHeaders = [];
        foreach (self::TRACE_HEADERS as $header) {
            $value = $request->header($header);
            if ($value !== null) {
                $traceHeaders[$header] = $value;
            }
        }

        app()->instance('trace.headers', $traceHeaders);

        return $next($request);
    }
}
```

Register the middleware in your kernel:

```php
// app/Http/Kernel.php
protected $middleware = [
    \App\Http\Middleware\TraceHeaders::class,
    // ... other middleware
];
```

Create a helper for making HTTP calls with trace headers:

```php
<?php
// app/Services/HttpClient.php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class HttpClient
{
    public static function get(string $url, array $query = [])
    {
        $traceHeaders = app()->bound('trace.headers')
            ? app('trace.headers')
            : [];

        return Http::withHeaders($traceHeaders)
            ->timeout(30)
            ->get($url, $query);
    }

    public static function post(string $url, array $data = [])
    {
        $traceHeaders = app()->bound('trace.headers')
            ? app('trace.headers')
            : [];

        return Http::withHeaders($traceHeaders)
            ->timeout(30)
            ->post($url, $data);
    }
}
```

### Plain PHP

```php
<?php
function getTraceHeaders(): array
{
    $headers = [];
    $traceHeaders = [
        'HTTP_X_REQUEST_ID' => 'x-request-id',
        'HTTP_X_B3_TRACEID' => 'x-b3-traceid',
        'HTTP_X_B3_SPANID' => 'x-b3-spanid',
        'HTTP_X_B3_PARENTSPANID' => 'x-b3-parentspanid',
        'HTTP_X_B3_SAMPLED' => 'x-b3-sampled',
        'HTTP_X_B3_FLAGS' => 'x-b3-flags',
        'HTTP_TRACEPARENT' => 'traceparent',
        'HTTP_TRACESTATE' => 'tracestate',
    ];

    foreach ($traceHeaders as $serverKey => $headerName) {
        if (isset($_SERVER[$serverKey])) {
            $headers[] = "$headerName: " . $_SERVER[$serverKey];
        }
    }

    return $headers;
}

function callService(string $url): string
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, getTraceHeaders());
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}
```

## PHP-FPM Configuration

Tune PHP-FPM for the mesh:

```ini
; php-fpm.conf
[www]
pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 500

; Process idle timeout
pm.process_idle_timeout = 30s

; Status page for monitoring
pm.status_path = /fpm-status
ping.path = /fpm-ping
ping.response = pong
```

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shop-api
  namespace: production
spec:
  hosts:
  - shop-api
  http:
  - route:
    - destination:
        host: shop-api
        port:
          number: 80
    timeout: 60s
    retries:
      attempts: 2
      perTryTimeout: 30s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: shop-api
  namespace: production
spec:
  host: shop-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Queue Workers

If you run Laravel queue workers, they need their own deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-worker
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: shop-worker
    spec:
      containers:
      - name: worker
        image: myregistry/shop-api:1.0.0
        command: ["php", "artisan", "queue:work", "--tries=3", "--timeout=90"]
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
```

Queue workers make outbound HTTP calls but do not serve inbound HTTP. The sidecar handles outbound traffic. If the worker connects to Redis or a database, consider excluding those ports if you run into issues.

## Common PHP + Istio Issues

**OPcache and shared memory**: PHP-FPM with OPcache uses shared memory between workers. The Istio sidecar does not affect this, but be aware that OPcache preloading happens at FPM startup, which can increase boot time.

**Session handling**: If you use file-based sessions, they are local to the pod. With Istio load balancing, requests might go to different pods. Use Redis or database-backed sessions.

**PHP's share-nothing architecture**: Each PHP request starts from scratch, which means trace headers need to be captured fresh on every request. The middleware approach above handles this correctly.

PHP applications work well with Istio once the Nginx + PHP-FPM stack is properly configured. The share-nothing nature of PHP actually simplifies some things because you do not have to worry about connection pooling or persistent state conflicting with the sidecar.
