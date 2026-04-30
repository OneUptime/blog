# Validation Summary: How to Set Up Inter-Service Communication in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker bridge networking
- Python
- HTTPX
- Tenacity
- gRPC for Go
- RabbitMQ
- Pika
- Go
- sony/gobreaker

## Sources Consulted
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Bridge network driver": https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs, "Define services in Docker Compose": https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Control startup and shutdown order in Compose": https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, "Networking in Compose": https://docs.docker.com/compose/how-tos/networking/
- Docker Docs, "`docker compose exec`": https://docs.docker.com/compose/reference/exec
- Portainer Docs, "Networks": https://docs.portainer.io/user/docker/networks
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- gRPC Docs, "Service Config": https://grpc.io/docs/guides/service-config/
- Go package docs, `google.golang.org/grpc`: https://pkg.go.dev/google.golang.org/grpc
- HTTPX Docs, "Timeouts": https://www.python-httpx.org/advanced/timeouts/
- Tenacity Docs: https://tenacity.readthedocs.io/en/stable/
- RabbitMQ Docs, "Queues": https://www.rabbitmq.com/docs/queues
- RabbitMQ Docs, "Exchanges": https://www.rabbitmq.com/docs/exchanges
- RabbitMQ Docs, "AMQP 0-9-1 Model Explained": https://www.rabbitmq.com/tutorials/amqp-concepts
- Pika Docs, "Connection Parameters": https://pika.readthedocs.io/en/stable/modules/parameters.html
- Go package docs, `net/http`: https://pkg.go.dev/net/http
- Go package docs, `github.com/sony/gobreaker`: https://pkg.go.dev/github.com/sony/gobreaker

## Issues Found
- The Compose snippets used top-level `version: "3.8"` fields. I removed them because current Compose treats `version` as obsolete and only keeps it for backward compatibility.
- The post metadata and shared-network example labeled basic Docker bridge networking as "service mesh". I removed the inaccurate `Service Mesh` tag, replaced the example label with "shared network", and removed the unnecessary `enable_icc` block because Docker documents it as an inter-container connectivity flag, not a DNS setting.
- The gRPC client snippet used the older `loadBalancingPolicy` JSON shape. I updated it to the current `loadBalancingConfig` form from the gRPC service-config guide and changed the `50051` comment from "default" to "common" because gRPC does not define a universal default port.
- The RabbitMQ publisher and consumer snippets were missing required Python imports. I added the missing imports so the examples are internally consistent.
- The RabbitMQ consumer declared an exclusive server-named queue, which is transient and not appropriate for a "reliable" messaging example. I changed it to a named durable queue to align with RabbitMQ's durability guidance for persistent messages.
- The circuit-breaker example returned an undefined `body` value. I fixed it by reading the response body with `io.ReadAll`.
- The circuit-breaker example used the default HTTP client path with no timeout, which weakens the resilience story. I added an `http.Client` timeout and explicit 5xx handling so request failures can contribute to tripping the breaker.
- The monitoring commands used `docker exec service_a` and `docker network inspect services_net`, which do not match default Compose naming. I changed the commands to `docker compose exec` for service access and documented the project-prefixed network name for `docker network inspect`.
- The conclusion claimed a specific Portainer "network view" behavior that was broader than the Portainer docs I verified. I tightened the wording to Portainer's documented network-management and container-inspection capabilities.

## Review Notes
- The networking examples use Docker bridge networks, which Docker scopes to containers on the same Docker daemon host. For multi-host Swarm communication, overlay networks are the relevant pattern.
- The gRPC example uses `insecure.NewCredentials()`. That is acceptable for trusted internal traffic, but production inter-service gRPC usually uses TLS or mTLS.
- The validation-focused diagnostic commands assume the container image includes tools such as `curl` or `nslookup`.
