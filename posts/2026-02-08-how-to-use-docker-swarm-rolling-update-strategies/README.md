# How to Use Docker Swarm Rolling Update Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Rolling Updates, Zero Downtime, Deployment Strategy, DevOps

Description: Configure Docker Swarm rolling update parameters for zero-downtime deployments with parallelism, delays, and rollback controls.

---

Deploying a new version of your application should not cause downtime. Docker Swarm's rolling update feature replaces containers incrementally, taking down old instances and spinning up new ones in a controlled manner. By tuning the update parameters, you control how many containers update at once, how long the system waits between batches, and what happens when a new version fails health checks.

This guide covers every rolling update parameter, shows how to configure them for real-world scenarios, and demonstrates automatic rollback when things go wrong.

## How Rolling Updates Work in Swarm

When you update a service (change the image, environment variables, or any other configuration), Swarm does not replace all containers at once. Instead, it follows these steps:

1. Stop a batch of old tasks (determined by `--update-parallelism`)
2. Start new tasks with the updated configuration
3. Wait for new tasks to become healthy
4. Pause for the configured delay (`--update-delay`)
5. Repeat until all tasks are updated

If any new task fails to start or fails its health check, Swarm takes action based on the `--update-failure-action` setting (pause, continue, or rollback).

## Creating a Service with Update Configuration

Set update parameters when you create a service:

```bash
# Create a service with rolling update configuration
docker service create \
  --name webapp \
  --replicas 6 \
  --update-parallelism 2 \
  --update-delay 10s \
  --update-failure-action rollback \
  --update-max-failure-ratio 0.25 \
  --update-order start-first \
  -p 80:8080 \
  myapp:v1.0
```

Let us break down each parameter:

**--update-parallelism 2**: Update two tasks at a time. With 6 replicas, this means three batches of two.

**--update-delay 10s**: Wait 10 seconds between each batch. This gives you time to detect issues before the next batch starts.

**--update-failure-action rollback**: If a task fails, automatically roll back to the previous version. Other options are `pause` (stop updating and wait for manual intervention) and `continue` (ignore failures and keep going).

**--update-max-failure-ratio 0.25**: Allow up to 25% of tasks to fail before triggering the failure action. This prevents a single flaky container from triggering a full rollback.

**--update-order start-first**: Start the new task before stopping the old one. This ensures the replica count never drops below the desired number, maintaining capacity during the update.

## Update Order: start-first vs stop-first

The `--update-order` parameter has a significant impact on your deployment.

**stop-first (default)**: Stops the old task, then starts the new one. This temporarily reduces capacity but avoids running two versions simultaneously on the same slot.

**start-first**: Starts the new task first, waits for it to become healthy, then stops the old one. This maintains full capacity throughout the update but briefly runs more containers than the replica count.

For most web services, `start-first` is the better choice:

```bash
# Update an existing service to use start-first order
docker service update \
  --update-order start-first \
  webapp
```

## Performing an Update

Trigger an update by changing the image or any service configuration:

```bash
# Update the service to a new image version
docker service update \
  --image myapp:v2.0 \
  webapp
```

Monitor the update in real time:

```bash
# Watch the rolling update progress
docker service ps webapp
```

You will see tasks transitioning from `Running` to `Shutdown` as old versions are replaced:

```
ID          NAME         IMAGE        NODE     DESIRED STATE   CURRENT STATE
abc123      webapp.1     myapp:v2.0   node1    Running         Running 5 seconds ago
def456      webapp.2     myapp:v2.0   node2    Running         Running 15 seconds ago
ghi789      webapp.3     myapp:v1.0   node3    Running         Running 2 minutes ago
jkl012      webapp.4     myapp:v1.0   node1    Running         Running 2 minutes ago
mno345      webapp.5     myapp:v1.0   node2    Running         Running 2 minutes ago
pqr678      webapp.6     myapp:v1.0   node3    Running         Running 2 minutes ago
```

## Configuring Health Checks for Safe Updates

Rolling updates work best with health checks. Without them, Swarm considers a task "healthy" as soon as the container starts, even if the application inside is still initializing.

Define health checks in your Dockerfile:

