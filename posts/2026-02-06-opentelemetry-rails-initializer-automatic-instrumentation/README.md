# How to Configure OpenTelemetry in a Rails Initializer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Ruby, Rails, Initializer, Configuration

Description: Step-by-step guide to configuring OpenTelemetry in Rails initializers for automatic instrumentation with custom settings and best practices for production deployments.

Rails initializers provide a clean, centralized way to configure OpenTelemetry for your entire application. Proper initializer configuration ensures instrumentation starts before your application code executes, capturing all telemetry data from the moment your app boots.

## Rails Initializer Execution Flow

Understanding when initializers run is critical for OpenTelemetry configuration. Here's the Rails boot sequence:

```mermaid
graph LR
    A[Boot] --> B[Load Gems]
    B --> C[Load Initializers]
    C --> D[Configure Application]
    D --> E[Load Application Code]
    E --> F[Start Server]

    G[OpenTelemetry Init] --> C
    H[Auto-Instrumentation] --> E
```

Your OpenTelemetry initializer must run during phase C to properly instrument everything that happens in phases D, E, and F.

## Basic Initializer Structure

Create a dedicated initializer file for OpenTelemetry configuration. The file name determines load order, so prefix it appropriately:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

# Configure the OpenTelemetry SDK

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'
  c.use_all
end
```

This basic configuration enables all available instrumentations automatically. The `use_all` method discovers and activates instrumentation gems present in your bundle.

## Environment-Specific Configuration

Production, staging, and development environments often need different OpenTelemetry settings. Use Rails environment detection to customize behavior:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  # Set service name from environment or use default
  service_name = ENV.fetch('OTEL_SERVICE_NAME', "rails-app-#{Rails.env}")
  c.service_name = service_name

  # Different sampling rates per environment
  sampler_rate = if Rails.env.production?
                   # Sample 50% in production to manage volume
                   '0.5'
                 elsif Rails.env.staging?
                   # Sample 100% in staging for thorough testing
                   '1.0'
                 else
                   # Development: sample everything
                   '1.0'
                 end

  ENV['OTEL_TRACES_SAMPLER'] ||= 'parentbased_traceidratio'
  ENV['OTEL_TRACES_SAMPLER_ARG'] ||= sampler_rate

  # Enable all instrumentations
  c.use_all

  # Add environment-specific resource attributes
  c.resource = OpenTelemetry::SDK::Resources::Resource.create({
    'service.name' => service_name,
    'deployment.environment' => Rails.env,
    'service.version' => ENV.fetch('GIT_COMMIT', 'unknown')
  })
end
```

This configuration adapts sampling rates and resource attributes based on the current Rails environment, giving you full traces in development while managing costs in production.

## Selective Instrumentation Configuration

While `use_all` is convenient, you often need fine-grained control over individual instrumentations. Here's how to configure each instrumentation separately:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/rails'
require 'opentelemetry/instrumentation/active_record'
require 'opentelemetry/instrumentation/net_http'
require 'opentelemetry/instrumentation/redis'
require 'opentelemetry/instrumentation/sidekiq'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'

  # Rails instrumentation umbrella for Rails components
  c.use 'OpenTelemetry::Instrumentation::Rails'

  # ActionPack span naming using HTTP route conventions
  c.use 'OpenTelemetry::Instrumentation::ActionPack', {
    span_naming: :semconv
  }

  # ActiveRecord model operation instrumentation
  c.use 'OpenTelemetry::Instrumentation::ActiveRecord'

  # Net::HTTP for external API calls
  c.use 'OpenTelemetry::Instrumentation::Net::HTTP', {
    # Don't trace health check endpoints
    untraced_hosts: ['localhost:8080']
  }

  # Redis instrumentation
  c.use 'OpenTelemetry::Instrumentation::Redis', {
    # Include command arguments in traces
    db_statement: :include
  }

  # Sidekiq background job instrumentation
  c.use 'OpenTelemetry::Instrumentation::Sidekiq'
end
```

Each instrumentation accepts different configuration options. ActionPack can use route-based span names, adapter-level database instrumentations such as Redis can control `db.statement` capture, and Net::HTTP can exclude specific hosts from tracing.

## Configuring Exporters and Processors

The exporter sends trace data to your observability backend. Configure it with appropriate batching and timeout settings:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'
  c.use_all

  # Create OTLP exporter with custom configuration
  exporter = OpenTelemetry::Exporter::OTLP::Exporter.new(
    endpoint: ENV.fetch('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318/v1/traces'),
    headers: {
      'x-api-key' => ENV['OTEL_API_KEY']
    }.compact,
    compression: 'gzip',
    timeout: 10 # seconds
  )

  # Configure batch processor for efficient export
  processor = OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor.new(
    exporter,
    max_queue_size: 2048,
    schedule_delay: 5000,             # Export every 5 seconds
    max_export_batch_size: 512,       # Export up to 512 spans at once
    exporter_timeout: 30000           # 30 second export timeout
  )

  c.add_span_processor(processor)
end
```

The batch processor collects spans in memory and exports them periodically. This reduces network overhead compared to exporting spans individually.

## Adding Custom Resource Attributes

