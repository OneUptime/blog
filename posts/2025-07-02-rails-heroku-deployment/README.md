# How to Deploy Rails Applications to Heroku

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ruby, Rails, Heroku, Deployment, Cloud, DevOps

Description: A comprehensive guide to deploying Ruby on Rails applications to Heroku. Learn project setup, database configuration, environment management, CI/CD pipelines, and production best practices.

---

> Heroku remains one of the simplest platforms for deploying Rails applications. With Git-based deployments, managed PostgreSQL, and automatic scaling, you can go from code to production in minutes. This guide covers everything you need to deploy and maintain production Rails apps on Heroku.

Heroku pioneered the Platform-as-a-Service (PaaS) model and continues to be a popular choice for Rails developers who want to focus on building features rather than managing infrastructure. Whether you are deploying your first app or optimizing an existing production setup, this guide will help you master Heroku deployments.

---

## Understanding Heroku Architecture

Before deploying, let's understand how Heroku works:

```mermaid
flowchart TB
    subgraph Developer
        G[Git Repository]
    end
    
    subgraph Heroku Platform
        GH[Git Receiver]
        B[Build System]
        S[Slug Compiler]
        D[Dyno Manager]
    end
    
    subgraph Runtime
        W1[Web Dyno 1]
        W2[Web Dyno 2]
        WK[Worker Dyno]
    end
    
    subgraph Add-ons
        PG[PostgreSQL]
        RD[Redis]
        MQ[Message Queue]
    end
    
    G -->|git push| GH
    GH --> B
    B --> S
    S -->|Deploy Slug| D
    D --> W1
    D --> W2
    D --> WK
    W1 --> PG
    W2 --> PG
    WK --> RD
```

Key components:
- **Git Receiver**: Accepts your code pushes
- **Build System**: Detects your app type and installs dependencies
- **Slug Compiler**: Creates a compressed, deployable package
- **Dynos**: Lightweight containers that run your application
- **Add-ons**: Managed services like PostgreSQL, Redis, and more

### Deployment Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git/GitHub
    participant Heroku as Heroku Platform
    participant Build as Build System
    participant Dyno as Dynos

    Dev->>Git: git push heroku main
    Git->>Heroku: Receive push
    Heroku->>Build: Trigger build
    Build->>Build: Detect Ruby/Rails
    Build->>Build: Install gems
    Build->>Build: Precompile assets
    Build->>Build: Create slug
    Build->>Dyno: Deploy slug
    Dyno->>Dyno: Run release tasks
    Dyno->>Dyno: Start web processes
    Dyno-->>Dev: Deployment complete
```

---

## Prerequisites

Before you begin, ensure you have:

1. **Ruby and Rails installed** (matching your project version)
2. **Git installed** and configured
3. **Heroku CLI installed**
4. **A Heroku account** (free tier available)

### Installing Heroku CLI

```bash
# macOS (using Homebrew)
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh

# Windows (using installer)
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Verify installation
heroku --version
```

### Authenticate with Heroku

```bash
# Login to Heroku (opens browser)
heroku login

# Or login via CLI only (useful for CI/CD)
heroku login -i
```

---

## Preparing Your Rails Application

### Required Configuration Files

Your Rails app needs several files for Heroku deployment:

#### 1. Gemfile Updates

```ruby
# Gemfile

source 'https://rubygems.org'

# Specify Ruby version for Heroku
ruby '3.2.2'

# Rails framework
gem 'rails', '~> 7.1.0'

# Use PostgreSQL as the database (required for Heroku)
gem 'pg', '~> 1.5'

# Web server - Puma is the default and recommended
gem 'puma', '~> 6.4'

# Asset pipeline
gem 'sprockets-rails'

# JavaScript bundling
gem 'jsbundling-rails'

# CSS bundling  
gem 'cssbundling-rails'

# Reduces boot times through caching
gem 'bootsnap', require: false

group :production do
  # Better logging for Heroku
  gem 'rails_12factor', '~> 0.0.3'
