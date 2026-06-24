# How to Scale Individual Microservices in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Scaling, Microservice, Docker Swarm, Load Balancing, Docker Compose

Description: Learn how to scale individual microservice containers in Portainer using Docker Compose replica settings and Docker Swarm service scaling.

---

Portainer provides UI-based scaling for services in Docker Swarm mode. For stacks deployed to Swarm, you can also scale individual services by updating the stack's Compose file and redeploying it.

## Scaling in Docker Swarm via Portainer

For Swarm services, Portainer provides a direct scaling UI:

1. Go to **Services**.
2. Click **scale** next to the service you want to scale.
3. Change the replica count.
4. Click the tick icon to apply the change.

Swarm schedules the new replicas onto available nodes.

## Scaling via Stack Compose File

For stacks deployed to Docker Swarm, update the `deploy.replicas` count in the stack YAML and redeploy the stack:

```yaml
version: "3.8"
services:
  user-service:
    image: user-service:latest
    deploy:
      replicas: 3         # Scale to 3 instances
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.25"
          memory: 128M
      restart_policy:
        condition: on-failure
        max_attempts: 3
      update_config:
        parallelism: 1    # Update one replica at a time
        delay: 10s

  # Heavy service needs more replicas
  api-gateway:
    image: nginx:alpine
    deploy:
      replicas: 5
```

## Scaling via Docker CLI

Run the command on a Swarm manager node:

```bash
# Scale a Swarm service from the command line

docker service scale mystack_user-service=5

# Verify the scaling
docker service ps mystack_user-service
```

## Horizontal Scaling with Load Balancing

Docker Swarm uses internal service discovery and load-balances requests across replicas with a virtual IP (VIP) by default. For published ports, Swarm's routing mesh also balances external traffic across nodes. No additional load balancer configuration is needed for internal service-to-service calls on the same overlay network:

```javascript
// This request is automatically load-balanced to one of the user-service replicas
const response = await fetch('http://user-service:3001/users');
```

## Auto-Scaling Scripts

Docker Swarm does not have built-in auto-scaling. To automate scaling, use an external monitoring system or controller that decides when to scale and then runs a command like this on a Swarm manager node:

```bash
#!/bin/bash
# scale-up.sh - Run after your monitoring system decides this service should scale up

CURRENT=$(docker service inspect mystack_user-service --format '{{.Spec.Mode.Replicated.Replicas}}')
docker service scale mystack_user-service=$((CURRENT + 1))
```

## Monitoring Replicas

In Portainer, the **Services** view lets you verify that service tasks are running after a scaling change. OneUptime can monitor the service endpoint and alert if the service becomes unavailable.
