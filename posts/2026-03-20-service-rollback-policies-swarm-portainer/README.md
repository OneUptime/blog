# How to Configure Service Rollback Policies in Portainer on Swarm (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rollback, Deployment, Reliability

Description: Configure automatic service rollback policies in Docker Swarm through Portainer to revert failed updates before they impact production traffic.

---

Docker Swarm rollback policies define how a service reverts to its previous version when an update fails health checks or exceeds the allowed failure ratio. Portainer's stack editor makes it easy to configure automatic rollback as part of your deployment definition.

## Automatic vs Manual Rollback

- **Automatic**: Set `failure_action: rollback` in `update_config` - Swarm triggers rollback automatically when failure threshold is exceeded
- **Manual**: Operator triggers `docker service rollback` via a Portainer terminal connected to a Swarm manager node

## Step 1: Configure Rollback in Stack YAML

```yaml
version: "3.8"
services:
  api:
    image: my-registry/api:1.6.0
    deploy:
      replicas: 4
      update_config:
        parallelism: 1
        delay: 15s
        # Trigger automatic rollback on update failure
        failure_action: rollback
        monitor: 30s
        max_failure_ratio: 0.25
      rollback_config:
        # Roll back all replicas simultaneously for speed
        parallelism: 0
        delay: 0s
        # If rollback itself fails, pause for human intervention
        failure_action: pause
        # Monitor rollback health for 15 seconds per batch
        monitor: 15s
      restart_policy:
        condition: on-failure
```

## Step 2: Trigger a Manual Rollback via Portainer Terminal

If an update is partially deployed and you want to revert:

```bash
# Run from a Swarm manager node, then roll back to the previous service version

docker service rollback my-stack_api

# Monitor rollback progress
docker service ps my-stack_api
```

## Step 3: Check Rollback History

Swarm retains the previous service spec for one rollback. To inspect that retained spec:

```bash
docker service inspect --format '{{json .PreviousSpec}}' my-stack_api
```

The output shows the `PreviousSpec` JSON with the previous image and configuration when a previous spec is available.

## Step 4: Automate Rollback with Health Checks

Health checks make rollback more reliable by detecting application-level failures:

```yaml
services:
  api:
    image: my-registry/api:1.6.0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 20s
    deploy:
      update_config:
        failure_action: rollback
        monitor: 60s   # Keep this longer than start_period + retries * interval
```

When a new replica becomes unhealthy during the monitor window, Swarm counts it as a failed task and triggers rollback if `max_failure_ratio` is exceeded.

## Step 5: Test Rollback Before Production

Before deploying to production:

1. Deploy a deliberately bad image tag to a staging environment
2. Verify automatic rollback triggers within the expected time
3. Confirm the service returns to the previous version and health

## Summary

Swarm rollback policies are the safety net for failed deployments. Configuring `failure_action: rollback` alongside health checks creates an automated recovery path that reverts bad deployments without manual intervention, minimizing the impact of release failures on users.