end

group :development, :test do
  # Debugging tools
  gem 'debug', platforms: %i[mri windows]
  
  # Testing framework
  gem 'rspec-rails', '~> 6.1'
  
  # Environment variables
  gem 'dotenv-rails'
end
```

#### 2. Database Configuration

```yaml
# config/database.yml

default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: myapp_development

test:
  <<: *default
  database: myapp_test

production:
  <<: *default
  # Heroku sets DATABASE_URL automatically
  url: <%= ENV['DATABASE_URL'] %>
```

#### 3. Puma Configuration

```ruby
# config/puma.rb

# Puma configuration for Heroku

# Thread pool size
# Workers process requests, threads handle concurrent requests per worker
max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# Worker timeout for boot
worker_timeout 3600 if ENV.fetch("RAILS_ENV", "development") == "development"

# Port binding
port ENV.fetch("PORT") { 3000 }

# Environment
environment ENV.fetch("RAILS_ENV") { "development" }

# PID file location
pidfile ENV.fetch("PIDFILE") { "tmp/pids/server.pid" }

# Number of worker processes (for production)
# Heroku recommends 2-4 workers for standard dynos
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

# Preload app for faster worker boot (Copy-on-Write friendly)
preload_app!

# Worker boot hook - reconnect to database after forking
on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

# Allow puma to be restarted by 'bin/rails restart'
plugin :tmp_restart
```

#### 4. Procfile

The Procfile tells Heroku how to run your application:

```procfile
# Procfile

# Web process - handles HTTP requests
web: bundle exec puma -C config/puma.rb

# Worker process - handles background jobs (optional)
worker: bundle exec sidekiq -C config/sidekiq.yml

# Release phase - runs after build, before deploy
release: bundle exec rails db:migrate
```

#### 5. Environment Variables

Create a `.env` file for local development (never commit this):

```bash
# .env (add to .gitignore)

# Rails configuration
RAILS_ENV=development
RAILS_MAX_THREADS=5

# Database
DATABASE_URL=postgres://localhost/myapp_development

# Secret key base (generate with: rails secret)
SECRET_KEY_BASE=your_secret_key_here

# External services
REDIS_URL=redis://localhost:6379/0
```

---

## Creating and Configuring Your Heroku App

### Create the Application

```bash
# Navigate to your Rails project
cd your-rails-app

# Create a new Heroku app
heroku create your-app-name

# Or let Heroku generate a name
heroku create

# View your app info
heroku info
```

### Configure Git Remote

```bash
# Verify Heroku remote was added
git remote -v

# Output should show:
# heroku  https://git.heroku.com/your-app-name.git (fetch)
# heroku  https://git.heroku.com/your-app-name.git (push)

# If not, add it manually
heroku git:remote -a your-app-name
```

### Set Environment Variables

```bash
# Set Rails environment
heroku config:set RAILS_ENV=production

# Generate and set secret key base
heroku config:set SECRET_KEY_BASE=$(rails secret)

# Set Rails master key (if using credentials)
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key)

# Configure asset compilation
heroku config:set RAILS_SERVE_STATIC_FILES=true
heroku config:set RAILS_LOG_TO_STDOUT=true

# View all config vars
heroku config
```

### Add PostgreSQL Database

```bash
# Add PostgreSQL add-on (hobby-dev is free)
heroku addons:create heroku-postgresql:essential-0

# Or for production (paid plans)
heroku addons:create heroku-postgresql:standard-0

# View database info
heroku pg:info

# DATABASE_URL is automatically set
heroku config:get DATABASE_URL
```

---

## Deploying Your Application

### Initial Deployment

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main

# Or if using 'master' branch
git push heroku master
```

### Deployment Output

