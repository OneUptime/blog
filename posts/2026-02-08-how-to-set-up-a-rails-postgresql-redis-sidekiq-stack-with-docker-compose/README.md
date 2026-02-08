# How to Set Up a Rails + PostgreSQL + Redis + Sidekiq Stack with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Ruby on Rails, PostgreSQL, Redis, Sidekiq, Docker Compose, Web Development

Description: Build a complete Ruby on Rails stack with PostgreSQL, Redis, and Sidekiq background jobs using Docker Compose for consistent development.

---

Ruby on Rails applications in production typically depend on PostgreSQL for data, Redis for caching and job queues, and Sidekiq for background job processing. Setting up all four components on a developer's machine takes time and leads to version mismatches. Docker Compose bundles everything into a reproducible configuration that starts with one command. This guide builds the complete stack step by step.

## Stack Overview

The stack includes five services:

- **Rails** - the web application (Puma server)
- **PostgreSQL** - the primary database
- **Redis** - session store, cache, and Sidekiq broker
- **Sidekiq** - background job processor
- **Webpacker/esbuild** - asset compilation (for development)

## Project Structure

```
myapp/
  Dockerfile
  Dockerfile.dev
  docker-compose.yml
  docker-compose.prod.yml
  Gemfile
  Gemfile.lock
  config/
    database.yml
    cable.yml
    sidekiq.yml
    initializers/
      sidekiq.rb
  app/
    jobs/
      application_job.rb
      example_job.rb
```

## The Dockerfile

Here is a multi-stage Dockerfile for Rails:

```dockerfile
# Dockerfile - Rails application with all dependencies
FROM ruby:3.3-slim AS base

# Install system packages required for Rails and PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    nodejs \
    npm \
    git \
    curl \
    && npm install -g yarn \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Ruby gems first for better layer caching
COPY Gemfile Gemfile.lock ./
RUN bundle install --jobs 4 --retry 3

# Copy the application source code
COPY . .

# Precompile assets for production
RUN SECRET_KEY_BASE=dummy bundle exec rails assets:precompile 2>/dev/null || true

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

## Gemfile Dependencies

Ensure your Gemfile includes the necessary gems:

```ruby
# Gemfile - Key dependencies for the Docker stack
source "https://rubygems.org"

ruby "3.3.0"

gem "rails", "~> 7.1"
gem "pg", "~> 1.5"
gem "puma", "~> 6.4"
gem "redis", "~> 5.1"
gem "sidekiq", "~> 7.2"
gem "bootsnap", require: false

# Caching
gem "hiredis"
gem "connection_pool"

group :development, :test do
  gem "debug", platforms: [:mri]
  gem "rspec-rails"
  gem "factory_bot_rails"
end
```

## Docker Compose for Development

```yaml
# docker-compose.yml - Full Rails development stack
version: "3.8"

services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: myapp_development
      POSTGRES_USER: rails
      POSTGRES_PASSWORD: railspass
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rails"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - appnet

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - appnet

  web:
    build:
      context: .
      dockerfile: Dockerfile
    # Override for development: use rails server with binding for Docker
    command: bash -c "rm -f tmp/pids/server.pid && bundle exec rails server -b 0.0.0.0 -p 3000"
    volumes:
      # Mount source for live code reloading
      - .:/app
      # Use a named volume for bundle cache to speed up rebuilds
      - bundle_cache:/usr/local/bundle
    ports:
      - "3000:3000"
    environment:
      RAILS_ENV: development
      DATABASE_URL: postgres://rails:railspass@db:5432/myapp_development
      REDIS_URL: redis://redis:6379/0
      SIDEKIQ_REDIS_URL: redis://redis:6379/1
      SECRET_KEY_BASE: development-secret-key
      RAILS_LOG_TO_STDOUT: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - appnet

  sidekiq:
    build:
      context: .
      dockerfile: Dockerfile
    command: bundle exec sidekiq -C config/sidekiq.yml
    volumes:
      - .:/app
      - bundle_cache:/usr/local/bundle
    environment:
      RAILS_ENV: development
      DATABASE_URL: postgres://rails:railspass@db:5432/myapp_development
      REDIS_URL: redis://redis:6379/0
      SIDEKIQ_REDIS_URL: redis://redis:6379/1
      SECRET_KEY_BASE: development-secret-key
      RAILS_LOG_TO_STDOUT: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - appnet

volumes:
  pgdata:
  redisdata:
  bundle_cache:

networks:
  appnet:
    driver: bridge
```

## Database Configuration

Configure Rails to connect to PostgreSQL through the environment variable:

```yaml
# config/database.yml - Database configuration using environment variables
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS", 5) %>
  url: <%= ENV["DATABASE_URL"] %>

development:
  <<: *default

test:
  <<: *default
  url: <%= ENV.fetch("DATABASE_URL", "postgres://rails:railspass@db:5432/myapp_test") %>

production:
  <<: *default
```

## Redis and Cache Configuration

Configure Rails caching with Redis:

```ruby
# config/environments/development.rb - Enable Redis caching in development
# Add this inside the Rails.application.configure block:

config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL", "redis://redis:6379/0"),
  expires_in: 1.hour,
  pool_size: ENV.fetch("RAILS_MAX_THREADS", 5).to_i,
  pool_timeout: 5
}

config.session_store :cache_store, key: "_myapp_session"
```

## Sidekiq Configuration

Configure Sidekiq for background processing:

```yaml
# config/sidekiq.yml - Sidekiq worker configuration
:concurrency: 5
:timeout: 25
:queues:
  - [critical, 3]
  - [default, 2]
  - [low, 1]
