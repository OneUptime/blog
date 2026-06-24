# How to Implement Rolling Updates with Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rolling Update, Zero Downtime, Deployment, Service

Description: Learn how to implement zero-downtime rolling updates for Docker Swarm services via Portainer, controlling update parallelism, delay, and failure actions.

---

Rolling updates replace service replicas one at a time (or in small batches), helping keep the application available throughout the deployment. Docker Swarm supports this natively via the `update_config` section of service definitions.

## Configuring Rolling Updates in a Stack

The `update_config` block controls how Swarm applies image changes:

```yaml
version: "3.8"

services:
  api:
    image: myregistry.example.com/my-app:${IMAGE_TAG:-latest}
    deploy:
      replicas: 4
      update_config:
        parallelism: 1        # Update 1 replica at a time
        delay: 15s            # Wait 15s between each replica update
        failure_action: rollback   # Automatically rollback on failure
        monitor: 30s          # Observe for 30s before marking success
        max_failure_ratio: 0.25    # Allow up to 25% replicas to fail before rollback
        order: start-first    # Start new replica before stopping old one
      rollback_config:
        parallelism: 2
        delay: 5s
        failure_action: pause
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s
```

The `order: start-first` option starts the replacement task before the old one is stopped, so tasks briefly overlap. This can help minimize downtime, but zero-downtime still depends on the app starting cleanly and staying healthy.

## Triggering a Rolling Update via Portainer

Update the image tag in the stack and click **Update the stack** in Portainer. Swarm automatically performs the rolling update using the configured `update_config`.

Alternatively, trigger from the CLI:

```bash
# Update the service image

docker service update \
  --with-registry-auth \
  --image myregistry.example.com/my-app:v1.5.0 \
  --update-parallelism 1 \
  --update-delay 15s \
  mystack_api

# Watch the update progress
docker service ps mystack_api --no-trunc
```

## Monitoring Rolling Update Progress

Track which replicas are running the new image:

```bash
# Watch update status in real time
watch -n 2 'docker service ps mystack_api --filter desired-state=running --format "{{.Name}}\t{{.Image}}\t{{.CurrentState}}"'

# Check overall service update status
docker service inspect mystack_api --format '{{.UpdateStatus.State}}'
# Shows the state of the last update or rollback
```

## Automatic Rollback on Health Check Failure

With `failure_action: rollback`, Swarm automatically rolls back if enough updated tasks fail. A task update counts as failed if it doesn't start, or if it stops running within the `monitor` window, which can include a task being replaced after a failing health check:

```bash
# If a rollback is triggered, observe it
docker service inspect mystack_api --format '{{.UpdateStatus.Message}}'

# Manually trigger a rollback if needed
docker service rollback mystack_api
```

## Blue-Green Equivalent with Swarm Labels

For a blue-green style switch with Swarm, use separate services behind a label-based router and switch traffic after green is verified:

```yaml
  api-green:
    image: myregistry.example.com/my-app:v1.5.0
    deploy:
      replicas: 4
      labels:
        - "traefik.http.routers.api.service=api-green"  # with your existing Traefik router/rule/port labels
    # Run in parallel with blue, then switch traffic after verification

  api-blue:
    image: myregistry.example.com/my-app:v1.4.0
    deploy:
      replicas: 4   # Scale down after traffic is switched to green
```

## Rolling Update Best Practices

| Setting | Recommendation |
|---------|----------------|
| `parallelism` | 1 for critical services, up to 25% of replicas for fast deploys |
| `delay` | At least 10-30s to allow health checks to run |
| `failure_action` | `rollback` for production, `pause` for debugging |
| `monitor` | At least 2x your health check interval |
| `order` | `start-first` for stateless services |