```mermaid
flowchart TD
    A[git push heroku main] --> B[Detecting Ruby]
    B --> C[Installing Bundler]
    C --> D[Bundle Install]
    D --> E[Installing Node.js]
    E --> F[Yarn Install]
    F --> G[Asset Precompilation]
    G --> H[Creating Slug]
    H --> I[Running Release Phase]
    I --> J[Deploying to Dynos]
    J --> K[Launch Complete]
```

### Run Database Migrations

```bash
# Migrations run automatically if defined in Procfile release phase
# Or run manually:
heroku run rails db:migrate

# Seed the database (if needed)
heroku run rails db:seed
```

### Verify Deployment

```bash
# Open your app in browser
heroku open

# View application logs
heroku logs --tail

# Check dyno status
heroku ps
```

---

## Managing Dynos

### Understanding Dyno Types

```mermaid
flowchart LR
    subgraph Dyno Types
        E[Eco/Basic] --> |"$5-7/mo"| E1[Dev/Staging]
        S[Standard-1X] --> |"$25/mo"| S1[Small Production]
        S2[Standard-2X] --> |"$50/mo"| S2a[Medium Production]
        P[Performance-M] --> |"$250/mo"| P1[High Traffic]
        P2[Performance-L] --> |"$500/mo"| P2a[Enterprise]
    end
```

### Scaling Dynos

```bash
# Scale web dynos
heroku ps:scale web=2

# Scale worker dynos
heroku ps:scale worker=1

# View current scale
heroku ps

# Scale to zero (stop app)
heroku ps:scale web=0

# Resize dyno type
heroku ps:type web=standard-2x
```

### Dyno Management Commands

```bash
# Restart all dynos
heroku restart

# Restart specific dyno
heroku restart web.1

# Run one-off dyno for tasks
heroku run rails console

# Run bash shell
heroku run bash

# Run rake tasks
heroku run rake task_name
```

---

## Database Management

### PostgreSQL Commands

```bash
# View database info
heroku pg:info

# Access PostgreSQL console
heroku pg:psql

# Create database backup
heroku pg:backups:capture

# Schedule automatic backups
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/New_York'

# List backups
heroku pg:backups

# Download backup
heroku pg:backups:download

# Restore from backup
heroku pg:backups:restore b001 DATABASE_URL
```

### Database Migration Best Practices

```ruby
# db/migrate/20240101000000_add_index_safely.rb

# Use disable_ddl_transaction for non-blocking index creation
class AddIndexSafely < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def change
    # CONCURRENTLY prevents table locks during index creation
    add_index :users, :email, algorithm: :concurrently
  end
end
```

```ruby
# db/migrate/20240102000000_add_column_with_default.rb

# Add columns safely in production
class AddColumnSafely < ActiveRecord::Migration[7.1]
  def change
    # PostgreSQL 11+ adds columns with defaults without rewriting table
    add_column :users, :status, :string, default: 'active', null: false
  end
end
```

### Database Connection Pooling

```yaml
# config/database.yml

production:
  <<: *default
  url: <%= ENV['DATABASE_URL'] %>
  # Connection pool should match or exceed thread count
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  # Reaping frequency for dead connections
  reaping_frequency: 10
  # Checkout timeout
  checkout_timeout: 5
```

---

## Adding Redis and Background Jobs

### Add Redis Add-on

```bash
# Add Redis (mini plan is free-tier alternative)
heroku addons:create heroku-redis:mini

# View Redis info
heroku redis:info

# Access Redis CLI
heroku redis:cli
```

### Configure Sidekiq

```ruby
# Gemfile
gem 'sidekiq', '~> 7.2'
gem 'redis', '~> 5.1'
```

```ruby
# config/initializers/sidekiq.rb

# Configure Sidekiq for Heroku Redis

Sidekiq.configure_server do |config|
  config.redis = { 
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }
  }
end

Sidekiq.configure_client do |config|
  config.redis = { 
    url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
    ssl_params: { verify_mode: OpenSSL::SSL::VERIFY_NONE }
  }
end
```

```yaml
# config/sidekiq.yml

:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY") { 10 } %>
:queues:
  - [critical, 3]
  - [default, 2]
  - [low, 1]
```