```dockerfile
# Dockerfile with a health check
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production

# Health check that verifies the app is responding
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
```

Or specify them in the service definition:

```bash
# Create a service with an explicit health check
docker service create \
  --name webapp \
  --replicas 6 \
  --health-cmd "wget -q --spider http://localhost:8080/health || exit 1" \
  --health-interval 10s \
  --health-timeout 3s \
  --health-retries 3 \
  --health-start-period 15s \
  --update-parallelism 2 \
  --update-delay 10s \
  --update-failure-action rollback \
  --update-order start-first \
  -p 80:8080 \
  myapp:v1.0
```

The `--health-start-period` gives the application time to initialize before health checks start counting failures. This is important for apps that need to load data, warm caches, or establish database connections.

## Automatic Rollback

When `--update-failure-action` is set to `rollback`, Swarm automatically reverts to the previous version if too many new tasks fail. You can also configure rollback parameters separately:

```bash
# Configure both update and rollback parameters
docker service create \
  --name webapp \
  --replicas 6 \
  --update-parallelism 2 \
  --update-delay 10s \
  --update-failure-action rollback \
  --update-max-failure-ratio 0.25 \
  --rollback-parallelism 3 \
  --rollback-delay 5s \
  --rollback-max-failure-ratio 0.1 \
  --rollback-order start-first \
  -p 80:8080 \
  myapp:v1.0
```

Notice that rollback can use different parallelism and delay than the update. Rollbacks are typically configured to be faster (higher parallelism, shorter delay) since you want to restore the known-good version quickly.

## Manual Rollback

If you set `--update-failure-action` to `pause`, a failed update pauses and waits for you. You can then roll back manually:

```bash
# Manually roll back a service to its previous version
docker service rollback webapp
```

Or resume the paused update if you have fixed the issue:

```bash
# Force the update to continue after investigating
docker service update --force webapp
```

## Using Docker Compose for Update Configuration

In a Compose file, update configuration goes under the `deploy.update_config` key:

```yaml
# docker-compose.yml with rolling update configuration
version: "3.8"

services:
  webapp:
    image: myapp:v1.0
    ports:
      - "80:8080"
    deploy:
      replicas: 6
      update_config:
        parallelism: 2
        delay: 10s
        failure_action: rollback
        max_failure_ratio: 0.25
        order: start-first
      rollback_config:
        parallelism: 3
        delay: 5s
        order: start-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 15s
```

Deploy or update the stack:

```bash
# Deploy the stack (or update it if already deployed)
docker stack deploy -c docker-compose.yml mystack
```

## Monitoring Update Progress

Several commands help you track what is happening during an update:

```bash
# See the current state of all tasks, including old versions being shut down
docker service ps webapp

# Filter to only show running tasks
docker service ps webapp --filter "desired-state=running"

# Get overall service status
docker service inspect webapp --pretty

# Watch events in real time
docker events --filter "type=service" --filter "service=webapp"
```

## Practical Update Strategies by Service Type

**Stateless web servers (high replica count)**: Use `--update-parallelism 3` with `--update-delay 15s`. Higher parallelism speeds up the rollout while the delay provides observation time.

**APIs with long-running requests**: Use `--stop-grace-period 30s` to give in-flight requests time to complete before the container is killed.

```bash
# Update with a generous stop grace period for in-flight requests
docker service update \
  --image myapp:v2.0 \
  --stop-grace-period 30s \
  webapp
```

**Background workers**: Use `--update-parallelism 1` with `--update-delay 30s`. Update one at a time to maintain processing capacity and verify each new instance processes jobs correctly.

**Database-connected services**: Use `--update-order start-first` and ensure your database can handle the briefly elevated connection count during the overlap period.

## Conclusion

Docker Swarm's rolling update mechanism gives you fine-grained control over how deployments happen. The combination of parallelism, delay, health checks, and automatic rollback creates a deployment process that minimizes downtime and catches issues early. Start with conservative settings (low parallelism, longer delays, automatic rollback), then tune them as you gain confidence in your deployment pipeline. The goal is a system where deploying a new version is routine, safe, and requires zero manual intervention.
