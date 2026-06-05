# How to Trace Ruby HTTP Clients (Faraday, HTTParty) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Ruby, Faraday, HTTParty, HTTP Client, Tracing

Description: Comprehensive guide to instrumenting Faraday and HTTParty HTTP clients with OpenTelemetry for distributed tracing across microservices.

Modern Ruby applications rarely operate in isolation. They call payment gateways, third-party APIs, internal microservices, and external data sources. When requests slow down or fail, pinpointing the culprit becomes challenging without proper instrumentation. OpenTelemetry provides standardized tracing for HTTP clients, giving you visibility into every external call your application makes.

## Why HTTP Client Tracing Matters

HTTP clients are integration points where your application depends on external services. These calls can fail or degrade for numerous reasons:

- Network latency or timeouts
- Rate limiting from external APIs
- Service degradation or outages
- Configuration errors (wrong endpoints, missing credentials)
- SSL/TLS certificate issues

Without tracing, you only see symptoms (slow responses, errors) without understanding which external service caused the problem. OpenTelemetry captures HTTP request spans with timing, status codes, and error details.

## Setting Up OpenTelemetry for HTTP Clients

Add the required gems to your Gemfile:

```ruby
# Gemfile

gem 'opentelemetry-sdk'
gem 'opentelemetry-exporter-otlp'
gem 'opentelemetry-instrumentation-faraday'
gem 'opentelemetry-instrumentation-net_http'
gem 'opentelemetry-instrumentation-concurrent_ruby'
```

Note that HTTParty uses Net::HTTP under the hood, so the `opentelemetry-instrumentation-net_http` instrumentation covers it automatically.

Install dependencies:

```bash
bundle install
```

Configure OpenTelemetry in an initializer:

```ruby
# config/initializers/opentelemetry.rb
require 'opentelemetry/sdk'
require 'opentelemetry/exporter/otlp'
require 'opentelemetry/instrumentation/all'

OpenTelemetry::SDK.configure do |c|
  c.service_name = 'ruby-http-client-app'
  c.service_version = '1.0.0'

  c.use_all({
    'OpenTelemetry::Instrumentation::Faraday' => {},
    'OpenTelemetry::Instrumentation::Net::HTTP' => {},
    'OpenTelemetry::Instrumentation::ConcurrentRuby' => {},
  })
end
```

This automatically instruments HTTP calls made through Faraday and Net::HTTP (which HTTParty uses), and preserves context across `Concurrent::Future` work.

## Tracing Faraday HTTP Requests

Faraday is a popular HTTP client with middleware support. The OpenTelemetry instrumentation integrates as middleware:

```ruby
# app/services/payment_service.rb
require 'faraday'

class PaymentService
  def initialize
    @client = Faraday.new(url: 'https://api.payment-provider.com') do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end
  end

  def charge(amount, currency, customer_id)
    response = @client.post('/v1/charges') do |req|
      req.headers['Authorization'] = "Bearer #{ENV['PAYMENT_API_KEY']}"
      req.body = {
        amount: amount,
        currency: currency,
        customer_id: customer_id
      }
    end

    response.body
  end
end
```

When `charge` is called, OpenTelemetry automatically creates a span. Depending on the semantic convention mode used by your installed instrumentation, common attributes include:

- `http.request.method` or `http.method`: POST
- `url.full` or `http.url`: https://api.payment-provider.com/v1/charges
- `http.response.status_code` or `http.status_code`: 200, 400, 500, etc.
- `http.request.body.size`: Size of request payload
- `http.response.body.size`: Size of response payload
- `server.address` or `net.peer.name`: api.payment-provider.com
- `server.port` or `net.peer.port`: 443

## Adding Custom Context to HTTP Traces

Enhance traces with business context specific to your application:

```ruby
# app/services/user_service.rb
require 'faraday'

class UserAPIError < StandardError; end

class UserService
  def initialize
    @tracer = OpenTelemetry.tracer_provider.tracer('user-service')
    @client = Faraday.new(url: 'https://api.users.internal') do |f|
      f.response :json
      f.adapter Faraday.default_adapter
    end
  end

  def fetch_user(user_id)
    @tracer.in_span('fetch_user_from_api',
                    attributes: {
                      'user.id' => user_id,
                      'peer.service' => 'user-api'
                    }) do |span|

      response = @client.get("/users/#{user_id}") do |req|
        req.headers['X-Request-ID'] = OpenTelemetry::Trace.current_span.context.trace_id.unpack1('H*')
      end

      span.set_attribute('http.response.body.size', response.body.to_s.bytesize)
      span.set_attribute('user.found', response.status == 200)

      if response.status == 404
        span.add_event('user_not_found')
        return nil
      elsif response.status >= 500
        span.status = OpenTelemetry::Trace::Status.error('User API error')
        raise UserAPIError, "API returned #{response.status}"
      end

      user_data = response.body
      span.set_attribute('user.email_present', user_data.key?('email'))
      span.set_attribute('user.account_type', user_data['account_type'])

      user_data
    end
  end
end
```