Update your Procfile:

```procfile
# Procfile
web: bundle exec puma -C config/puma.rb
worker: bundle exec sidekiq -C config/sidekiq.yml
release: bundle exec rails db:migrate
```

### Scale Worker Dynos

```bash
# Add worker dyno
heroku ps:scale worker=1

# Monitor worker
heroku logs --tail --dyno worker
```

---

## Asset Pipeline Configuration

### Precompilation Settings

```ruby
# config/environments/production.rb

Rails.application.configure do
  # Serve static files from /public
  config.public_file_server.enabled = ENV['RAILS_SERVE_STATIC_FILES'].present?
  
  # Compress assets
  config.assets.css_compressor = :sass
  config.assets.js_compressor = :terser
  
  # Generate digests for asset URLs
  config.assets.digest = true
  
  # Compile assets if precompilation missed something
  config.assets.compile = false
  
  # Asset host (optional CDN)
  # config.asset_host = 'https://cdn.example.com'
end
```

### Node.js and Yarn Setup

```bash
# Heroku needs to know about Node.js for asset compilation
# Add Node.js buildpack before Ruby buildpack
heroku buildpacks:add --index 1 heroku/nodejs

# View buildpack order
heroku buildpacks
```

```json
// package.json
{
  "name": "your-app",
  "private": true,
  "engines": {
    "node": "20.x",
    "yarn": "1.x"
  },
  "scripts": {
    "build": "esbuild app/javascript/*.* --bundle --sourcemap --outdir=app/assets/builds",
    "build:css": "sass ./app/assets/stylesheets/application.scss:./app/assets/builds/application.css"
  },
  "dependencies": {
    "esbuild": "^0.19.0"
  }
}
```

---

## Environment and Configuration Management

### Managing Multiple Environments

```mermaid
flowchart TB
    subgraph Environments
        D[Development] --> |Local| DL[localhost:3000]
        S[Staging] --> |Heroku| SH[staging-app.herokuapp.com]
        P[Production] --> |Heroku| PH[prod-app.herokuapp.com]
    end
    
    subgraph Pipeline
        D --> |Promote| S
        S --> |Promote| P
    end
```

### Create Staging Environment

```bash
# Create staging app
heroku create your-app-staging --remote staging

# Add PostgreSQL to staging
heroku addons:create heroku-postgresql:essential-0 --remote staging

# Set staging-specific config
heroku config:set RAILS_ENV=production --remote staging
heroku config:set APP_ENV=staging --remote staging

# Deploy to staging
git push staging main
```

### Heroku Pipelines

```bash
# Create a pipeline
heroku pipelines:create your-app-pipeline

# Add apps to pipeline
heroku pipelines:add your-app-pipeline --app your-app-staging --stage staging
heroku pipelines:add your-app-pipeline --app your-app-production --stage production

# Promote from staging to production
heroku pipelines:promote --app your-app-staging
```

### Review Apps

```json
// app.json - Configure review apps
{
  "name": "Your Rails App",
  "description": "A Rails application",
  "keywords": ["rails", "ruby"],
  "formation": {
    "web": {
      "quantity": 1,
      "size": "eco"
    }
  },
  "addons": [
    {
      "plan": "heroku-postgresql:essential-0"
    }
  ],
  "buildpacks": [
    { "url": "heroku/nodejs" },
    { "url": "heroku/ruby" }
  ],
  "environments": {
    "review": {
      "scripts": {
        "postdeploy": "bundle exec rails db:migrate db:seed"
      },
      "addons": [
        "heroku-postgresql:essential-0"
      ]
    }
  }
}
```

---

## CI/CD with GitHub Actions

