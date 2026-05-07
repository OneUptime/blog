# How to Use Podman for Ruby Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Ruby, Rails, Container, Development

Description: A practical guide to using Podman for Ruby development, covering gem management, Rails application workflows, Puma configuration, testing with RSpec, debugging, and multi-container stacks.

---

> Podman lets you run Ruby applications in clean, isolated containers so you never have to fight with system Ruby, conflicting gem versions, or missing native extensions again.

Ruby version management is a long-standing pain point. Tools like rbenv and rvm help, but they only manage the Ruby interpreter itself. Native extensions, system libraries, and gem conflicts can still cause issues across machines. Running Ruby inside containers sidesteps all of these problems. Each project gets its own complete environment with exactly the Ruby version and system libraries it needs. Podman makes this especially straightforward because it runs without a daemon and supports rootless containers by default.

This guide covers practical Podman workflows for Ruby development, from simple scripts to full Rails applications with background jobs and databases.

---

## Choosing a Ruby Base Image

The official Ruby images come in several variants:

```bash
# Full image - Debian-based, includes build tools for native gem extensions

podman pull docker.io/library/ruby:3.3

# Slim image - smaller, fewer pre-installed packages
podman pull docker.io/library/ruby:3.3-slim

# Alpine image - smallest, but some gems with C extensions need extra work
podman pull docker.io/library/ruby:3.3-alpine
```

For development, `ruby:3.3-slim` is a good balance. Many popular gems (like `nokogiri`, `pg`, and `mysql2`) require C compilation, so if you hit build errors with slim, switch to the full image.

## Running Ruby Code in a Container

```bash
# Run a Ruby script
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/ruby:3.3-slim \
  ruby script.rb

# Start an interactive Ruby console (irb)
podman run -it --rm \
  docker.io/library/ruby:3.3-slim \
  irb

# Run a one-liner
podman run --rm \
  docker.io/library/ruby:3.3-slim \
  ruby -e "puts RUBY_VERSION"
```

## Managing Gems with Bundler

Ruby projects use Bundler for dependency management. You want to cache gems between container runs so Bundler does not reinstall everything each time.

```bash
# Create a volume for gem caching
podman volume create gem-cache

# Install gems with caching
podman run --rm \
  -v $(pwd):/app:Z \
  -v gem-cache:/usr/local/bundle \
  -w /app \
  docker.io/library/ruby:3.3-slim \
  bundle install
```

The `/usr/local/bundle` directory is where Bundler installs gems in the official Ruby images. Mounting a named volume there keeps gems across container restarts.

## Creating a Development Containerfile

```dockerfile
FROM docker.io/library/ruby:3.3-slim

# Install system dependencies for common gems
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libsqlite3-dev \
    nodejs \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Gemfile first for dependency layer caching
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
```

Build it:

```bash
podman build -t ruby-dev .
```

## Setting Up a Rails Application

### Creating a New Rails Project

You can create a new Rails project entirely inside a container:

```bash
# Create a new Rails app
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/ruby:3.3 \
  bash -c "gem install rails && rails new myapp --database=postgresql --skip-bundle"
```

### Running an Existing Rails Project

Create a `docker-compose.yml` for Rails with PostgreSQL and Redis:

```yaml
services:
  web:
    build: .
    command: bundle exec rails server -b 0.0.0.0
    stdin_open: true
    tty: true
    ports:
      - "3000:3000"
    volumes:
      - .:/app:z
      - gem-cache:/usr/local/bundle
    environment:
      DATABASE_URL: postgres://rails:rails@db:5432/rails_dev
      REDIS_URL: redis://redis:6379/0
      RAILS_ENV: development
    depends_on:
      - db
      - redis

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: rails
      POSTGRES_PASSWORD: rails
      POSTGRES_DB: rails_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: docker.io/library/redis:7-alpine
    ports:
      - "6379:6379"

  sidekiq:
    build: .
    command: bundle exec sidekiq
    volumes:
      - .:/app:z
      - gem-cache:/usr/local/bundle
    environment:
      DATABASE_URL: postgres://rails:rails@db:5432/rails_dev
      REDIS_URL: redis://redis:6379/0
      RAILS_ENV: development
    depends_on:
      - db
      - redis

volumes:
  gem-cache:
  pgdata:
```

Current Podman releases expose Compose as `podman compose`, which uses an external provider such as `podman-compose` or `docker-compose` under the hood.

Start everything:

```bash
# Start all services
podman compose up -d

# Set up the database
podman compose exec web rails db:create
podman compose exec web rails db:migrate
podman compose exec web rails db:seed

# Open a Rails console
podman compose exec web rails console

# View logs
podman compose logs -f web
```

