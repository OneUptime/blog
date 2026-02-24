# How to Configure Istio for Ruby on Rails Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ruby, Rails, Kubernetes, Service Mesh

Description: How to configure Istio for Ruby on Rails applications covering Puma server settings, health checks, trace propagation, and resource tuning.

---

Ruby on Rails applications have some specific characteristics that matter when running in an Istio mesh. Rails apps typically use Puma as the application server, are memory-hungry compared to other runtimes, and have relatively slow startup times due to the framework's boot process. Getting the configuration right avoids common issues like health check failures during boot and connection problems with background workers.

## Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: store-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: store-api
      version: v1
  template:
    metadata:
      labels:
        app: store-api
        version: v1
    spec:
      containers:
      - name: store-api
        image: myregistry/store-api:1.0.0
        ports:
        - name: http-web
          containerPort: 3000
        command: ["bundle", "exec", "puma", "-C", "config/puma.rb"]
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        env:
        - name: RAILS_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: RAILS_LOG_TO_STDOUT
          value: "true"
        - name: WEB_CONCURRENCY
          value: "2"
        - name: RAILS_MAX_THREADS
          value: "5"
```

## Puma Configuration

Configure Puma to work well with Istio's Envoy proxy:

```ruby
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY", 2).to_i
threads_count = ENV.fetch("RAILS_MAX_THREADS", 5).to_i
threads threads_count, threads_count

port ENV.fetch("PORT", 3000)
environment ENV.fetch("RAILS_ENV", "development")

# Preload the app for faster worker boot
preload_app!

# Persistent connections work well with Envoy
persistent_timeout 20

# Set worker timeout higher than Istio's retry timeout
worker_timeout 60

on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

# Graceful shutdown
on_worker_shutdown do
  # Clean up connections
end
```

The `persistent_timeout 20` setting keeps connections alive, which allows Envoy to reuse them efficiently.

## Service Definition

```yaml
apiVersion: v1
kind: Service
metadata:
  name: store-api
  namespace: production
spec:
  selector:
    app: store-api
  ports:
  - name: http-web
    port: 3000
    targetPort: http-web
```

## Health Checks

Add a health check controller to your Rails app:

```ruby
# app/controllers/health_controller.rb
class HealthController < ActionController::API
  def liveness
    render json: { status: 'alive' }, status: :ok
  end

  def readiness
    checks = {
      database: database_check,
      redis: redis_check
    }

    all_healthy = checks.values.all? { |c| c[:status] == 'ok' }
    status = all_healthy ? :ok : :service_unavailable

    render json: {
      status: all_healthy ? 'ready' : 'not ready',
      checks: checks
    }, status: status
  end

  private

  def database_check
    ActiveRecord::Base.connection.execute('SELECT 1')
    { status: 'ok' }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end

  def redis_check
    Redis.current.ping
    { status: 'ok' }
  rescue StandardError => e
    { status: 'error', message: e.message }
  end
end
```

```ruby
# config/routes.rb
Rails.application.routes.draw do
  get '/healthz', to: 'health#liveness'
  get '/ready', to: 'health#readiness'

  # ... other routes
end
```

Configure probes with generous startup time for Rails:

```yaml
containers:
- name: store-api
  livenessProbe:
    httpGet:
      path: /healthz
      port: 3000
    initialDelaySeconds: 30
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 3000
    initialDelaySeconds: 20
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 3000
    periodSeconds: 5
    failureThreshold: 30
```

Rails apps can take 20-60 seconds to boot (asset compilation, eager loading, etc.), so the startup probe allows up to 150 seconds.

## Trace Header Propagation

Create a middleware for Rack-level trace header propagation:

```ruby
# app/middleware/trace_header_middleware.rb
class TraceHeaderMiddleware
  TRACE_HEADERS = %w[
    x-request-id
    x-b3-traceid
    x-b3-spanid
    x-b3-parentspanid
    x-b3-sampled
    x-b3-flags
    b3
    traceparent
    tracestate
  ].freeze

  def initialize(app)
    @app = app
  end

  def call(env)
    headers = {}
    TRACE_HEADERS.each do |header|
      rack_header = "HTTP_#{header.upcase.tr('-', '_')}"
      headers[header] = env[rack_header] if env[rack_header]
    end

    Thread.current[:trace_headers] = headers
    @app.call(env)
  ensure
    Thread.current[:trace_headers] = nil
  end
