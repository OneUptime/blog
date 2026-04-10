# How to Use Resque with Redis in Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby On Rail, Resque, Background Job, Ruby

Description: Set up Resque with Redis in a Rails application to process background jobs in separate worker processes with a built-in web dashboard.

---

## Introduction

Resque is a Redis-backed Ruby library for creating background jobs. Unlike Sidekiq, Resque uses separate processes (one per worker) rather than threads, making it more isolated but more memory-intensive. This guide covers installation, job creation, enqueuing, and running workers.

## Installation

```ruby
# Gemfile
gem "resque"
```

```bash
bundle install
```

## Configuration

Create `config/initializers/resque.rb`:

```ruby
require "resque"

Resque.redis = ENV.fetch("REDIS_URL", "redis://localhost:6379/0")

# Set the namespace so Resque keys are isolated
Resque.redis.namespace = "resque:myapp"
```

## Creating a Resque Job

```ruby
# app/jobs/email_delivery_job.rb
class EmailDeliveryJob
  @queue = :emails

  def self.perform(user_id, template, variables = {})
    user = User.find(user_id)
    UserMailer.send(template, user, variables).deliver_now
    Rails.logger.info "Email #{template} delivered to #{user.email}"
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error "User #{user_id} not found: #{e.message}"
  end
end
```

```ruby
# app/jobs/report_generation_job.rb
class ReportGenerationJob
  @queue = :reports

  def self.perform(report_id)
    report = Report.find(report_id)
    report.generate!
    report.update!(status: :ready)
  end
end
```

## Enqueuing Jobs

```ruby
# Enqueue immediately
Resque.enqueue(EmailDeliveryJob, user.id, :welcome)

# Enqueue to a specific queue
Resque.enqueue_to(:high_priority, EmailDeliveryJob, user.id, :urgent)
```

## Enqueuing from Controllers

```ruby
class RegistrationsController < ApplicationController
  def create
    user = User.create!(user_params)

    # Enqueue background email
    Resque.enqueue(EmailDeliveryJob, user.id, :welcome)

    render json: { message: "Registered", user_id: user.id }
  end
end

class ReportsController < ApplicationController
  def generate
    report = Report.create!(user: current_user)
    Resque.enqueue(ReportGenerationJob, report.id)
    render json: { report_id: report.id, status: "queued" }
  end
end
```

## Rake Task for Workers

Create `lib/tasks/resque.rake`:

```ruby
require "resque/tasks"

task "resque:setup" => :environment do
  ENV["QUEUE"] ||= "*"
end
```

## Running Workers

```bash
# Process all queues
QUEUE=* bundle exec rake resque:work

# Process specific queues with priority
QUEUES=critical,emails,reports,default bundle exec rake resque:work

# Run multiple workers
COUNT=3 QUEUE=* bundle exec rake resque:workers
```

## Resque Web Dashboard

Mount the Resque web UI in `config/routes.rb`:

```ruby
require "resque/server"

Rails.application.routes.draw do
  authenticate :user, ->(u) { u.admin? } do
    mount Resque::Server, at: "/resque"
  end
end
```

## Job with Hooks

```ruby
class NotificationJob
  @queue = :notifications

  def self.before_perform_log(user_id, type)
    Rails.logger.info "Starting notification job for user #{user_id}"
  end

  def self.after_perform_log(user_id, type)
    Rails.logger.info "Notification job complete for user #{user_id}"
  end

  def self.perform(user_id, type)
    user = User.find(user_id)
    Notification.create!(user: user, notification_type: type)
  end
end
```

## Checking Queue Status

```ruby
# In a Rails console or monitoring endpoint
def queue_info
  {
    queues: Resque.queues,
    workers: Resque.workers.count,
    working: Resque::Worker.working.count,
    failed: Resque::Failure.count,
    queue_sizes: Resque.queues.each_with_object({}) do |q, h|
      h[q] = Resque.size(q)
    end
  }
end
```

## Summary

Resque provides process-based background job processing in Rails backed by Redis. Jobs are plain Ruby classes with a `@queue` class variable and a `self.perform` class method. Enqueuing with `Resque.enqueue` pushes a JSON payload to Redis, and worker processes (`QUEUE=* rake resque:work`) pull and execute jobs. The built-in web interface at `/resque` shows queue depths, running workers, and failed jobs for easy monitoring.
