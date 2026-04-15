# How to Debug Dapr Applications in Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Debugging, Container, Troubleshooting

Description: Learn how to debug Dapr applications running in Docker containers by inspecting logs, using exec to enter containers, and enabling verbose sidecar logging.

---

## Debugging Dapr Apps Running in Docker

When Dapr applications run as Docker containers, debugging requires working with both the application container and the Dapr sidecar container (or process). Docker provides several tools to inspect running containers, view logs, and execute commands directly inside them.

## Viewing Logs for App and Sidecar Containers

With Docker Compose, view logs for all services at once:

```bash
docker compose logs -f
```

View logs for a specific service:

```bash
docker compose logs -f order-service
docker compose logs -f order-service-dapr
```

Filter sidecar logs for errors only:

```bash
docker compose logs order-service-dapr 2>&1 | grep -i "error\|fatal\|warn"
```

For standalone Docker containers:

```bash
docker logs order-service-dapr --tail 100 --follow
```

## Enabling Debug Logging in the Dapr Sidecar

Set the `--log-level` flag to `debug` on the `daprd` container for verbose output:

```yaml
# docker-compose.yml
services:
  order-service-dapr:
    image: daprio/daprd:1.13.0
    command: [
      "./daprd",
      "--app-id", "order-service",
      "--app-port", "3000",
      "--app-channel-address", "order-service",
      "--log-level", "debug",
      "--resources-path", "/components"
    ]
```

Debug logs show every request and response between the app and sidecar:

```text
time="2026-03-31T10:00:00Z" level=debug msg="invoke request" app_id=order-service method=orders
time="2026-03-31T10:00:00Z" level=debug msg="invoke response" status=200 latency=12ms
```

## Exec Into the Sidecar Container

Run commands inside the sidecar container to test connectivity:

```bash
docker exec -it order-service-dapr sh
```

Inside the container, test that it can reach the app:

```bash
wget -qO- http://order-service:3000/healthz
```

Test that the sidecar health endpoint is responding:

```bash
wget -qO- http://localhost:3500/v1.0/healthz
```

Check what the metadata endpoint reports:

```bash
wget -qO- http://localhost:3500/v1.0/metadata
```

## Inspecting Container Environment

View environment variables that the sidecar sees:

```bash
docker inspect order-service-dapr --format '{{json .Config.Env}}' | jq
```

Check the container's running command to verify flags:

```bash
docker inspect order-service-dapr --format '{{json .Config.Cmd}}' | jq
```

Verify the components mount:

```bash
docker exec order-service-dapr ls -la /components
```

## Testing Dapr APIs from the Host Machine

If you expose the sidecar port to the host, you can call the Dapr HTTP API directly from your terminal:

```yaml
services:
  order-service-dapr:
    ports:
      - "3500:3500"  # Expose sidecar HTTP port
```

Then from your host:

```bash
# Check sidecar health
curl http://localhost:3500/v1.0/healthz

# Invoke a method
curl http://localhost:3500/v1.0/invoke/order-service/method/orders

# Check state store
curl http://localhost:3500/v1.0/state/statestore/product:123

# Publish a test event
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test-001"}'
```

## Checking Container Resource Usage

If the sidecar or app is consuming unexpected CPU or memory:

```bash
docker stats order-service order-service-dapr
```

Identify which container is consuming resources and check if it is a memory leak or runaway loop:

```bash
docker top order-service-dapr
```

## Summary

Debugging Dapr applications in Docker containers relies on `docker logs` for log inspection, `docker exec` for running commands inside containers, and exposing the sidecar HTTP port to call Dapr APIs directly from the host. Enabling `--log-level debug` on the sidecar provides detailed request/response traces that make it straightforward to pinpoint where a request is failing in the Dapr building block chain.
