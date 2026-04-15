# How to Configure Docker Networking for Dapr Self-Hosted

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Networking, Self-Hosted, Container

Description: Learn how to configure Docker networking for Dapr in self-hosted mode so services and sidecars can communicate reliably on custom networks.

---

## Dapr Self-Hosted Networking Basics

In Dapr self-hosted mode, each service runs its own Dapr sidecar process. When running services in Docker containers, the sidecar needs to reach the app container and vice versa. By default, the Dapr CLI starts the sidecar as a child process on `localhost`, but in Docker you need explicit network configuration.

## Creating a Dedicated Docker Network

Create a named bridge network for all Dapr services:

```bash
docker network create dapr-network
```

This gives all containers on `dapr-network` DNS-based name resolution using their container names.

## Running Dapr Services on the Same Network

Start each service container on the shared network. The sidecar is started separately using `dapr run` pointing to the app container:

```bash
# Start the app container
docker run -d \
  --name order-service \
  --network dapr-network \
  -p 3000:3000 \
  order-service:1.0.0

# Start the Dapr sidecar pointing to the app container
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  --app-channel-address order-service \
  --components-path ./components \
  -- echo "sidecar started"
```

The `--app-channel-address` flag tells the sidecar to use `order-service` (the container name) instead of `localhost` to reach the app.

## Docker Compose with Custom Networks

Using Docker Compose is the recommended approach for multi-service Dapr apps in self-hosted mode. Define a shared network and let Compose handle DNS:

```yaml
networks:
  dapr-network:
    driver: bridge

services:
  redis:
    image: redis:7-alpine
    networks:
      - dapr-network
    ports:
      - "6379:6379"

  order-service:
    image: order-service:1.0.0
    networks:
      - dapr-network
    ports:
      - "3000:3000"
    environment:
      - DAPR_HTTP_PORT=3500

  order-service-dapr:
    image: daprio/daprd:1.17.4
    command: [
      "./daprd",
      "--app-id", "order-service",
      "--app-port", "3000",
      "--app-channel-address", "order-service",
      "--dapr-http-port", "3500",
      "--components-path", "/components"
    ]
    volumes:
      - ./components:/components
    networks:
      - dapr-network
    depends_on:
      - order-service
```

## Exposing the Dapr HTTP API to the Host

To call the Dapr HTTP API from your host machine (for debugging or testing), expose the sidecar port:

```yaml
  order-service-dapr:
    ports:
      - "3500:3500"
```

Then invoke any method from your terminal:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

## Troubleshooting Network Issues

Check that containers can reach each other by running a connectivity test:

```bash
docker run --rm --network dapr-network alpine ping -c 3 order-service
docker run --rm --network dapr-network alpine wget -qO- http://order-service:3000/healthz
```

Inspect container network settings:

```bash
docker inspect order-service --format '{{json .NetworkSettings.Networks}}'
```

## Summary

Configuring Docker networking for Dapr self-hosted mode requires a shared network so sidecars and app containers can resolve each other by name. Using Docker Compose with a custom bridge network and the `--app-channel-address` flag for the sidecar is the most reliable approach for local multi-service Dapr development.
