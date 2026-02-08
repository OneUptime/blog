# How to Run a One-Off Command in a New Docker Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, Docker Run, One-Off Commands, DevOps, Scripting, Automation

Description: Learn how to run one-off commands in disposable Docker containers for tasks like database migrations, scripts, debugging, and testing.

---

Not every container runs a long-lived service. Sometimes you need to execute a single command, get the result, and move on. Run a database migration, process a file, test a tool, or check a network connection. Docker handles this cleanly with one-off containers that start, execute, and disappear.

This guide covers how to run one-off commands effectively, pass data in and out, and handle common scenarios you will encounter in daily development and operations work.

## Basic One-Off Command

The simplest form runs a command in a new container and exits.

```bash
# Run a single command in a new container
docker run ubuntu:22.04 echo "Hello from inside a container"
```

The container starts, prints the message, and stops. The container still exists in a stopped state though. Add `--rm` to automatically remove it after exit.

```bash
# Run a command and automatically remove the container when it exits
docker run --rm ubuntu:22.04 echo "Hello and goodbye"
```

The `--rm` flag is essential for one-off commands. Without it, you accumulate stopped containers over time.

## Interactive One-Off Commands

Add `-it` for commands that need terminal interaction.

```bash
# Open an interactive shell in a new container
docker run --rm -it ubuntu:22.04 bash

# Open a Python REPL
docker run --rm -it python:3.12 python

# Start a Node.js REPL
docker run --rm -it node:20-alpine node
```

The `-i` flag keeps stdin open. The `-t` flag allocates a pseudo-TTY. Together they give you a proper interactive terminal session.

## Running Scripts

Pass scripts to containers through various methods.

```bash
# Run an inline bash script
docker run --rm ubuntu:22.04 bash -c "
    echo 'System info:'
    uname -a
    echo ''
    echo 'Disk usage:'
    df -h
    echo ''
    echo 'Memory:'
    free -h
"
```

Mount a local script file into the container:

```bash
# Run a local script inside a container
docker run --rm -v "$(pwd)/my-script.sh:/tmp/my-script.sh" ubuntu:22.04 bash /tmp/my-script.sh
```

## Database Operations

One-off containers are perfect for database tasks.

```bash
# Run a database migration
docker run --rm \
  --network myapp_default \
  -e DATABASE_URL="postgres://user:pass@postgres:5432/mydb" \
  myapp:latest \
  npm run migrate

# Create a database backup
docker run --rm \
  --network myapp_default \
  -v "$(pwd)/backups:/backups" \
  postgres:16-alpine \
  pg_dump -h postgres -U myuser mydb > /backups/dump.sql

# Restore a database from backup
docker run --rm \
  --network myapp_default \
  -v "$(pwd)/backups:/backups" \
  postgres:16-alpine \
  psql -h postgres -U myuser mydb -f /backups/dump.sql

# Run a Redis CLI command against a running Redis container
docker run --rm \
  --network myapp_default \
  redis:7-alpine \
  redis-cli -h redis FLUSHALL
```

## File Processing

Process files without installing tools on your host machine.

```bash
# Convert a file using ImageMagick (without installing it locally)
docker run --rm -v "$(pwd):/work" -w /work dpokidov/imagemagick \
  convert input.png -resize 50% output.png

# Format JSON files with jq
docker run --rm -v "$(pwd):/work" -w /work stedolan/jq '.' /work/data.json > formatted.json

# Lint a Dockerfile
docker run --rm -i hadolint/hadolint < Dockerfile

# Run a security scan on a project
docker run --rm -v "$(pwd):/src" returntocorp/semgrep --config=auto /src
```

## Network Debugging

Spin up a container to debug network issues.

```bash
# Test connectivity from within a Docker network
docker run --rm --network myapp_default alpine:3.19 ping -c 3 postgres

# DNS lookup within a Docker network
docker run --rm --network myapp_default alpine:3.19 nslookup api

# Test an HTTP endpoint from a container's perspective
docker run --rm --network myapp_default curlimages/curl http://api:3000/health

# Full network debugging toolkit
docker run --rm -it --network myapp_default nicolaka/netshoot bash
```

The `nicolaka/netshoot` image includes tools like curl, dig, nslookup, iperf, tcpdump, and more, making it ideal for network troubleshooting.

## Using Environment Variables

Pass configuration to one-off commands through environment variables.

```bash
# Pass individual environment variables
docker run --rm \
  -e API_KEY="abc123" \
  -e API_URL="https://api.example.com" \
  myapp:latest \
  node scripts/sync-data.js

# Pass an entire env file
docker run --rm \
  --env-file .env.production \
  myapp:latest \
  node scripts/generate-report.js
```