end
```

Register it in your application:

```ruby
# config/application.rb
module StoreApi
  class Application < Rails::Application
    config.middleware.insert_before 0, TraceHeaderMiddleware
  end
end
```

Create a helper for making downstream HTTP calls with trace headers:

```ruby
# app/services/http_client.rb
require 'net/http'
require 'json'

class HttpClient
  def self.get(url)
    uri = URI(url)
    request = Net::HTTP::Get.new(uri)

    # Add trace headers
    trace_headers = Thread.current[:trace_headers] || {}
    trace_headers.each { |key, value| request[key] = value }

    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end

    JSON.parse(response.body)
  end
end
```

Or if you use Faraday:

```ruby
# config/initializers/faraday.rb
Faraday.default_connection = Faraday.new do |conn|
  conn.request :retry, max: 2, interval: 0.5
  conn.use :instrumentation

  conn.request :url_encoded
  conn.adapter Faraday.default_adapter
end

# Faraday middleware for trace headers
class FaradayTraceHeaders < Faraday::Middleware
  TRACE_HEADERS = %w[
    x-request-id x-b3-traceid x-b3-spanid x-b3-parentspanid
    x-b3-sampled x-b3-flags b3 traceparent tracestate
  ].freeze

  def call(env)
    trace_headers = Thread.current[:trace_headers] || {}
    trace_headers.each { |key, value| env.request_headers[key] = value }
    @app.call(env)
  end
end

Faraday::Request.register_middleware(trace_headers: FaradayTraceHeaders)
```

## Handling Sidecar Startup

Rails apps take a while to boot, so the sidecar is usually ready before the app. But if your app connects to external services during initialization (running migrations, seeding cache), the sidecar might not be ready during the very first seconds:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

You can also add connection retry logic to your database configuration:

```ruby
# config/database.yml
production:
  adapter: postgresql
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5) %>
  timeout: 5000
  reconnect: true
  connect_timeout: 30
```

## Graceful Shutdown

Puma handles SIGTERM gracefully by default, but you need to coordinate with the sidecar:

```yaml
containers:
- name: store-api
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 60
```

The sequence: Kubernetes sends SIGTERM, the preStop hook sleeps for 5 seconds (allowing the sidecar to drain), then Puma begins its graceful shutdown, finishing active requests before stopping workers.

## Sidekiq Workers

If you run Sidekiq alongside your Rails app, it needs its own deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: store-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: store-worker
  template:
    metadata:
      labels:
        app: store-worker
    spec:
      containers:
      - name: worker
        image: myregistry/store-api:1.0.0
        command: ["bundle", "exec", "sidekiq"]
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
```

Sidekiq does not serve HTTP traffic, but it does make outbound HTTP calls to other services. The sidecar will handle those connections. However, Sidekiq connects to Redis, which uses a server-first protocol. Exclude Redis port if you have issues:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "6379"
```

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: store-api
  namespace: production
spec:
  hosts:
  - store-api
  http:
  - route:
    - destination:
        host: store-api
        port:
          number: 3000
    timeout: 60s
    retries:
      attempts: 2
      perTryTimeout: 30s
      retryOn: 5xx,reset,connect-failure
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: store-api
  namespace: production
spec:
  host: store-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

Rails apps are slower than Go or Node.js, so keep the connection limits conservative and timeouts longer.

## Common Rails + Istio Issues

**Asset precompilation**: If your Docker build does not precompile assets, the first request might trigger compilation and time out. Always precompile in the Docker build stage.

**Database migrations**: Do not run migrations in the pod startup. Use a separate Job or init container. If the migration Job has a sidecar, it will not terminate after the job completes. Use the `sidecar.istio.io/inject: "false"` annotation on migration jobs.

**Memory usage**: Rails apps use a lot of memory. A typical Rails app with 2 Puma workers uses 300-500MB. Add the sidecar overhead (50-100MB) and you need at least 512MB per pod.

Rails and Istio work fine together once you handle the startup time, memory requirements, and background worker setup. The main Rails-specific considerations are Puma configuration, Sidekiq's Redis connection, and allowing enough time for the framework to boot.
