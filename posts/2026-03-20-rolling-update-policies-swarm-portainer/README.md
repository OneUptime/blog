# How to Set Up Rolling Update Policies for Swarm Services in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rolling Update, Deployment, Reliability

Description: Configure Docker Swarm rolling update policies through Portainer to perform zero-downtime service updates with configurable parallelism and delay.

---

Docker Swarm's rolling update mechanism updates service replicas in batches, replacing old containers with new ones while helping maintain availability. Portainer's stack editor lets you configure the update policy alongside your service definition, making controlled rolling deployments a standard part of your workflow.

## Update Policy Parameters

| Parameter | Purpose |
|---|---|
| `parallelism` | How many replicas to update at once |
| `delay` | Wait time between each batch |
| `failure_action` | What to do on failure: `pause`, `continue`, `rollback` |
| `monitor` | Duration after each task update to monitor for failure |
| `max_failure_ratio` | Fraction of tasks allowed to fail before triggering failure_action |

## Step 1: Configure Rolling Updates in Stack YAML

```yaml
version: "3.8"
services:
  api:
    image: my-registry/api:1.6.0
    deploy:
      replicas: 6
      update_config:
        # Update 2 replicas at a time
        parallelism: 2
        # Wait 10 seconds between each batch
        delay: 10s
        # Automatically rollback on failure
        failure_action: rollback
        # Monitor updated tasks for 30 seconds before considering them successful
        monitor: 30s
        # Tolerate up to 20% failed tasks before triggering failure_action
        max_failure_ratio: 0.2
      rollback_config:
        parallelism: 0    # Roll back all at once
        delay: 0s
        failure_action: pause
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

## Step 2: Update the Stack via Portainer

To deploy a new image version:

1. Open the stack in Portainer
2. Update the image tag from `1.5.0` to `1.6.0`
3. Click **Update the stack**

Portainer shows the services and individual tasks in the Services view. As Swarm replaces tasks, old tasks appear as shutdown and replacement tasks progress toward running with the new image.

## Step 3: Monitor Update Progress

During an update, check the service status:

```bash
docker service ps my-stack_api
```

In `docker service ps`, the old task is shown as `Shutdown`, while a replacement task moves through `Preparing`/`Starting` to `Running` with the new image.

## Step 4: Force Re-deploy Without Changing the Image

To force a redeploy of the same image (useful for a rolling restart without changing service parameters):

```bash
docker service update --force my-stack_api
```

Or in Portainer, trigger a stack update after changing an environment variable.

## Step 5: Handle Failed Updates

If `failure_action: pause` and an update fails:

```bash
# Check which replica failed and why

docker service ps my-stack_api --no-trunc

# Roll back manually
docker service rollback my-stack_api
```

## Summary

Portainer's stack-based update workflow makes rolling deployments repeatable and auditable. By defining the update policy in the stack YAML, every deployment follows the same controlled rollout process - no manual orchestration required.