## Rails with Live Reloading

Rails automatically reloads code in development mode. However, file change detection across container mounts can be unreliable. Switch Rails to the non-evented file watcher in your Rails configuration:

```ruby
# config/environments/development.rb
Rails.application.configure do
  # Use the non-evented file watcher inside containers
  config.file_watcher = ActiveSupport::FileUpdateChecker
end
```

This makes Rails check watched paths instead of relying on filesystem events, which works more reliably across mount boundaries.

## Running the Rails Console

The Rails console is essential for debugging and data exploration:

```bash
# Open a Rails console
podman compose exec web rails console

# Or without compose
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v gem-cache:/usr/local/bundle \
  -w /app \
  ruby-dev \
  bundle exec rails console
```

## Running Tests

```bash
# Run the full test suite with Minitest
podman compose exec web rails test

# Run RSpec tests
podman compose exec web bundle exec rspec

# Run a specific test file
podman compose exec web bundle exec rspec spec/models/user_spec.rb

# Run tests with verbose output
podman compose exec web bundle exec rspec --format documentation

# Run tests in a standalone container
podman run --rm \
  -v $(pwd):/app:Z \
  -v gem-cache:/usr/local/bundle \
  -w /app \
  -e RAILS_ENV=test \
  ruby-dev \
  bash -c "bundle exec rails db:prepare && bundle exec rspec"
```

## Debugging Ruby in a Container

### Using Pry or IRB

Add the gems you plan to use to your Gemfile:

```ruby
# Gemfile
group :development, :test do
  gem 'debug'
  gem 'pry'
  gem 'pry-byebug'
end
```

Insert a breakpoint in your code:

```ruby
# In any Ruby file
binding.pry
```

Make sure your container runs with `-it` for interactive debugging. When using compose, keep `stdin_open: true` and `tty: true` on the service, then attach to the container:

```bash
# Attach to the web container for interactive debugging
podman attach $(podman compose ps -q web)
```

### Using the Ruby Debug Gem

Ruby 3.1+ ships the `debug` gem as a bundled gem, and adding it to your `Gemfile` keeps it available under Bundler. For remote debugging:

```bash
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v gem-cache:/usr/local/bundle \
  -w /app \
  -p 3000:3000 \
  -e RUBY_DEBUG_OPEN=true \
  -e RUBY_DEBUG_HOST=0.0.0.0 \
  -e RUBY_DEBUG_PORT=12345 \
  -p 12345:12345 \
  ruby-dev \
  bundle exec rails server -b 0.0.0.0
```

## Running Rails Tasks and Generators

Common Rails commands through Podman:

```bash
# Generate a model
podman compose exec web rails generate model User name:string email:string

# Run migrations
podman compose exec web rails db:migrate

# Generate a controller
podman compose exec web rails generate controller Api::Users index show

# Run a rake task
podman compose exec web rails assets:precompile

# Check routes
podman compose exec web rails routes
```

## Testing Against Multiple Ruby Versions

```bash
# Test with Ruby 3.1
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/ruby:3.1-slim \
  bash -c "bundle install && bundle exec rspec"

# Test with Ruby 3.2
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/ruby:3.2-slim \
  bash -c "bundle install && bundle exec rspec"

# Test with Ruby 3.3
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/ruby:3.3-slim \
  bash -c "bundle install && bundle exec rspec"
```

## Building a Production Image

```dockerfile
# Stage 1: Install gems
FROM docker.io/library/ruby:3.3-slim AS builder

RUN apt-get update && apt-get install -y \
    build-essential libpq-dev git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment true \
    && bundle config set --local without 'development test' \
    && bundle install

COPY . .
RUN SECRET_KEY_BASE=placeholder rails assets:precompile

# Stage 2: Runtime image
FROM docker.io/library/ruby:3.3-slim

RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash appuser

WORKDIR /app

COPY --from=builder /app /app
COPY --from=builder /usr/local/bundle /usr/local/bundle

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

```bash
podman build -t my-rails-app:prod -f Containerfile.prod .
podman run --rm -p 3000:3000 -e RAILS_ENV=production -e SECRET_KEY_BASE=abc123 my-rails-app:prod
```

## Conclusion

Podman provides a clean foundation for Ruby and Rails development. The essential patterns are: cache gems in a named volume mapped to `/usr/local/bundle`, use `podman compose` for the full stack (app, database, Redis, background workers), and switch Rails to the non-evented file watcher when filesystem events are unreliable across container mounts. Once set up, the experience is nearly identical to developing directly on the host, but with the guarantee that every developer and every CI run uses exactly the same environment.