## Tracing HTTParty Requests

HTTParty provides a simpler interface for HTTP requests. Since it uses Net::HTTP internally, the instrumentation works automatically:

```ruby
# app/services/weather_service.rb
require 'httparty'

class WeatherService
  include HTTParty
  base_uri 'https://api.weather.com'

  def current_weather(city)
    tracer = OpenTelemetry.tracer_provider.tracer('weather-service')

    tracer.in_span('fetch_weather',
                   attributes: { 'weather.city' => city }) do |span|

      options = {
        query: { city: city, appid: ENV['WEATHER_API_KEY'] },
        headers: { 'Accept' => 'application/json' },
        timeout: 5
      }

      begin
        start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        response = self.class.get('/data/2.5/weather', options)
        duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

        span.set_attribute('http.duration_ms', duration_ms)
        span.set_attribute('weather.temp', response['main']['temp'])
        span.set_attribute('weather.condition', response['weather'][0]['main'])

        response

      rescue HTTParty::Error => e
        span.record_exception(e)
        span.status = OpenTelemetry::Trace::Status.error('Weather API request failed')
        raise
      rescue Net::ReadTimeout => e
        span.record_exception(e)
        span.add_event('request_timeout', attributes: { 'timeout_seconds' => 5 })
        span.status = OpenTelemetry::Trace::Status.error('Request timeout')
        raise
      end
    end
  end
end
```

## Handling Retries and Timeouts

HTTP clients often implement retry logic. Track retry attempts in traces:

```ruby
# app/services/resilient_api_client.rb
require 'faraday'
require 'faraday/retry'

class ResilientAPIClient
  MAX_RETRIES = 3

  def initialize
    @tracer = OpenTelemetry.tracer_provider.tracer('resilient-client')

    @client = Faraday.new(url: 'https://api.external.com') do |f|
      f.request :retry,
        max: MAX_RETRIES,
        interval: 0.5,
        backoff_factor: 2,
        retry_statuses: [500, 502, 503, 504],
        retry_block: ->(env:, options:, retry_count:, exception:, will_retry_in:) {
          OpenTelemetry::Trace.current_span.add_event(
            'request_retry',
            attributes: {
              'attempt.number' => retry_count + 1,
              'retry.delay_ms' => (will_retry_in * 1000).round
            }
          )
        }

      f.adapter Faraday.default_adapter
    end
  end

  def fetch_data(resource_id)
    @tracer.in_span('fetch_external_data',
                    attributes: {
                      'resource.id' => resource_id,
                      'client.max_retries' => MAX_RETRIES
                    }) do |span|

      begin
        span.add_event('request_attempt',
                       attributes: { 'attempt.number' => 1 })

        response = @client.get("/resources/#{resource_id}") do |req|
          req.options.timeout = 10
          req.options.open_timeout = 5
        end

        span.set_attribute('request.max_retries', MAX_RETRIES)
        span.set_attribute('request.succeeded', true)

        response.body

      rescue Faraday::TimeoutError => e
        span.record_exception(e)
        span.set_attribute('error.timeout', true)
        span.set_attribute('request.max_retries', MAX_RETRIES)
        span.status = OpenTelemetry::Trace::Status.error('Request timeout')
        raise
      end
    end
  end
end
```

## Tracing Parallel HTTP Requests

When making multiple HTTP calls in parallel, each gets its own span under a parent:

```ruby
# app/services/aggregator_service.rb
require 'faraday'
require 'concurrent'

class AggregatorService
  def initialize
    @tracer = OpenTelemetry.tracer_provider.tracer('aggregator')
    @client = Faraday.new
  end

  def fetch_user_dashboard(user_id)
    @tracer.in_span('fetch_dashboard_data',
                    attributes: { 'user.id' => user_id }) do |span|

      # Make parallel requests
      futures = {
        profile: Concurrent::Future.execute { fetch_profile(user_id) },
        orders: Concurrent::Future.execute { fetch_orders(user_id) },
        recommendations: Concurrent::Future.execute { fetch_recommendations(user_id) },
        notifications: Concurrent::Future.execute { fetch_notifications(user_id) }
      }

      # Wait for all requests to complete
      results = futures.transform_values(&:value)

      # Track which requests succeeded
      span.set_attribute('profile.loaded', !results[:profile].nil?)
      span.set_attribute('orders.loaded', !results[:orders].nil?)
      span.set_attribute('recommendations.loaded', !results[:recommendations].nil?)
      span.set_attribute('notifications.loaded', !results[:notifications].nil?)

      results
    end
  end

  private

  def fetch_profile(user_id)
    @tracer.in_span('fetch_profile') do
      response = @client.get("https://api.users.internal/profiles/#{user_id}")
      response.body
    end
  rescue StandardError => e
    @tracer.in_span('fetch_profile') do |span|
      span.record_exception(e)
    end
    nil
  end

  def fetch_orders(user_id)
    @tracer.in_span('fetch_orders') do
      response = @client.get("https://api.orders.internal/users/#{user_id}/orders")
      response.body
    end
  rescue StandardError => e
    @tracer.in_span('fetch_orders') do |span|
      span.record_exception(e)
    end
    nil
  end

  def fetch_recommendations(user_id)
    @tracer.in_span('fetch_recommendations') do
      response = @client.get("https://api.recommendations.internal/users/#{user_id}")
      response.body
    end
  rescue StandardError => e
    @tracer.in_span('fetch_recommendations') do |span|
      span.record_exception(e)
    end
    nil
  end

  def fetch_notifications(user_id)
    @tracer.in_span('fetch_notifications') do
      response = @client.get("https://api.notifications.internal/users/#{user_id}")
      response.body
    end
  rescue StandardError => e
    @tracer.in_span('fetch_notifications') do |span|
      span.record_exception(e)
    end
    nil
  end
end
```