### Automated Deployment Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy to Heroku

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  RUBY_VERSION: 3.2.2
  NODE_VERSION: 20

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: ${{ env.RUBY_VERSION }}
          bundler-cache: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'yarn'
      
      - name: Install dependencies
        run: |
          yarn install --frozen-lockfile
          bundle install --jobs 4 --retry 3
      
      - name: Setup database
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
        run: |
          bundle exec rails db:create db:schema:load
      
      - name: Run tests
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
        run: |
          bundle exec rspec --format progress
      
      - name: Run linters
        run: |
          bundle exec rubocop --parallel

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Staging
        uses: akhileshns/heroku-deploy@v3.13.15
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: your-app-staging
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
      
      - name: Run staging smoke tests
        run: |
          curl -f https://your-app-staging.herokuapp.com/health || exit 1

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://your-app-production.herokuapp.com
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Production
        uses: akhileshns/heroku-deploy@v3.13.15
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: your-app-production
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
```

### GitHub Secrets Setup

```bash
# Generate Heroku API key
heroku auth:token

# Add to GitHub repository secrets:
# HEROKU_API_KEY: your-heroku-api-token
# HEROKU_EMAIL: your-heroku-email@example.com
```

---

## Health Checks and Monitoring

### Health Check Endpoint

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # Health check endpoint for Heroku and load balancers
  get '/health', to: 'health#show'
  
  # More detailed status endpoint (protected)
  get '/status', to: 'health#status'
end
```

```ruby
# app/controllers/health_controller.rb

class HealthController < ApplicationController
  # Skip authentication for health checks
  skip_before_action :authenticate_user!, if: -> { defined?(authenticate_user!) }
  
  # Basic health check - just returns OK
  def show
    render json: { status: 'ok', timestamp: Time.current.iso8601 }
  end
  
  # Detailed status check with dependencies
  def status
    checks = {
      database: check_database,
      redis: check_redis,
      sidekiq: check_sidekiq
    }
    
    overall_status = checks.values.all? { |c| c[:status] == 'ok' } ? 'ok' : 'degraded'
    
    render json: {
      status: overall_status,
      timestamp: Time.current.iso8601,
      version: ENV.fetch('HEROKU_RELEASE_VERSION', 'unknown'),
      checks: checks
    }
  end
  
  private
  
  def check_database
    ActiveRecord::Base.connection.execute('SELECT 1')
    { status: 'ok', latency_ms: measure_latency { ActiveRecord::Base.connection.execute('SELECT 1') } }
  rescue StandardError => e
    { status: 'error', error: e.message }
  end
  
  def check_redis
    return { status: 'skipped' } unless defined?(Redis)
    
    redis = Redis.new(url: ENV['REDIS_URL'])
    redis.ping
    { status: 'ok', latency_ms: measure_latency { redis.ping } }
  rescue StandardError => e
    { status: 'error', error: e.message }
  end
  
  def check_sidekiq
    return { status: 'skipped' } unless defined?(Sidekiq)
    
    stats = Sidekiq::Stats.new
    {
      status: 'ok',
      processed: stats.processed,
      failed: stats.failed,
      busy: stats.workers_size,
      queues: stats.queues
    }
  rescue StandardError => e
    { status: 'error', error: e.message }
  end
  
  def measure_latency
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    yield
    ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round(2)
  end
end
```

### Heroku Metrics and Logging

```bash
# View real-time logs
heroku logs --tail

# Filter by process type
heroku logs --tail --dyno web

# Filter by source
heroku logs --tail --source app

# View router logs
heroku logs --tail --source heroku --dyno router
```

### Log Drain to External Services

```bash
# Add log drain for external logging (Papertrail, Loggly, etc.)
heroku drains:add https://logs.example.com/heroku --app your-app

# List log drains
heroku drains

# Remove a drain
heroku drains:remove https://logs.example.com/heroku
```

---

## Performance Optimization

### Memory Management

