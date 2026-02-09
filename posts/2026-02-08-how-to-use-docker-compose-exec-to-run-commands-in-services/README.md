# How to Use Docker Compose Exec to Run Commands in Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, docker compose, exec, debugging, development, containers, CLI

Description: Master the docker compose exec command for running ad-hoc commands, debugging, and managing running services.

---

The `docker compose exec` command lets you run commands inside running service containers without restarting them or opening separate terminal sessions. It is one of the most useful commands for day-to-day development work. Need to run a database migration? Check a log file inside a container? Open a shell to debug a failing service? `docker compose exec` handles all of these.

This guide covers everything from basic usage to advanced patterns that speed up your development workflow.

## Basic Syntax

The basic form of the command is straightforward:

```bash
# Run a command inside a running service container
docker compose exec <service-name> <command>
```

The service name comes from your `docker-compose.yml` file, not from the container name. If your Compose file defines a service called `web`, you use `web` as the service name regardless of what Docker names the actual container.

## Opening a Shell in a Service

The most common use case is opening an interactive shell:

```bash
# Open a bash shell in the web service
docker compose exec web bash
```

If the container uses Alpine Linux or a minimal image that does not include bash:

```bash
# Use sh if bash is not available in the container
docker compose exec web sh
```

You are now inside the running container. You can inspect files, check environment variables, test network connectivity, and run diagnostics. Press `Ctrl+D` or type `exit` to leave.

## Running One-Off Commands

Run a single command and return to your host shell immediately:

```bash
# Check the Node.js version inside the web container
docker compose exec web node --version

# View environment variables in the app container
docker compose exec app env

# Check disk usage inside a container
docker compose exec app df -h

# List running processes inside a service
docker compose exec app ps aux
```

## Database Operations

Running database commands through `docker compose exec` is essential for development workflows.

### PostgreSQL

```bash
# Open an interactive PostgreSQL shell
docker compose exec postgres psql -U myuser -d mydb

# Run a single SQL query without entering the interactive shell
docker compose exec postgres psql -U myuser -d mydb -c "SELECT count(*) FROM users;"

# Import a SQL dump into the database
docker compose exec -T postgres psql -U myuser -d mydb < backup.sql

# Export the database to a dump file
docker compose exec -T postgres pg_dump -U myuser mydb > backup.sql
```

### MySQL

```bash
# Open a MySQL shell
docker compose exec mysql mysql -u root -p

# Run a query directly
docker compose exec mysql mysql -u root -ppassword -e "SHOW DATABASES;"
```

### Redis

```bash
# Open the Redis CLI
docker compose exec redis redis-cli

# Check Redis memory usage
docker compose exec redis redis-cli INFO memory

# Flush all Redis data (use with caution)
docker compose exec redis redis-cli FLUSHALL
```

Notice the `-T` flag in the import and export examples. This is critical when piping data in or out of `docker compose exec`.

## The -T Flag for Non-Interactive Use

By default, `docker compose exec` allocates a pseudo-TTY. This is great for interactive shells but breaks piping and redirection. Use `-T` to disable the TTY allocation.

Without `-T`, this would produce garbled output:

```bash
# Export data correctly by disabling TTY allocation
docker compose exec -T postgres pg_dump -U myuser mydb > backup.sql

# Pipe a SQL file into the database
docker compose exec -T postgres psql -U myuser -d mydb < schema.sql
```

The `-T` flag is also necessary when running `docker compose exec` in CI/CD pipelines or scripts where there is no terminal attached:

```bash
#!/bin/bash
# ci-test.sh - Run tests in CI where no TTY is available
docker compose exec -T app python -m pytest tests/ --jv report.xml
```

## Running Commands as a Specific User

By default, commands run as the user defined in the Dockerfile. Override this with `--user`:

```bash
# Run a command as root inside the container
docker compose exec --user root web apt-get update

# Run a command as a specific UID
docker compose exec --user 1000 web whoami

# Run as a specific user and group
docker compose exec --user www-data:www-data web ls -la /var/www
```

This is useful when a container runs as a non-root user but you need root access temporarily to install debugging tools:

