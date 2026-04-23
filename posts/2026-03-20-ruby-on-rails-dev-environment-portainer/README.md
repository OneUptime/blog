# How to Set Up a Ruby on Rails Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ruby, Rails, Development Environment, Docker, Debugging, Bundler

Description: Learn how to set up a Ruby on Rails development environment with hot-reload and remote debugging support in a Docker container managed by Portainer.

---

Containerizing Rails development with Portainer standardizes Ruby versions and gem dependencies across the team. Rails' built-in code reloader and Ruby's `debug`/`rdbg` debugger provide a smooth development experience.

## Dev Environment Compose Stack

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: rails_dev
      POSTGRES_USER: rails
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rails -d rails_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  rails:
    image: ruby:3.3-slim
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "3000:3000"     # Rails server
      - "1234:1234"     # rdbg port
    environment:
      RAILS_ENV: development
      DATABASE_URL: postgresql://rails:secret@postgres:5432/rails_dev
      REDIS_URL: redis://redis:6379/0
      BUNDLE_PATH: /bundle
    volumes:
      - ./app:/app
      # Cache bundle gems
      - bundle_cache:/bundle
    working_dir: /app
    command: >
      bash -c "
        apt-get update -qq && apt-get install -y --no-install-recommends libpq-dev build-essential &&
        bundle install &&
        bundle exec rails db:create db:migrate &&
        bundle exec rdbg --open --host 0.0.0.0 --port 1234 --nonstop -c -- bundle exec rails server -b 0.0.0.0
      "

volumes:
  postgres_data:
  bundle_cache:
```

## Rails Development Configuration

```ruby
# config/environments/development.rb

Rails.application.configure do
  # Reload code on each request
  config.enable_reloading = true

  # Eager load false for faster startup
  config.eager_load = false

  # Detailed logging
  config.log_level = :debug
end
```

## Database Configuration

```yaml
# config/database.yml
development:
  adapter: postgresql
  url: <%= ENV['DATABASE_URL'] %>
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
```

## Running Rails Commands

```bash
# Via Portainer Exec console:
bundle exec rails generate model Article title:string body:text
bundle exec rails db:migrate
bundle exec rails console
bundle exec rspec  # Run tests
```

## Gemfile for Development Tools

```ruby
group :development, :test do
  gem "debug"              # Ruby 3.1+ built-in debugger
  gem "rspec-rails"        # Testing
  gem "factory_bot_rails"  # Test fixtures
  gem "rubocop-rails"      # Code style
end
```