```ruby
# config/initializers/memory_management.rb

# Tune Ruby garbage collection for Heroku
if ENV['RAILS_ENV'] == 'production'
  # Reduce memory usage with these GC settings
  ENV['MALLOC_ARENA_MAX'] = '2'
  
  # Ruby GC tuning
  ENV['RUBY_GC_HEAP_INIT_SLOTS'] ||= '600000'
  ENV['RUBY_GC_HEAP_FREE_SLOTS_MIN_RATIO'] ||= '0.20'
  ENV['RUBY_GC_HEAP_FREE_SLOTS_GOAL_RATIO'] ||= '0.40'
  ENV['RUBY_GC_HEAP_FREE_SLOTS_MAX_RATIO'] ||= '0.65'
  ENV['RUBY_GC_HEAP_GROWTH_MAX_SLOTS'] ||= '300000'
  ENV['RUBY_GC_HEAP_GROWTH_FACTOR'] ||= '1.25'
end
```

### Response Compression

```ruby
# config/application.rb

module YourApp
  class Application < Rails::Application
    # Enable gzip compression
    config.middleware.use Rack::Deflater
    
    # Or insert at specific position
    config.middleware.insert_after ActionDispatch::Static, Rack::Deflater
  end
end
```

### Caching Configuration

```ruby
# config/environments/production.rb

Rails.application.configure do
  # Use Redis for caching if available
  if ENV['REDIS_URL']
    config.cache_store = :redis_cache_store, {
      url: ENV['REDIS_URL'],
      expires_in: 1.hour,
      namespace: 'cache',
      error_handler: -> (method:, returning:, exception:) {
        Rails.logger.error("Redis cache error: #{exception}")
      }
    }
  else
    config.cache_store = :memory_store, { size: 64.megabytes }
  end
  
  # Enable fragment caching
  config.action_controller.perform_caching = true
end
```

### Database Query Optimization

```ruby
# app/models/application_record.rb

class ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true
  
  # Log slow queries
  if Rails.env.production?
    ActiveSupport::Notifications.subscribe('sql.active_record') do |_, start, finish, _, payload|
      duration = (finish - start) * 1000
      
      if duration > 100 # Log queries over 100ms
        Rails.logger.warn("SLOW QUERY (#{duration.round}ms): #{payload[:sql]}")
      end
    end
  end
end
```

---

## Security Best Practices

### SSL/TLS Configuration

```ruby
# config/environments/production.rb

Rails.application.configure do
  # Force SSL in production
  config.force_ssl = true
  
  # HSTS settings
  config.ssl_options = {
    hsts: {
      expires: 1.year,
      subdomains: true,
      preload: true
    }
  }
end
```

### Secure Headers

```ruby
# config/initializers/secure_headers.rb

# Install: gem 'secure_headers'

SecureHeaders::Configuration.default do |config|
  config.x_frame_options = "DENY"
  config.x_content_type_options = "nosniff"
  config.x_xss_protection = "1; mode=block"
  config.referrer_policy = %w[strict-origin-when-cross-origin]
  
  config.csp = {
    default_src: %w['self'],
    script_src: %w['self' 'unsafe-inline'],
    style_src: %w['self' 'unsafe-inline'],
    img_src: %w['self' data: https:],
    font_src: %w['self' data:],
    connect_src: %w['self'],
    frame_ancestors: %w['none']
  }
end
```

### Environment Variable Security

```bash
# Never commit sensitive data to git
# Use Heroku config vars for secrets

# Set sensitive variables
heroku config:set SECRET_KEY_BASE=$(rails secret)
heroku config:set API_KEY=your-secret-api-key

# Use Rails credentials for complex secrets
EDITOR="code --wait" rails credentials:edit

# Set master key on Heroku
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key)
```

---

## Maintenance and Operations

### Maintenance Mode

```bash
# Enable maintenance mode
heroku maintenance:on

# Perform maintenance tasks
heroku run rails db:migrate
heroku run rails some:maintenance:task

# Disable maintenance mode
heroku maintenance:off
```

### Rolling Deploys

```bash
# Enable preboot for zero-downtime deploys
heroku features:enable preboot

# Check preboot status
heroku features
```