:retry: 5
```

Set up the Sidekiq initializer:

```ruby
# config/initializers/sidekiq.rb - Sidekiq Redis connection configuration
Sidekiq.configure_server do |config|
  config.redis = {
    url: ENV.fetch("SIDEKIQ_REDIS_URL", "redis://redis:6379/1"),
    network_timeout: 5,
    pool_timeout: 5
  }
end

Sidekiq.configure_client do |config|
  config.redis = {
    url: ENV.fetch("SIDEKIQ_REDIS_URL", "redis://redis:6379/1"),
    network_timeout: 5,
    pool_timeout: 5
  }
end
```

Mount the Sidekiq web UI in your routes:

```ruby
# config/routes.rb - Mount Sidekiq dashboard for job monitoring
require "sidekiq/web"

Rails.application.routes.draw do
  # Protect the Sidekiq dashboard with basic authentication
  Sidekiq::Web.use Rack::Auth::Basic do |username, password|
    ActiveSupport::SecurityUtils.secure_compare(
      username, ENV.fetch("SIDEKIQ_USERNAME", "admin")
    ) & ActiveSupport::SecurityUtils.secure_compare(
      password, ENV.fetch("SIDEKIQ_PASSWORD", "password")
    )
  end

  mount Sidekiq::Web => "/sidekiq"

  # Your application routes
  root "home#index"
end
```

## Writing Background Jobs

Create jobs that Sidekiq will process:

```ruby
# app/jobs/application_job.rb - Base job class with retry configuration
class ApplicationJob < ActiveJob::Base
  # Use Sidekiq as the queue adapter
  self.queue_adapter = :sidekiq

  # Default retry behavior for all jobs
  retry_on StandardError, wait: :polynomially_longer, attempts: 5

  # Discard jobs that hit specific errors
  discard_on ActiveJob::DeserializationError
end
```

```ruby
# app/jobs/example_job.rb - Example background job for sending emails
class ExampleJob < ApplicationJob
  queue_as :default

  def perform(user_id, action)
    user = User.find(user_id)

    case action
    when "welcome_email"
      UserMailer.welcome(user).deliver_now
      Rails.logger.info("Welcome email sent to #{user.email}")
    when "cleanup"
      user.cleanup_old_data!
      Rails.logger.info("Cleaned up old data for #{user.email}")
    end
  end
end
```

```ruby
# app/jobs/scheduled_report_job.rb - Periodic job triggered by Sidekiq scheduler
class ScheduledReportJob < ApplicationJob
  queue_as :low

  def perform
    report_data = generate_report
    Rails.cache.write("daily_report", report_data, expires_in: 24.hours)
    Rails.logger.info("Daily report generated and cached")
  end

  private

  def generate_report
    {
      users_count: User.count,
      active_today: User.where("last_seen_at > ?", 24.hours.ago).count,
      generated_at: Time.current.iso8601
    }
  end
end
```

Enqueue jobs from your controllers or models:

```ruby
# Enqueue a job to run as soon as a worker is available
ExampleJob.perform_later(user.id, "welcome_email")

# Schedule a job to run in 10 minutes
ExampleJob.set(wait: 10.minutes).perform_later(user.id, "cleanup")

# Add a job to a specific queue
ExampleJob.set(queue: :critical).perform_later(user.id, "welcome_email")
```

## Running the Stack

Start everything:

```bash
# Build images and start all services
docker compose up --build -d

# Create the database and run migrations
docker compose exec web rails db:create db:migrate

# Seed the database with initial data
docker compose exec web rails db:seed

# Verify all services are running
docker compose ps
```

Your application runs at `http://localhost:3000` and the Sidekiq dashboard at `http://localhost:3000/sidekiq`.

## Common Development Commands

```bash
# Open a Rails console
docker compose exec web rails console

# Run the test suite
docker compose exec web bundle exec rspec

# Generate a new model
docker compose exec web rails generate model Article title:string body:text

# Run pending migrations
docker compose exec web rails db:migrate

# View Sidekiq worker logs
docker compose logs -f sidekiq

# Install a new gem (after editing Gemfile)
docker compose exec web bundle install
docker compose restart web sidekiq
```

## Production Docker Compose

For production, add Nginx and use environment variables for secrets:

```yaml
# docker-compose.prod.yml - Production Rails stack
version: "3.8"

services:
  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    networks:
      - appnet
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb
    volumes:
      - redisdata:/data
    networks:
      - appnet
    restart: always

  web:
    build: .
    command: bundle exec puma -C config/puma.rb
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SIDEKIQ_REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      RAILS_SERVE_STATIC_FILES: "true"
    depends_on:
      - db
      - redis
    networks:
      - appnet
    restart: always

  sidekiq:
    build: .
    command: bundle exec sidekiq -C config/sidekiq.yml
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SIDEKIQ_REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/1
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
    depends_on:
      - db
      - redis
    networks:
      - appnet
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - web
    networks:
      - appnet
    restart: always

volumes:
  pgdata:
  redisdata:

networks:
  appnet:
    driver: bridge
```

## Wrapping Up

Docker Compose turns a multi-component Rails stack into a single-command setup. PostgreSQL, Redis, Sidekiq, and the Rails server all start together with matching configurations. The development setup uses live code mounting for instant feedback, while the production setup uses Nginx and environment-based secrets. Every team member gets an identical environment, and the path from development to production uses the same Docker images. That consistency is what makes Docker Compose invaluable for Rails projects.
