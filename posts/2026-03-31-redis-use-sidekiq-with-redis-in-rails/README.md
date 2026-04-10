# How to Use Sidekiq with Redis in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby On Rail, Sidekiq, Background Job, Ruby

Description: Set up Sidekiq with Redis in a Rails application to run background jobs reliably with configurable queues, concurrency, and retry logic.

---

## Introduction

Sidekiq is the most popular background job processor for Ruby on Rails. It uses Redis to store job queues and is significantly more efficient than alternatives like Delayed Job because it uses threads rather than processes. This guide walks through installation, job creation, and production configuration.

## Installation

```ruby
# Gemfile
gem "sidekiq"
```

```bash
bundle install
```

## Configuration

In `config/initializers/sidekiq.rb`:

```ruby
Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end
```

Set Sidekiq as the Active Job adapter in `config/application.rb`:

```ruby
config.active_job.queue_adapter = :sidekiq
```

## Creating a Worker

```ruby
# app/workers/email_worker.rb
class EmailWorker
  include Sidekiq::Job

  sidekiq_options queue: :emails, retry: 3, backtrace: true

  def perform(user_id, subject, body)
    user = User.find(user_id)
    UserMailer.notification(user, subject, body).deliver_now
    Rails.logger.info "Email sent to #{user.email}"
  end
end
```

## Creating an Active Job

```ruby
# app/jobs/generate_report_job.rb
class GenerateReportJob < ApplicationJob
  queue_as :reports

  def perform(report_id, user_id)
    report = Report.find(report_id)
    user = User.find(user_id)
    report.generate!
    ReportMailer.ready(user, report).deliver_later
  end
end
```

## Enqueuing Jobs

```ruby
# Enqueue immediately
EmailWorker.perform_async(user.id, "Welcome!", "Thank you for signing up.")

# Enqueue with delay
EmailWorker.perform_in(5.minutes, user.id, "Follow-up", "How are you finding things?")

# Enqueue at a specific time
EmailWorker.perform_at(1.hour.from_now, user.id, "Reminder", "Don't forget your trial ends tomorrow.")

# Active Job style
GenerateReportJob.perform_later(report.id, current_user.id)
GenerateReportJob.set(wait: 10.minutes).perform_later(report.id, current_user.id)
```

## Queue Configuration

In `config/sidekiq.yml`:

```yaml
:concurrency: 10
:queues:
  - [critical, 3]
  - [emails, 2]
  - [reports, 2]
  - [default, 1]
  - [low, 1]
```

## Sidekiq Web UI

Mount the Sidekiq web dashboard in `config/routes.rb`:

```ruby
require "sidekiq/web"

Rails.application.routes.draw do
  authenticate :user, ->(u) { u.admin? } do
    mount Sidekiq::Web => "/sidekiq"
  end
end
```

## Custom Retry Logic

```ruby
class PaymentWorker
  include Sidekiq::Job

  sidekiq_options retry: 5

  sidekiq_retry_in do |count, exception|
    case exception
    when PaymentGateway::RateLimitError
      60 * (count + 1)  # Progressive backoff
    when PaymentGateway::NetworkError
      30
    else
      :kill  # Send to dead queue
    end
  end

  def perform(order_id)
    order = Order.find(order_id)
    PaymentGateway.charge(order)
    order.update!(status: :paid)
  end
end
```

## Running Sidekiq

```bash
# Start with default configuration
bundle exec sidekiq

# Start with configuration file
bundle exec sidekiq -C config/sidekiq.yml

# Start with specific queues
bundle exec sidekiq -q critical -q emails -q default
```

## Summary

Sidekiq integrates with Rails through Redis, storing jobs as JSON in Redis queues and processing them with a configurable number of threads. Jobs include `Sidekiq::Job`, define `perform(args)`, and are enqueued with `perform_async`, `perform_in`, or `perform_at`. The `config/sidekiq.yml` file controls queue priorities and worker concurrency. Sidekiq's web dashboard provides real-time visibility into queues, running jobs, retries, and failed jobs.