This creates a trace showing all requests in parallel with individual timing:

```mermaid
graph TD
    A[fetch_dashboard_data] --> B[fetch_profile]
    A --> C[fetch_orders]
    A --> D[fetch_recommendations]
    A --> E[fetch_notifications]
    B --> F[HTTP GET /profiles/123]
    C --> G[HTTP GET /users/123/orders]
    D --> H[HTTP GET /users/123 recommendations]
    E --> I[HTTP GET /users/123 notifications]
```

## Filtering Sensitive Data

Prevent sensitive information from appearing in traces:

```ruby
# config/initializers/opentelemetry.rb
OpenTelemetry::SDK.configure do |c|
  c.service_name = 'ruby-http-client'

  c.use_all({
    'OpenTelemetry::Instrumentation::Faraday' => {},
    'OpenTelemetry::Instrumentation::Net::HTTP' => {}
  })
end

# lib/url_sanitizer.rb
require 'uri'

# Prefer to avoid recording secrets in the first place. Do not add API keys,
# tokens, cookies, or raw user PII as span attributes. If a URL includes
# sensitive query parameters, sanitize it before adding any custom attribute.
def sanitized_url(url)
  uri = URI(url)
  return url unless uri.query

  params = URI.decode_www_form(uri.query).map do |key, value|
    if %w[token access_token api_key].include?(key.downcase)
      [key, '[REDACTED]']
    else
      [key, value]
    end
  end

  uri.query = URI.encode_www_form(params)
  uri.to_s
end
```

## Monitoring HTTP Client Performance

Track aggregate metrics across all HTTP calls. Ruby metrics support is still in development, so configure `opentelemetry-metrics-sdk` and a metric reader/exporter if you want these measurements exported:

```ruby
# app/services/monitored_http_client.rb
require 'faraday'

class MonitoredHTTPClient
  def initialize(base_url)
    @tracer = OpenTelemetry.tracer_provider.tracer('monitored-client')
    @meter = OpenTelemetry.meter_provider.meter('http-metrics')

    @request_counter = @meter.create_counter(
      'http.client.requests',
      unit: '1',
      description: 'Total HTTP requests'
    )

    @duration_histogram = @meter.create_histogram(
      'http.client.duration',
      unit: 'ms',
      description: 'HTTP request duration'
    )

    @client = Faraday.new(url: base_url)
  end

  def get(path, params: {})
    @tracer.in_span('http_get',
                    attributes: { 'http.path' => path }) do |span|

      start_time = Time.now

      begin
        response = @client.get(path, params)
        duration_ms = ((Time.now - start_time) * 1000).round(2)

        # Record metrics
        @request_counter.add(1, attributes: {
          'http.request.method' => 'GET',
          'http.response.status_code' => response.status,
          'server.address' => @client.url_prefix.host
        })

        @duration_histogram.record(duration_ms, attributes: {
          'http.request.method' => 'GET',
          'http.response.status_code' => response.status
        })

        span.set_attribute('http.duration_ms', duration_ms)

        response

      rescue StandardError => e
        @request_counter.add(1, attributes: {
          'http.request.method' => 'GET',
          'error.type' => e.class.name
        })

        span.record_exception(e)
        raise
      end
    end
  end
end
```

## Best Practices for HTTP Client Tracing

Always set appropriate timeouts to prevent hanging traces:

```ruby
# app/services/timeout_aware_client.rb
class TimeoutAwareClient
  def initialize
    @client = Faraday.new do |f|
      f.options.timeout = 30      # 30 seconds read timeout
      f.options.open_timeout = 10  # 10 seconds connection timeout
      f.adapter Faraday.default_adapter
    end
  end

  def call_external_api
    tracer = OpenTelemetry.tracer_provider.tracer('timeout-aware')

    tracer.in_span('external_api_call') do |span|
      span.set_attribute('client.timeout', 30)
      span.set_attribute('client.open_timeout', 10)

      @client.get('https://api.external.com/data')
    end
  end
end
```

With proper OpenTelemetry instrumentation, every HTTP call made by your Ruby application becomes traceable and debuggable. You can identify slow external services, track down integration failures, and understand exactly how your application interacts with the outside world. This visibility is critical for maintaining reliable distributed systems.
