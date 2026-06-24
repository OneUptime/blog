# How to Scale Services in Portainer on Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Scaling, Service, DevOps

Description: Learn how to scale Docker Swarm services up and down using Portainer's UI for handling variable workloads.

## Introduction

One of Docker Swarm's core strengths is the ability to scale replicated services horizontally - adding or removing replicas to match demand. Portainer makes this process visual and immediate. This guide covers scaling services from the Portainer UI, understanding the scaling process, and best practices for production scaling.

## Prerequisites

- Portainer installed on Docker Swarm
- At least one replicated service running on the cluster
- Admin access, or Operator access in Portainer BE

## Method 1: Scale from the Services List

The fastest way to scale is directly from the services list:

1. In Portainer, navigate to **Services**
2. Find the service you want to scale
3. In the **Scheduling Mode** column, you will see the current replica count
4. Click **Scale** next to the replica count
5. Enter the new number of replicas
6. Click the tick icon to apply

Portainer immediately sends the replica update to the Swarm manager.

## Method 2: Scale from the Service Detail View

For more context when scaling:

1. Click on the service name to open details
2. In the **Service details** section, find the replica count
3. Update the number of replicas
4. Click **Update the service**

## Method 3: Scale Multiple Services from the CLI

If you need to scale multiple replicated services in one operation, use the Docker CLI on a Swarm manager:

```bash
docker service scale backend=3 frontend=5
```

## Understanding the Scale Process

When you increase replicas from 2 to 5:

```text
Before scaling:
  web.1 → worker-01 (Running)
  web.2 → worker-02 (Running)

Scaling command issued: 5 replicas

After scaling:
  web.1 → worker-01 (Running)
  web.2 → worker-02 (Running)
  web.3 → worker-03 (Running)  ← New
  web.4 → worker-01 (Running)  ← New
  web.5 → worker-02 (Running)  ← New
```

The Swarm scheduler places new tasks on nodes that satisfy resource availability requirements as well as any placement constraints and preferences.

## Verifying the Scale Operation

```bash
# Monitor scale progress from CLI

watch docker service ps web-frontend

# Confirm final state
docker service ls --filter name=web-frontend
```

In Portainer, refresh the Services page to see updated replica counts and task status.

## Scale to Zero

Scaling to 0 replicas stops all tasks without removing the service:

```bash
# Scale to zero from CLI
docker service scale web-frontend=0

# Scale back up
docker service scale web-frontend=3
```

This is useful for:
- Temporarily suspending a service for maintenance
- Freeing resources without deleting service configuration

From Portainer, set replicas to `0` using the scale field.

## Auto-Scaling Strategies

Docker Swarm does not have built-in auto-scaling. Any auto-scaling solution needs external monitoring and automation to decide when to run `docker service scale` or `docker service update --replicas` on a Swarm manager.

When evaluating external tooling, verify how it gathers metrics across nodes. `docker stats` reports container statistics for the Docker daemon you query, not Swarm task IDs across the cluster.

## Update Parallelism for Service Updates

`--update-parallelism` does not control how quickly additional replicas are added during a scale operation. It controls how many existing tasks are replaced at once during a service update or a forced rolling restart:

```bash
# Update service to set parallelism for future updates
docker service update \
  --update-parallelism 2 \
  --update-delay 10s \
  web-frontend
```

## Best Practices

1. **Set resource limits before scaling** - Prevent one service from starving others
2. **Monitor node capacity** - Ensure nodes can handle the additional tasks
3. **Use placement constraints and preferences deliberately** - Control eligible nodes and spread replicas where appropriate
4. **Configure health checks** - Failed health checks cause Swarm to replace unhealthy tasks
5. **Test scale-down** - Verify graceful shutdown handles in-flight requests

## Conclusion

Scaling replicated services in Portainer on Docker Swarm is a straightforward operation that the Swarm orchestrator handles automatically. Whether you scale from the services list, the service detail view, or via CLI, the Swarm manager ensures the desired number of replicas are running across your cluster. For production workloads, complement manual scaling with monitoring and potentially an external auto-scaling solution.
