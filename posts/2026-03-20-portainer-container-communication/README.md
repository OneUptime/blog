# How to Set Up Container-to-Container Communication in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Container Networking, Docker, Inter-Container Communication, Service Discovery

Description: Learn how to configure container-to-container communication in Portainer using shared networks, service names, and network scoping.

---

In Portainer-managed Compose stacks, containers communicate by sharing a Docker network and using service names as hostnames. Portainer stacks automatically create a default shared network, but cross-stack communication requires explicit network configuration.

## Same-Stack Communication

Containers in the same Compose stack share a default network and can reach each other by service name:

```yaml
services:
  frontend:
    image: nginx:alpine
    # Can call: http://api:3000

  api:
    image: my-api:latest
    # Can call: postgres:5432, redis:6379

  postgres:
    image: postgres:15

  redis:
    image: redis:7-alpine
```

All four services are automatically placed on the stack's default network, typically named `{stack-name}_default`. Docker's embedded DNS resolves `postgres` to the PostgreSQL service, `redis` to the Redis service, and so on.

## Cross-Stack Communication

When services are in separate stacks, use a shared named network. One stack can create it with a fixed name, and another stack can reference it as external:

```yaml
# Stack 1: database stack

services:
  postgres:
    networks:
      - shared_data_net

networks:
  shared_data_net:
    driver: bridge
    name: shared_data_net   # Explicit name so other stacks can reference it
```

```yaml
# Stack 2: application stack
services:
  api:
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
    networks:
      - shared_data_net

networks:
  shared_data_net:
    external: true   # References the network from stack 1
```

Deploy the database stack first (it creates the network), then deploy the application stack.

## Communication Patterns

| Scenario | Solution |
|----------|----------|
| Same stack, direct | Use service name: `http://api:3000` |
| Different stacks / different Compose projects | External named network |
| Cross-host (Swarm) | Overlay network |
| External access | Port mapping to host |

## Verifying Container Connectivity

Test DNS resolution and port reachability from inside a container. These examples assume the image includes `nslookup`, `nc`, and `curl`:

```bash
# DNS resolution test
docker exec -it $(docker ps -qf name=api) nslookup postgres

# TCP port test
docker exec -it $(docker ps -qf name=api) nc -zv postgres 5432

# HTTP health check
docker exec -it $(docker ps -qf name=frontend) \
  curl -fsS http://api:3000/health
```

## Limiting Communication with Network Segmentation

Use multiple networks to restrict which services can talk to which:

```yaml
services:
  nginx:
    networks:
      - public    # Accepts external traffic

  api:
    networks:
      - public    # Receives traffic from nginx
      - private   # Can reach database

  postgres:
    networks:
      - private   # Not reachable from nginx directly

networks:
  public:
    driver: bridge
  private:
    driver: bridge
    internal: true   # No internet egress
```

This pattern ensures Nginx cannot directly query the database - it must go through the API layer.

## Overlay Networks for Swarm

For multi-host communication in Docker Swarm, use overlay networks:

```yaml
networks:
  app_overlay:
    driver: overlay
    attachable: true   # Allow standalone containers to attach
```

Create the network manually before deploying if it needs to be shared across stacks:

```bash
docker network create \
  --driver overlay \
  --attachable \
  --subnet 10.20.0.0/24 \
  shared_overlay
```

## Debugging Network Issues in Portainer

From Portainer's **Networks** view, click any network to see:

- All connected containers and their IP addresses
- IPAM subnet configuration
- Network driver and options

Cross-reference with container logs if a service can't reach another - the most common cause is the two containers being on different networks despite appearing in the same stack.
