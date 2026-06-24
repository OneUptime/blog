# How to Set Up Service Update Configuration in Portainer on Swarm - Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker Swarm, Portainer, Rolling Update, Service Update, DevOps

Description: Learn how to configure rolling update strategies for Docker Swarm services in Portainer to achieve zero-downtime deployments.

## What Is Service Update Configuration?

Swarm's update configuration controls how services are updated when you update the service to use a new image or change a service definition. Properly tuned rolling updates reduce downtime by replacing tasks gradually rather than all at once.

## Key Update Parameters

| Parameter | Description |
|-----------|-------------|
| **Parallelism** | Number of tasks updated simultaneously |
| **Delay** | Wait time between updating batches |
| **Failure action** | What to do if an update fails (`pause`, `continue`, `rollback`) |
| **Max failure ratio** | Fraction of tasks allowed to fail before the update is considered failed and the failure action applies |
| **Order** | `stop-first` (stop old before starting new) or `start-first` (start new before stopping old) |

## Configuring Update Settings in Portainer

When creating or editing a service in Portainer:

1. Scroll to the **Update configuration** section.
2. Set **Parallelism**, **Delay**, **Failure action**, and **Order**.
3. Click **Create** or **Update the service**.

## Compose File Example

```yaml
version: "3.8"

services:
  api:
    image: my-api:2.0.0
    deploy:
      replicas: 4
      update_config:
        # Update 1 replica at a time
        parallelism: 1
        # Wait 15 seconds between each batch
        delay: 15s
        # If an update fails, roll back automatically
        failure_action: rollback
        # Start the new container before stopping the old one (helps minimize downtime)
        order: start-first
        # Allow up to 20% of tasks to fail before triggering failure_action
        max_failure_ratio: 0.2
      rollback_config:
        # Rollback 1 task at a time
        parallelism: 1
        delay: 5s
        failure_action: pause
        order: stop-first
```

## Triggering an Update

```bash
# Update a service to a new image version

docker service update --image my-api:2.1.0 api

# Force re-deploy without changing the service spec (useful for rolling restarts)
docker service update --force api

# Roll back to the previous version
docker service rollback api
```

## Monitoring an Update in Progress

```bash
# Watch task status during a rolling update
docker service ps api --no-trunc

# Inspect service status and update settings
docker service inspect api --pretty
```

## Conclusion

Configuring update policies in Portainer ensures your Swarm services update gracefully. Using `start-first` order with a sensible parallelism value and automatic rollback on failure is a common production pattern for reducing deployment disruption.
