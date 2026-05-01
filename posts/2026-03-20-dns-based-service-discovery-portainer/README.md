# How to Set Up DNS-Based Service Discovery in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, DNS, Service Discovery, Networking, Microservice

Description: Use Docker's built-in DNS resolver and custom DNS configurations in Portainer stacks for reliable service-to-service communication using container and service names.

---

Docker provides automatic DNS-based service discovery for containers on the same user-defined network. Services can reference each other by container name or service name without hardcoding IP addresses.

## How Docker DNS Works

Containers attached to a user-defined network use Docker's embedded DNS resolver at `127.0.0.11`. When a container makes a DNS query for another container's name or service name, Docker resolves it to the container's IP on that network.

```bash
# From inside a container on the same user-defined network:

PGPASSWORD=password psql -h database -U myapp -d mydb   # Connects to the Postgres service by service name
redis-cli -h cache ping                                 # Connects to the Redis service by service name
curl http://api:8080                                    # Connects to the API service by service name
```

## Same-Network Service Discovery

Services on the same custom Docker network discover each other automatically:

```yaml
services:
  api:
    image: myapi:1.2.3
    environment:
      # Use service names as hostnames
      - DATABASE_URL=postgres://myapp:password@database:5432/mydb
      - REDIS_URL=redis://cache:6379
    networks:
      - app-net    # Must be on same network as database and cache

  database:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    networks:
      - app-net

  cache:
    image: redis:7-alpine
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

## Aliases for Flexible DNS Names

Assign multiple DNS names to a service using network aliases:

```yaml
services:
  postgres-primary:
    image: postgres:16-alpine
    networks:
      app-net:
        aliases:
          - database           # Other containers can use 'database' as hostname
          - db                 # Short alias
          - postgres           # Standard name
```

## Cross-Stack Service Discovery

For services in different Portainer stacks to discover each other:

```yaml
# Stack A - creates the shared network
networks:
  shared-services:
    name: shared-services-network
    driver: bridge
```

```yaml
# Stack B - joins the shared network
networks:
  shared-services:
    external: true
    name: shared-services-network
```

## DNS Aliases for Blue/Green Deployments

Use aliases to simplify cutover between versions:

```yaml
services:
  app-v2:
    image: myapp:2.0.0
    networks:
      app-net:
        aliases:
          - app    # Move this alias during cutover; don't assign it to both versions at once
```

## Custom DNS Resolvers

Set custom DNS servers and search domains for containers that need external name resolution:

```yaml
services:
  webapp:
    image: myapp:1.2.3
    dns:
      - 8.8.8.8           # Google DNS
      - 1.1.1.1           # Cloudflare DNS
    dns_search:
      - internal.example.com   # Search domain for unqualified names
```

## Summary

Docker's built-in DNS resolver provides automatic service discovery for containers on the same user-defined network. Use custom networks instead of the default bridge for reliable DNS resolution, network aliases for flexible hostname assignment, and external networks to connect services across Portainer stacks.
