# How to Deploy a Ruby on Rails App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Ruby on Rails, Deployment, ECS, Elastic Beanstalk

Description: A comprehensive guide to deploying Ruby on Rails applications on AWS using Elastic Beanstalk, ECS, and EC2 with database, caching, and background job configurations.

---

Rails apps have specific requirements that make AWS deployment a bit more involved than a simple static site. You need a web server, a database, often a Redis instance for caching and background jobs, and a way to run migrations. AWS has all the pieces, but putting them together takes some planning. Let's walk through the most practical deployment approaches.

## Preparing Your Rails App

Before deploying, make sure your app is production-ready.

Update your Gemfile with production dependencies:

```ruby
# Gemfile
group :production do
  gem 'pg'           # PostgreSQL adapter
  gem 'puma', '~> 6' # Production web server
  gem 'aws-sdk-s3'   # For Active Storage file uploads
  gem 'redis'        # For Action Cable and caching
end
```

Configure Puma for production use. This config sets up workers based on available CPU cores:

```ruby
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
threads threads_count, threads_count

preload_app!

port ENV.fetch("PORT") { 3000 }
environment ENV.fetch("RAILS_ENV") { "production" }

on_worker_boot do
  ActiveRecord::Base.establish_connection
end
```

Set up your database configuration to read from environment variables:

```yaml
# config/database.yml
production:
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  host: <%= ENV['DATABASE_HOST'] %>
  database: <%= ENV['DATABASE_NAME'] %>
  username: <%= ENV['DATABASE_USERNAME'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
```

## Option 1: Elastic Beanstalk

Elastic Beanstalk is the quickest path to production for Rails apps. It handles load balancing, auto-scaling, and even runs your database migrations if you configure it right.

### Project Structure

Add these configuration files to your project:

```yaml
# .ebextensions/01_packages.config
packages:
  yum:
    postgresql-devel: []
    git: []
```

Set up environment properties and run migrations on deploy:

```yaml
# .ebextensions/02_environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    RAILS_ENV: production
    RACK_ENV: production
    SECRET_KEY_BASE: your-secret-key-base
    RAILS_SERVE_STATIC_FILES: true
    RAILS_LOG_TO_STDOUT: true
```

Create a hook to run migrations automatically after deployment:

```bash
#!/bin/bash
# .platform/hooks/postdeploy/01_migrate.sh
cd /var/app/current
bundle exec rails db:migrate
```

Make the script executable:

```bash
chmod +x .platform/hooks/postdeploy/01_migrate.sh
```

### Deploy

```bash
# Install the EB CLI
pip install awsebcli

# Initialize and deploy
eb init -p ruby-3.2 my-rails-app --region us-east-1
eb create rails-production --instance_type t3.medium --database.engine postgres
eb deploy
```

## Option 2: Docker on ECS Fargate

For more control and consistency between environments, containerize your Rails app.

Create a production Dockerfile:

```dockerfile
# Dockerfile
FROM ruby:3.2-slim AS builder

RUN apt-get update -qq && apt-get install -y \
    build-essential \
    libpq-dev \
    git \
    nodejs \
    npm

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set --local deployment 'true' && \
    bundle config set --local without 'development test' && \
    bundle install

COPY . .

# Precompile assets
RUN SECRET_KEY_BASE=placeholder bundle exec rails assets:precompile

FROM ruby:3.2-slim

RUN apt-get update -qq && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app /app
COPY --from=builder /usr/local/bundle /usr/local/bundle

RUN useradd -r -s /bin/false rails
USER rails

EXPOSE 3000

CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
```

Push to ECR and create your ECS task definition:

```bash
# Create ECR repository
aws ecr create-repository --repository-name rails-app

# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t rails-app .
docker tag rails-app:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/rails-app:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/rails-app:latest
```

ECS task definition with web server and background worker:

```json
{
  "family": "rails-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/rails-app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "RAILS_ENV", "value": "production"},
        {"name": "RAILS_LOG_TO_STDOUT", "value": "true"},
        {"name": "RAILS_SERVE_STATIC_FILES", "value": "true"}
      ],
      "secrets": [
        {
          "name": "SECRET_KEY_BASE",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/rails/secret-key-base"
        },
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/rails/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rails-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

## Database Migrations on ECS

Running migrations on ECS requires a separate task. Create a migration script:

```bash
#!/bin/bash
# scripts/run-migration.sh

# Run a one-off ECS task for database migrations
aws ecs run-task \
  --cluster rails-cluster \
  --task-definition rails-app \
  --launch-type FARGATE \
  --overrides '{
    "containerOverrides": [{
      "name": "web",
      "command": ["bundle", "exec", "rails", "db:migrate"]
    }]
  }' \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"

echo "Migration task started. Check ECS console for status."
```

## Background Jobs with Sidekiq

Most Rails apps need background job processing. Run Sidekiq as a separate ECS service using the same container image but a different command.

Create a separate task definition for the worker:

```json
{
  "family": "rails-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/rails-app:latest",
      "essential": true,
      "command": ["bundle", "exec", "sidekiq"],
      "environment": [
        {"name": "RAILS_ENV", "value": "production"},
        {"name": "REDIS_URL", "value": "redis://your-elasticache-endpoint:6379/0"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:ACCOUNT_ID:parameter/rails/database-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rails-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "worker"
        }
      }
    }
  ]
}
```

## Setting Up RDS and ElastiCache

Your Rails app needs PostgreSQL and likely Redis. Set them up with the CLI:

```bash
# Create an RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier rails-production-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15 \
  --master-username dbadmin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7

# Create an ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id rails-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxx \
  --cache-subnet-group-name your-subnet-group
```

## Asset Storage with S3

Configure Active Storage to use S3 for file uploads:

```yaml
# config/storage.yml
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: us-east-1
  bucket: my-rails-app-uploads
```

```ruby
# config/environments/production.rb
config.active_storage.service = :amazon
```

## Health Check Endpoint

Add a simple health check route:

```ruby
# config/routes.rb
get '/health', to: proc { [200, {}, ['OK']] }
```

For deeper health checks that verify database connectivity:

```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :authenticate_user!, raise: false

  def show
    ActiveRecord::Base.connection.execute('SELECT 1')
    render json: { status: 'healthy', timestamp: Time.current }
  rescue StandardError => e
    render json: { status: 'unhealthy', error: e.message }, status: :service_unavailable
  end
end
```

## Monitoring and Logging

Set up structured logging for better CloudWatch integration:

```ruby
# config/environments/production.rb
config.log_formatter = proc do |severity, time, progname, msg|
  { level: severity, time: time.iso8601, message: msg }.to_json + "\n"
end
```

For production monitoring beyond what CloudWatch offers, consider adding [external monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view) that can alert you about response time degradation, error rate spikes, and downtime.

## Summary

Deploying Rails to AWS requires a few more moving parts than a simple static app, but the ecosystem is mature and well-documented. Elastic Beanstalk gets you to production fastest, while ECS gives you the flexibility to manage web servers, workers, and migrations independently. Whichever path you choose, don't forget to set up proper monitoring, automated backups for your database, and a CI/CD pipeline to keep deployments smooth.