## Working Directory and Volume Mounts

Mount your current directory to process local files.

```bash
# Mount the current directory and set it as the working directory
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine npm test

# Mount multiple directories
docker run --rm \
  -v "$(pwd)/src:/app/src" \
  -v "$(pwd)/config:/app/config" \
  -w /app \
  myapp:latest \
  node scripts/build.js
```

## Running Commands as a Specific User

By default, commands run as root inside the container. Match your host user to avoid file permission issues.

```bash
# Run as the current host user (avoids root-owned files)
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  -u "$(id -u):$(id -g)" \
  node:20-alpine \
  npm install
```

Without the `-u` flag, files created inside the mounted volume would be owned by root on the host.

## Capturing Output

Capture the output of one-off commands for use in scripts.

```bash
# Capture stdout into a variable
RESULT=$(docker run --rm alpine:3.19 cat /etc/alpine-release)
echo "Alpine version: $RESULT"

# Capture and save to a file
docker run --rm myapp:latest node scripts/generate-report.js > report.txt

# Capture both stdout and stderr
docker run --rm myapp:latest node scripts/risky-task.js > output.txt 2> errors.txt
```

## Exit Codes

One-off commands return the exit code of the process inside the container.

```bash
# The exit code propagates to the host
docker run --rm alpine:3.19 sh -c "exit 42"
echo "Exit code: $?"  # Prints: Exit code: 42

# Use in conditional logic
if docker run --rm myapp:latest npm test; then
    echo "Tests passed"
else
    echo "Tests failed"
fi
```

This makes one-off containers work seamlessly in shell scripts and CI pipelines.

## Resource Limits

Prevent one-off tasks from consuming too many host resources.

```bash
# Limit memory and CPU for a resource-intensive task
docker run --rm \
  --memory 512m \
  --cpus 2 \
  myapp:latest \
  node scripts/heavy-computation.js

# Set a timeout using the --stop-timeout flag
docker run --rm \
  --stop-timeout 300 \
  myapp:latest \
  node scripts/long-running-task.js
```

## Practical Examples

### Running Tests Against a Specific Node Version

```bash
# Test your code against different Node.js versions
for version in 18 20 22; do
    echo "Testing with Node $version..."
    docker run --rm -v "$(pwd):/app" -w /app "node:${version}-alpine" npm test
done
```

### Seed a Development Database

```bash
# Seed data into a running database
docker run --rm \
  --network myapp_default \
  -v "$(pwd)/seeds:/seeds" \
  postgres:16-alpine \
  psql -h postgres -U myuser -d mydb -f /seeds/development.sql
```

### Generate SSL Certificates

```bash
# Generate a self-signed certificate for development
docker run --rm -v "$(pwd)/certs:/certs" alpine:3.19 sh -c "
    apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 \
      -newkey rsa:2048 \
      -keyout /certs/server.key \
      -out /certs/server.crt \
      -subj '/CN=localhost'
"
```

### Run a Code Formatter

```bash
# Format Python code without installing black locally
docker run --rm -v "$(pwd):/src" -w /src pyfound/black:latest black .

# Format Go code
docker run --rm -v "$(pwd):/src" -w /src golang:1.22 gofmt -w .
```

### Check a URL from a Clean Network Context

```bash
# Verify a URL is reachable (useful for health checks in CI)
docker run --rm curlimages/curl -sf http://my-service.example.com/health
echo "Health check exit code: $?"
```

## Composing One-Off Tasks

Docker Compose supports one-off commands through the `run` subcommand.

```bash
# Run a one-off command using a service definition from docker-compose.yml
docker compose run --rm web npm run migrate

# Run with specific environment overrides
docker compose run --rm -e NODE_ENV=test web npm test

# Run without starting dependent services
docker compose run --rm --no-deps web echo "No dependencies started"
```

The `docker compose run` command uses the service's configuration (image, volumes, networks, environment) but runs a different command.

## Cleanup Best Practices

Always use `--rm` for one-off containers. If you forget, clean up periodically.

```bash
# Find and remove containers that were clearly one-off tasks
docker ps -a --filter "status=exited" --format '{{.Names}} {{.Command}}' | grep -v "_" | head -20

# Remove all stopped containers from one-off tasks
docker container prune -f
```

## Conclusion

One-off Docker containers turn any tool or runtime into an instant, disposable utility. Always use `--rm` to avoid container accumulation. Use `-v` to mount local files. Use `--network` to access other containers. Match the host user with `-u` to keep file permissions clean. Capture exit codes to integrate one-off tasks into scripts and pipelines. This pattern keeps your host system clean while giving you access to any tool that has a Docker image.
