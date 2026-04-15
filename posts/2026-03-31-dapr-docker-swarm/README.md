# How to Use Dapr with Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker Swarm, Container Orchestration, Sidecar, Deployment

Description: Deploy Dapr microservices on Docker Swarm by running Dapr sidecars as companion services and configuring component files for the self-hosted runtime mode.

---

Docker Swarm does not support Kubernetes-style sidecar injection, so running Dapr on Swarm requires using the self-hosted mode where `daprd` runs alongside your application in the same network namespace or as a companion container.

## Architecture on Docker Swarm

On Docker Swarm, each application service gets a companion `daprd` service sharing its network. Since Swarm does not support multiple containers per task natively, the recommended approach is to use a custom Docker image that starts both the app and the Dapr sidecar.

## Combined Image Approach

Create a Dockerfile that starts Dapr and your application together:

```dockerfile
FROM debian:bullseye-slim

# Install Dapr runtime
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | bash && \
    dapr init --slim

# Copy app binary
COPY --from=myapp-builder /app /app

# Copy Dapr components
COPY components /root/.dapr/components

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
```

```bash
#!/bin/bash
# start.sh
/root/.dapr/bin/daprd \
  --app-id "${APP_ID}" \
  --app-port "${APP_PORT}" \
  --dapr-http-port 3500 \
  --resources-path /root/.dapr/components \
  &

exec /app
```

## Docker Swarm Stack Definition

```yaml
version: "3.9"

services:
  order-service:
    image: myrepo/order-service-with-dapr:latest
    environment:
      APP_ID: order-service
      APP_PORT: "8080"
      DAPR_HTTP_PORT: "3500"
    ports:
    - "8080:8080"
    networks:
    - dapr-network
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s

  redis:
    image: redis:7-alpine
    networks:
    - dapr-network
    deploy:
      replicas: 1
      placement:
        constraints:
        - "node.role == manager"

networks:
  dapr-network:
    driver: overlay
    attachable: true
```

## Component Configuration

Create Dapr component files that reference service names on the overlay network:

```yaml
# components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: actorStateStore
    value: "false"
```

```yaml
# components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
```

## Deploying the Stack

```bash
# Initialize Swarm if not already done
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose-swarm.yml dapr-app

# Verify services are running
docker service ls

# View logs for a service
docker service logs dapr-app_order-service --follow
```

## Service Discovery in Swarm

Docker Swarm's internal DNS resolves service names across the overlay network. Dapr uses the same `dapr-http-port` for all sidecars, so inter-service communication works via:

```bash
# Inside order-service, invoke payment-service via Dapr HTTP
curl http://localhost:3500/v1.0/invoke/payment-service/method/pay \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99}'
```

## Limitations vs Kubernetes

Docker Swarm lacks automatic sidecar injection, Dapr actor support requires placement service setup, and rolling updates need manual coordination. For production workloads, Kubernetes is recommended. Swarm works well for smaller deployments or teams already invested in Docker Compose workflows.

## Summary

Running Dapr on Docker Swarm uses the self-hosted mode with `daprd` bundled in the application image. Component configuration files reference Docker Swarm overlay network service names. While lacking the automated sidecar injection of Kubernetes, Swarm deployments work well for teams preferring Docker-native tooling for simpler microservices deployments.
