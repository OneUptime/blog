# How to Use Docker Volumes with Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Volume, Component, Configuration

Description: Learn how to mount Dapr component configuration files into containers using Docker volumes so sidecars load the correct components at startup.

---

## Why Docker Volumes for Dapr Components

Dapr loads component definitions (state stores, pub/sub brokers, bindings) from YAML files in a components directory. When running Dapr in Docker, you need to make these files available inside the sidecar container. Docker volumes are the standard way to mount local directories or named volumes into containers at specific paths.

## Mounting a Local Components Directory

The Dapr sidecar container requires an explicit components path passed via `--components-path` (or the newer `--resources-path`). Mount your local `./components` directory using a bind mount and point the sidecar to it:

```bash
docker run -d \
  --name order-service-dapr \
  --network dapr-network \
  -v "$(pwd)/components:/components" \
  daprio/daprd:1.13.0 \
  ./daprd \
    --app-id order-service \
    --app-port 3000 \
    --app-channel-address order-service \
    --components-path /components
```

Your `./components/statestore.yaml` becomes available at `/components/statestore.yaml` inside the container.

## Structuring Your Components Directory

Organize components by environment to make switching easy:

```text
components/
  local/
    statestore.yaml
    pubsub.yaml
  production/
    statestore.yaml
    pubsub.yaml
```

A typical local Redis state store component:

```yaml
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
  - name: redisPassword
    value: ""
  - name: actorStateStore
    value: "true"
```

## Using Docker Compose Volumes

In Docker Compose, define named volumes or bind mounts under each service:

```yaml
version: "3.9"
services:
  order-service-dapr:
    image: daprio/daprd:1.13.0
    command: [
      "./daprd",
      "--app-id", "order-service",
      "--app-port", "3000",
      "--app-channel-address", "order-service",
      "--components-path", "/components",
      "--config", "/config/config.yaml"
    ]
    volumes:
      - ./components/local:/components
      - ./config:/config
    networks:
      - dapr-network
    depends_on:
      - redis
```

## Secrets in Volume-Mounted Files

Avoid storing secrets directly in component YAML files. Instead, use Dapr's local secret store component and mount a separate secrets file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: /secrets/secrets.json
  - name: nestedSeparator
    value: ":"
```

Mount the secrets file as a read-only volume:

```yaml
volumes:
  - ./secrets/local.json:/secrets/secrets.json:ro
```

## Verifying Components Are Loaded

Check the sidecar logs to confirm components loaded correctly:

```bash
docker logs order-service-dapr | grep -i "component"
```

You should see lines like:

```text
time="2026-03-31T10:00:00.000000000Z" level=info msg="Component loaded: statestore (state.redis/v1)" app_id=order-service instance=abc123 scope=dapr.runtime type=log ver=1.13.0
```

If a component fails to load, the log shows the error with the component name and reason.

## Summary

Docker volumes give Dapr sidecars access to component configuration files without baking them into the container image. Using bind mounts for local development and separate directories per environment makes it easy to switch between local Redis and production Azure Service Bus without changing the application code or the container image.