Resource attributes help identify and filter traces in your observability platform. Add attributes that describe your application instance:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'
require 'socket'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'
  c.use_all

  # Rich resource attributes for trace filtering and analysis
  c.resource = OpenTelemetry::SDK::Resources::Resource.create({
    # Service identification
    'service.name' => ENV.fetch('OTEL_SERVICE_NAME', 'rails-app'),
    'service.version' => ENV.fetch('APP_VERSION', 'dev'),
    'service.namespace' => ENV.fetch('SERVICE_NAMESPACE', 'production'),

    # Deployment information
    'deployment.environment' => Rails.env,
    'deployment.region' => ENV.fetch('AWS_REGION', 'us-east-1'),

    # Host information
    'host.name' => Socket.gethostname,
    'host.id' => ENV.fetch('HOSTNAME', Socket.gethostname),

    # Process information
    'process.pid' => Process.pid,
    'process.runtime.name' => RUBY_ENGINE,
    'process.runtime.version' => RUBY_VERSION,

    # Container information (if applicable)
    'container.id' => ENV['CONTAINER_ID'],
    'container.name' => ENV['CONTAINER_NAME'],

    # Kubernetes information (if applicable)
    'k8s.pod.name' => ENV['K8S_POD_NAME'],
    'k8s.namespace.name' => ENV['K8S_NAMESPACE'],
    'k8s.deployment.name' => ENV['K8S_DEPLOYMENT_NAME']
  }.compact) # Remove nil values
end
```

These attributes appear on every span from your application, making it easy to filter traces by environment, region, or deployment version.

## Configuring Sampling

The Ruby SDK supports built-in samplers through environment variables when you use `OpenTelemetry::SDK.configure`. Here's a configuration that samples 10% of root traces and respects parent sampling decisions:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

ENV['OTEL_TRACES_SAMPLER'] ||= 'parentbased_traceidratio'
ENV['OTEL_TRACES_SAMPLER_ARG'] ||= '0.1'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'
  c.use_all
end
```

This keeps overall trace volume manageable through percentage-based sampling. If you need to retain all error traces, use tail sampling in the OpenTelemetry Collector, because head samplers run before a request's final status code is known.

## Propagation Configuration

Trace context propagation ensures distributed traces work correctly across service boundaries. Configure which propagation formats your application supports:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'rails-app'
  c.use_all

  # Configure context propagation formats
  # Supports W3C Trace Context and W3C Baggage formats
  propagators = [
    OpenTelemetry::Trace::Propagation::TraceContext.text_map_propagator,
    OpenTelemetry::Baggage::Propagation.text_map_propagator
  ]

  c.propagators = propagators
end
```

The W3C Trace Context format is the OpenTelemetry standard and works with all modern observability platforms.

## Handling Initialization Failures

OpenTelemetry configuration and export can fail due to misconfiguration or network issues. Handle failures gracefully to prevent application startup problems:

```ruby
# config/initializers/opentelemetry.rb

require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.error_handler = lambda do |exception:, message: nil|
    Rails.logger.error "OpenTelemetry error: #{message}"
    Rails.logger.error exception&.message
    Rails.logger.error exception.backtrace.join("\n") if exception&.backtrace
  end

  c.service_name = 'rails-app'
  c.use_all

  # Configure exporter
  exporter = OpenTelemetry::Exporter::OTLP::Exporter.new(
    endpoint: ENV.fetch('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318/v1/traces'),
    timeout: 10
  )

  processor = OpenTelemetry::SDK::Trace::Export::BatchSpanProcessor.new(exporter)
  c.add_span_processor(processor)
end

Rails.logger.info "OpenTelemetry initialized successfully"
```

This pattern logs OpenTelemetry configuration and export errors through the SDK error handler without preventing your application from starting, which is crucial for production deployments.

## Testing Your Configuration

Verify your initializer configuration works correctly across environments:

```ruby
# spec/initializers/opentelemetry_spec.rb

require 'rails_helper'

RSpec.describe 'OpenTelemetry Configuration' do
  it 'initializes OpenTelemetry SDK' do
    expect(OpenTelemetry.tracer_provider).not_to be_nil
  end

  it 'sets correct service name' do
    resource = OpenTelemetry.tracer_provider.resource
    service_name = resource.attribute_enumerator.find { |k, _| k == 'service.name' }&.last

    expect(service_name).to eq("rails-app-test")
  end

  it 'enables Rails instrumentation' do
    tracer = OpenTelemetry.tracer_provider.tracer('test')

    exporter = OpenTelemetry::SDK::Trace::Export::InMemorySpanExporter.new
    span_processor = OpenTelemetry::SDK::Trace::Export::SimpleSpanProcessor.new(
      exporter
    )
    OpenTelemetry.tracer_provider.add_span_processor(span_processor)

    tracer.in_span('test-span') {}
    OpenTelemetry.tracer_provider.force_flush

    expect(exporter.finished_spans.map(&:name)).to include('test-span')
  end
end
```

These tests verify OpenTelemetry initializes correctly and creates the expected configuration.

## Load Order Considerations

Sometimes you need your OpenTelemetry initializer to run before or after other initializers. Control load order with file naming:

```bash
# Load OpenTelemetry first
config/initializers/00_opentelemetry.rb

# Load after database initialization
config/initializers/50_opentelemetry.rb

# Load last
config/initializers/zz_opentelemetry.rb
```

For most applications, loading OpenTelemetry early ensures all subsequent initialization code is instrumented.

Proper initializer configuration is the foundation of effective OpenTelemetry integration in Rails. With environment-specific settings, sampling, rich resource attributes, and error handling, your initializer becomes a robust observability foundation that adapts to different deployment scenarios while maintaining application stability.
