# How to Deploy a Rails + PostgreSQL Stack via Portainer - Postgres

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ruby On Rail, PostgreSQL, Ruby, Docker Compose, Web Framework

Description: Deploy a Ruby on Rails application with PostgreSQL using Docker Compose through Portainer, with database migrations, Active Storage, Action Cable WebSocket support, and Sidekiq workers.

## Introduction

Ruby on Rails is a convention-over-configuration web framework that pairs naturally with PostgreSQL. Deploying Rails via Portainer using Docker Compose gives you an isolated, reproducible environment with all services - web server, database, Redis for Action Cable (and caching if your app is configured for it), and a Sidekiq worker for background jobs - managed from a single interface.

## Prerequisites

- Portainer CE or BE with Docker Engine 20.10+
- A Rails 7.1+ application or willingness to create one
- Basic understanding of Rails conventions

## Step 1: Prepare the Rails Dockerfile

```dockerfile
# Dockerfile

FROM ruby:3.3-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential libpq-dev curl git && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js if your app needs it for asset compilation
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /rails

ENV RAILS_ENV=production

# Install gems
COPY Gemfile Gemfile.lock ./
RUN bundle install --without development test

# Copy application code
COPY . .

RUN chmod +x bin/docker-entrypoint

# Precompile assets
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

EXPOSE 3000

# Entrypoint handles migrations and starts Puma
ENTRYPOINT ["/rails/bin/docker-entrypoint"]
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]
```

```bash
# bin/docker-entrypoint
#!/bin/bash -e

# Remove server.pid if it exists (prevents "server already running" errors)
if [ -f tmp/pids/server.pid ]; then
  rm tmp/pids/server.pid
fi

# If starting the Rails server, prepare the database
if [ "${@: -2:1}" = "./bin/rails" ] && [ "${@: -1:1}" = "server" ]; then
  ./bin/rails db:prepare
fi

exec "$@"
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and name it `rails-app`. The Nginx service below inlines its config so the stack can be pasted directly into the Web Editor:

```yaml
version: "3.8"

services:
  # PostgreSQL database
  db:
    image: postgres:16-alpine
    container_name: rails-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${RAILS_DB:-rails_production}
      POSTGRES_USER: ${RAILS_DB_USER:-railsuser}
      POSTGRES_PASSWORD: ${RAILS_DB_PASSWORD:-railspassword}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rails-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${RAILS_DB_USER:-railsuser} -d ${RAILS_DB:-rails_production}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - for Action Cable and Sidekiq
  redis:
    image: redis:7-alpine
    container_name: rails-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - rails-net

  # Rails web application (Puma server)
  web:
    image: ${RAILS_IMAGE:-rails-app:latest}
    container_name: rails-web
    restart: unless-stopped
    environment:
      RAILS_ENV: production
      RAILS_LOG_TO_STDOUT: "true"
      RAILS_SERVE_STATIC_FILES: "true"
      DATABASE_URL: postgresql://${RAILS_DB_USER:-railsuser}:${RAILS_DB_PASSWORD:-railspassword}@db:5432/${RAILS_DB:-rails_production}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      RAILS_MASTER_KEY: ${RAILS_MASTER_KEY}
    ports:
      - "3000:3000"
    volumes:
      - active_storage:/rails/storage  # Active Storage Disk service files
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - rails-net

  # Sidekiq background job processor
  sidekiq:
    image: ${RAILS_IMAGE:-rails-app:latest}
    container_name: rails-sidekiq
    restart: unless-stopped
    command: bundle exec sidekiq
    environment:
      RAILS_ENV: production
      DATABASE_URL: postgresql://${RAILS_DB_USER:-railsuser}:${RAILS_DB_PASSWORD:-railspassword}@db:5432/${RAILS_DB:-rails_production}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      RAILS_MASTER_KEY: ${RAILS_MASTER_KEY}
    volumes:
      - active_storage:/rails/storage
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - rails-net

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: rails-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    command:
      - /bin/sh
      - -c
      - |
        cat <<'EOF' >/etc/nginx/conf.d/default.conf
        upstream puma {
            server web:3000;
        }

        server {
            listen 80;
            server_name localhost;

            client_max_body_size 10M;

            # Action Cable WebSocket support
            location /cable {
                proxy_pass http://puma;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header Host $host;
                proxy_read_timeout 3600s;
            }

            # Active Storage - proxy to Rails
            location /rails/active_storage/ {
                proxy_pass http://puma;
                proxy_set_header Host $host;
            }

            # All other requests
            location / {
                proxy_pass http://puma;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }
        EOF
        exec nginx -g 'daemon off;'
    depends_on:
      - web
    networks:
      - rails-net

volumes:
  postgres_data:
  redis_data:
  active_storage:

networks:
  rails-net:
    driver: bridge
```

## Step 3: Nginx Configuration for Rails + Action Cable

If you prefer to keep the Nginx config in a separate file instead of inlining it in the stack, use:

```nginx
# nginx/rails.conf
upstream puma {
    server web:3000;
}

server {
    listen 80;
    server_name localhost;

    client_max_body_size 10M;

    # Action Cable WebSocket support
    location /cable {
        proxy_pass http://puma;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    # Active Storage - proxy to Rails
    location /rails/active_storage/ {
        proxy_pass http://puma;
        proxy_set_header Host $host;
    }

    # All other requests
    location / {
        proxy_pass http://puma;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 4: Rails Configuration for Docker

```ruby
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  url: <%= ENV['DATABASE_URL'] %>

production:
  <<: *default
```

```ruby
# config/cable.yml
production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") { "redis://localhost:6379/1" } %>
  channel_prefix: rails_production
```

## Step 5: Manage Rails via Portainer

```bash
# Run Rails console
docker exec -it rails-web bin/rails console

# Run specific migrations
docker exec rails-web bin/rails db:migrate

# Reset database (development only)
docker exec rails-web bin/rails db:reset

# View Sidekiq queues
docker exec -it rails-redis redis-cli llen queue:default

# Check Active Storage files
docker exec rails-web ls -la storage/

# View application logs
docker logs rails-web --tail 50 -f
```

## Step 6: Set Environment Variables in Portainer

In the Stack **Environment Variables** section, set:

| Key | Value |
|-----|-------|
| `SECRET_KEY_BASE` | Output of `bin/rails secret` |
| `RAILS_MASTER_KEY` | Contents of `config/master.key` |
| `RAILS_DB_PASSWORD` | Your secure password |
| `RAILS_IMAGE` | `your-registry/rails-app:latest` |

## Conclusion

Deploying Rails with PostgreSQL via Portainer provides a complete production environment with Puma, Sidekiq, Redis, and Nginx all managed from a single stack. The entrypoint script handles database preparation automatically when the Rails server starts, preventing the common "migrations not run" error. If you use Active Storage's Disk service in production, its files persist in a named volume, and Action Cable WebSocket connections are correctly proxied through Nginx. For production, always set `RAILS_MASTER_KEY` from your credentials file and use a secrets manager rather than plain environment variables.