```bash
# Install debugging tools as root, then switch back to normal user
docker compose exec --user root web apt-get install -y curl net-tools strace
```

## Setting Environment Variables

Pass environment variables to the executed command with `-e`:

```bash
# Run a command with an additional environment variable
docker compose exec -e DEBUG=true app python manage.py debug_task

# Set multiple environment variables
docker compose exec -e NODE_ENV=test -e LOG_LEVEL=verbose web npm test
```

## Working Directory

Change the working directory for the executed command:

```bash
# Run a command from a specific directory inside the container
docker compose exec --workdir /app/scripts web python migrate.py

# Check files in a specific directory
docker compose exec --workdir /var/log app ls -la
```

## Running Commands in Scaled Services

When you scale a service to multiple instances, `docker compose exec` runs the command in the first container by default. Use `--index` to target a specific instance:

```bash
# Scale the worker service to 3 instances
docker compose up -d --scale worker=3

# Execute a command in the second worker instance
docker compose exec --index 2 worker python -c "import os; print(os.getpid())"

# Check logs in the third instance
docker compose exec --index 3 worker tail -f /var/log/worker.log
```

## Running Database Migrations

A common pattern is running migrations through `docker compose exec` after starting services:

```bash
# Django migrations
docker compose exec web python manage.py migrate

# Rails migrations
docker compose exec web bundle exec rake db:migrate

# Node.js with Knex
docker compose exec web npx knex migrate:latest

# Alembic (SQLAlchemy) migrations
docker compose exec web alembic upgrade head
```

You can also include migrations in your startup flow using a depends_on and a dedicated migration service:

```yaml
# docker-compose.yml - Separate migration service
services:
  web:
    build: .
    depends_on:
      migrate:
        condition: service_completed_successfully

  migrate:
    build: .
    command: python manage.py migrate
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 5s
      timeout: 3s
      retries: 5
```

## Debugging with docker compose exec

When a service is misbehaving, `docker compose exec` is your primary debugging tool.

Check network connectivity:

```bash
# Test if the app container can reach the database
docker compose exec app ping -c 3 postgres

# Check DNS resolution
docker compose exec app nslookup redis

# Test a specific port
docker compose exec app nc -zv postgres 5432
```

Inspect the filesystem:

```bash
# Check if config files are mounted correctly
docker compose exec app cat /app/config/database.yml

# Verify file permissions
docker compose exec app ls -la /app/uploads/

# Check available disk space
docker compose exec app df -h
```

Monitor resource usage:

```bash
# Watch CPU and memory in real time
docker compose exec app top

# Check memory usage
docker compose exec app free -m
```

## Exec vs Run: When to Use Each

These two commands serve different purposes:

- `docker compose exec` runs a command in an **existing, running** container
- `docker compose run` starts a **new** container from the service image

Use `exec` when you want to interact with a live service. Use `run` when you need a fresh, isolated container.

```bash
# Exec: Runs inside the already-running web container
docker compose exec web rails console

# Run: Starts a brand new container from the web service definition
docker compose run --rm web rails console
```

The `run` command creates a new container each time, which means it starts with a fresh filesystem and does not share the PID namespace with the running service. For debugging, `exec` is almost always what you want because you see the exact state of the running service.

## Creating Aliases for Common Commands

Speed up your workflow by creating shell aliases for frequent commands:

```bash
# Add these to your ~/.bashrc or ~/.zshrc
alias dce='docker compose exec'
alias dce-web='docker compose exec web'
alias dce-db='docker compose exec postgres psql -U myuser -d mydb'
alias dce-redis='docker compose exec redis redis-cli'
alias dce-shell='docker compose exec web bash'
```

After reloading your shell, database access becomes as simple as:

```bash
# Quick database access using the alias
dce-db -c "SELECT * FROM users LIMIT 5;"
```

## Summary

`docker compose exec` is a workhorse command for development and debugging. Use it to open shells, run database operations, execute migrations, and diagnose networking issues in running containers. Remember the `-T` flag for scripts and piped operations. Use `--user root` when you need temporary elevated access for installing debugging tools. For repeated commands, create shell aliases to save keystrokes. This single command replaces most of the workflow friction of working with containerized services.
