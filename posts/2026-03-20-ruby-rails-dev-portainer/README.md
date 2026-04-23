# How to Set Up a Ruby on Rails Development Environment with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Ruby, Rails, Development, PostgreSQL, Redis

Description: Build a complete Ruby on Rails development environment with live-reload, debugging, and full services stack using Docker and Portainer.

## Introduction

Rails development benefits enormously from containerization - you get the exact Ruby version, all gem dependencies, and supporting services in a reproducible environment. This guide covers deploying a full Rails development stack with PostgreSQL, Redis, Sidekiq, and Action Cable support using Portainer.

## Step 1: Create the Rails Development Dockerfile

```dockerfile
# Dockerfile.dev - Ruby on Rails development

FROM ruby:3.3-alpine

# Install system dependencies
RUN apk add --no-cache \
    # Build tools
    build-base \
    git \
    curl \
    bash \
    # Database clients
    postgresql-dev \
    # Image processing
    imagemagick \
    # For nokogiri
    libxml2-dev \
    libxslt-dev \
    # Node.js for assets
    nodejs \
    npm \
    # Yarn
    yarn

# Set working directory
WORKDIR /app

# Configure Bundler
ENV BUNDLE_PATH=/bundle
ENV BUNDLE_JOBS=4
ENV BUNDLE_RETRY=3
ENV RAILS_ENV=development
ENV NODE_ENV=development

# Copy Gemfile for dependency caching
COPY Gemfile Gemfile.lock ./

# Install gems (cached layer)
RUN bundle install

# Install foreman for running multiple processes
RUN gem install foreman

# Rails server
EXPOSE 3000

# Action Cable (if separate)
EXPOSE 3001
```

## Step 2: Deploy Rails Stack in Portainer

```yaml
# docker-compose.yml - Rails Development Stack

networks:
  rails_dev:
    driver: bridge

volumes:
  bundle_gems:
  postgres_data:
  redis_data:
  node_modules:

services:
  # Rails web application
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: rails_web
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - RAILS_ENV=development
      - DATABASE_URL=postgresql://rails:rails_password@postgres:5432/myapp_development
      - REDIS_URL=redis://redis:6379/0
      - BOOTSNAP_CACHE_DIR=/bundle/bootsnap
      - WEB_CONCURRENCY=1
      - RAILS_SERVE_STATIC_FILES=true
    volumes:
      # Mount source code
      - .:/app
      # Cache gems between rebuilds
      - bundle_gems:/bundle
      # Cache node modules
      - node_modules:/app/node_modules
    command: >
      bash -c "
        bundle exec rails db:prepare &&
        bundle exec rails server -b 0.0.0.0 -p 3000
      "
    networks:
      - rails_dev
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    container_name: rails_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=myapp_development
      - POSTGRES_USER=rails
      - POSTGRES_PASSWORD=rails_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rails_dev
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rails -d myapp_development"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis for Action Cable and Sidekiq
  redis:
    image: redis:7-alpine
    container_name: rails_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - rails_dev
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Sidekiq background worker
  sidekiq:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: rails_sidekiq
    restart: unless-stopped
    command: bundle exec sidekiq -C config/sidekiq.yml
    environment:
      - RAILS_ENV=development
      - DATABASE_URL=postgresql://rails:rails_password@postgres:5432/myapp_development
      - REDIS_URL=redis://redis:6379/0
    volumes:
      - .:/app
      - bundle_gems:/bundle
    networks:
      - rails_dev
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  # Mailcatcher for email testing
  mailcatcher:
    image: sj26/mailcatcher:latest
    container_name: rails_mailcatcher
    restart: unless-stopped
    ports:
      - "1025:1025"  # SMTP
      - "1080:1080"  # Web UI
    networks:
      - rails_dev
```

## Step 3: Rails Configuration

```yaml
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000

development:
  <<: *default
  url: <%= ENV.fetch("DATABASE_URL") { "postgresql://rails:rails_password@postgres:5432/myapp_development" } %>

test:
  <<: *default
  url: <%= ENV.fetch("TEST_DATABASE_URL") { "postgresql://rails:rails_password@postgres:5432/myapp_test" } %>

production:
  <<: *default
  url: <%= ENV['DATABASE_URL'] %>
```

```yaml
# config/cable.yml
development:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") { "redis://redis:6379/0" } %>
  channel_prefix: myapp_development

test:
  adapter: test

production:
  adapter: redis
  url: <%= ENV['REDIS_URL'] %>
  channel_prefix: myapp_production
```

```ruby
# config/environments/development.rb
Rails.application.configure do
  # Enable hot-reload
  config.enable_reloading = true

  # Don't eager load in dev
  config.eager_load = false

  # Show full error reports
  config.consider_all_requests_local = true

  # Enable Server-Timing metrics in development
  config.server_timing = true

  # Configure Action Cable for development
  config.action_cable.url = "ws://localhost:3000/cable"
  config.action_cable.allowed_request_origins = [
    "http://localhost:3000",
    /http:\/\/localhost:\d+/
  ]

  # Configure mailer for Mailcatcher
  config.action_mailer.delivery_method = :smtp
  config.action_mailer.smtp_settings = {
    address: 'mailcatcher',
    port: 1025
  }
end
```

## Step 4: Common Rails Commands

```bash
# Generate a new resource
docker exec rails_web bundle exec rails generate scaffold User name:string email:string

# Run migrations
docker exec rails_web bundle exec rails db:migrate

# Rollback migrations
docker exec rails_web bundle exec rails db:rollback STEP=1

# Rails console
docker exec -it rails_web bundle exec rails console

# Run tests
docker exec rails_web bundle exec rspec

# Run system tests (requires Selenium - add to compose)
docker exec rails_web bundle exec rails test:system

# Assets precompile
docker exec rails_web bundle exec rails assets:precompile

# Install new gem (update Gemfile first)
docker exec rails_web bundle install
docker compose -f docker-compose.yml restart web
```

## Step 5: Add RSpec and Factory Bot

```ruby
# Gemfile - Testing gems
group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'faker'
  gem 'pry-rails'
  gem 'pry-byebug'
end
```

```bash
# Install the new test gems
docker exec rails_web bundle install

# Install RSpec
docker exec rails_web bundle exec rails generate rspec:install

# Run tests with documentation format
docker exec rails_web bundle exec rspec --format documentation
```

## Step 6: Sidekiq Configuration

```ruby
# Gemfile - Background jobs
gem 'sidekiq'
```

```bash
# Install Sidekiq
docker exec rails_web bundle install
```

```yaml
# config/sidekiq.yml
:concurrency: 5
:queues:
  - [critical, 3]
  - [default, 2]
  - [low, 1]
```

```ruby
# config/initializers/sidekiq.rb
Sidekiq.configure_server do |config|
  config.redis = { url: ENV['REDIS_URL'] }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV['REDIS_URL'] }
end
```

## Conclusion

Your Ruby on Rails development environment is now fully containerized and managed through Portainer. The setup includes hot-reload for rapid development, Sidekiq for background jobs, Action Cable for WebSockets via Redis, and Mailcatcher to inspect outgoing emails. Portainer makes it easy to view logs from all services, restart Sidekiq when you add new jobs, and monitor overall resource usage of your Rails stack.