### Database Maintenance

```bash
# View database stats
heroku pg:info

# Run VACUUM ANALYZE
heroku pg:psql -c "VACUUM ANALYZE;"

# Check for long-running queries
heroku pg:ps

# Kill a long-running query
heroku pg:kill <pid>

# Check bloat
heroku pg:bloat
```

### Troubleshooting Commands

```bash
# Application issues
heroku logs --tail
heroku ps
heroku releases
heroku releases:info v123

# Rollback to previous release
heroku rollback v122

# Database issues
heroku pg:diagnose
heroku pg:info
heroku pg:psql

# Memory issues
heroku logs --tail | grep "memory quota"

# Run console for debugging
heroku run rails console
```

---

## Deployment Checklist

### Pre-Deployment

```markdown
## Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Database migrations are reversible
- [ ] Environment variables are configured
- [ ] Assets compile without errors
- [ ] Ruby version matches Gemfile
- [ ] Node.js version matches package.json
- [ ] Security vulnerabilities addressed (bundle audit)
```

### Deployment Flow

```mermaid
flowchart TD
    A[Create Feature Branch] --> B[Develop and Test Locally]
    B --> C[Create Pull Request]
    C --> D[CI Pipeline Runs]
    D --> E{Tests Pass?}
    E -->|No| B
    E -->|Yes| F[Code Review]
    F --> G[Merge to Main]
    G --> H[Auto-Deploy to Staging]
    H --> I[QA Testing]
    I --> J{QA Approved?}
    J -->|No| B
    J -->|Yes| K[Promote to Production]
    K --> L[Monitor Metrics]
    L --> M{Issues Detected?}
    M -->|Yes| N[Rollback]
    M -->|No| O[Complete]
```

### Post-Deployment

```markdown
## Post-Deployment Checklist

- [ ] Application loads correctly
- [ ] Health check endpoint responds
- [ ] Critical user flows work
- [ ] Background jobs processing
- [ ] No new errors in logs
- [ ] Performance metrics normal
- [ ] Database connections healthy
```

---

## Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| H10 (App crashed) | Application immediately crashes | Check `heroku logs` for errors, ensure Procfile is correct |
| H12 (Request timeout) | Requests take > 30 seconds | Optimize slow queries, use background jobs |
| H14 (No web dynos) | No dynos running | Scale web dynos: `heroku ps:scale web=1` |
| R14 (Memory quota) | Memory exceeded | Reduce workers, optimize memory, upgrade dyno |
| Asset compilation fails | Missing assets in production | Check buildpack order, precompile locally to test |
| Database connection errors | Pool exhausted | Increase pool size, check for connection leaks |
| Slow cold starts | First request very slow | Enable preboot, optimize initialization |

### Debugging Commands

```bash
# View dyno memory usage
heroku ps --json | jq '.[] | {dyno: .name, memory: .memory}'

# View release history
heroku releases

# Compare releases
heroku releases:info v123
heroku releases:info v122

# Check slug size
heroku slugs:info

# View buildpack detected
heroku buildpacks
```

---

## Summary

Deploying Rails applications to Heroku is straightforward once you understand the key concepts:

1. **Configure your app** with proper Gemfile, database.yml, Puma config, and Procfile
2. **Set environment variables** securely using `heroku config:set`
3. **Use PostgreSQL** as your primary database (required by Heroku)
4. **Add Redis and Sidekiq** for background job processing
5. **Implement CI/CD** with GitHub Actions for automated deployments
6. **Monitor your app** with health checks, logging, and metrics
7. **Scale appropriately** using dyno formation and autoscaling
8. **Follow security best practices** with SSL, secure headers, and credential management

Heroku handles the infrastructure complexity, allowing you to focus on building great features for your users.

---

*Need comprehensive monitoring for your Heroku applications? [OneUptime](https://oneuptime.com) provides uptime monitoring, status pages, and incident management that integrates seamlessly with your Heroku deployment pipeline.*
