# How to Configure Mongoid for Production in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoid, Rails, Production, Configuration

Description: Learn how to configure Mongoid for production Rails deployments including connection pooling, TLS, replica sets, and performance tuning.

---

## Introduction

Development defaults rarely survive production workloads. Mongoid's `mongoid.yml` provides deep configuration for connection pooling, authentication, TLS, replica set failover, and read preferences. Getting these settings right is essential for a stable, high-performance Rails application.

## Production mongoid.yml

```yaml
production:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] %>
      options:
        # Connection pool
        max_pool_size: 20
        min_pool_size: 5
        wait_queue_timeout: 10
        max_idle_time: 60

        # Timeouts (seconds)
        connect_timeout: 10
        socket_timeout:  15
        server_selection_timeout: 30

        # Retryable writes and reads
        retry_writes: true
        retry_reads:  true

        # TLS
        ssl: true
        ssl_verify: true

        # Heartbeat
        heartbeat_frequency: 10
```

## Read Preferences for Replica Sets

```yaml
production:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] %>
      options:
        read:
          mode: :secondary_preferred
          tag_sets:
            - { region: 'us-east' }
```

Override per-query in code:

```ruby
Article.with(read: { mode: :primary }).where(published: true).to_a
```

## Write Concerns

```yaml
options:
  write:
    w: :majority
    j: true
    wtimeout: 5000
```

Or override per-operation:

```ruby
Article.with(write: { w: 1 }).create!(title: 'Draft')
```

## Environment Variable Driven Configuration

Keep secrets out of source code:

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/myapp?authSource=admin&retryWrites=true&w=majority
```

## Managing Indexes in Production

Generate and create indexes without blocking the application:

```bash
rails db:mongoid:create_indexes
```

Add index declarations to your models:

```ruby
class Article
  index({ title: 1 }, { unique: true })
end
```

## Health Check Endpoint

```ruby
# config/initializers/health.rb
Rails.application.config.after_initialize do
  begin
    Mongoid.default_client.database.command(ping: 1)
    Rails.logger.info 'MongoDB connection verified'
  rescue => e
    Rails.logger.error "MongoDB connection failed: #{e.message}"
  end
end
```

## Monitoring with OneUptime

Connect [OneUptime](https://oneuptime.com) to track MongoDB-related errors and latency spikes in your Rails app. Set up status pages and alerting rules so your team is notified before users notice degraded performance.

## Summary

Production Mongoid configuration focuses on four areas: connection pool sizing to match your concurrency, TLS and authentication for security, read preferences and write concerns for consistency, and health checks for early failure detection. Externalise all credentials via environment variables and generate indexes as part of your deployment pipeline.
