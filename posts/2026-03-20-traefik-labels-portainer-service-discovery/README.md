# How to Use Traefik Labels for Portainer Service Discovery - Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Service Discovery, Docker Labels, Routing

Description: Learn how to use Docker labels to configure Traefik routing rules for containers deployed via Portainer, enabling automatic service discovery without any configuration files.

## How Traefik Label-Based Discovery Works

With the Docker provider enabled, Traefik watches the Docker socket and automatically detects containers. In setups where `exposedByDefault=false`, containers need `traefik.enable=true` to opt in. When Portainer deploys a container with the right labels, Traefik picks it up and starts routing traffic to it - no restarts needed.

```text
Portainer deploys container with labels
        ↓
Traefik detects new container via Docker socket
        ↓
Traefik creates router + service from labels
        ↓
Traffic routes to container immediately
```

## Essential Labels Reference

```yaml
labels:
  # Required when exposedByDefault=false: opt this container into Traefik
  - "traefik.enable=true"

  # Router: define how requests are matched
  - "traefik.http.routers.<name>.rule=Host(`app.example.com`)"
  - "traefik.http.routers.<name>.entrypoints=websecure"

  # TLS
  - "traefik.http.routers.<name>.tls=true"
  - "traefik.http.routers.<name>.tls.certresolver=letsencrypt"

  # Service: define which port to forward to
  - "traefik.http.services.<name>.loadbalancer.server.port=8080"
```

## Routing Rules

```yaml
# Match by hostname

- "traefik.http.routers.app.rule=Host(`app.example.com`)"

# Match by path prefix
- "traefik.http.routers.api.rule=Host(`example.com`) && PathPrefix(`/api`)"

# Match multiple hosts
- "traefik.http.routers.app.rule=Host(`app.example.com`) || Host(`www.example.com`)"

# Match by method
- "traefik.http.routers.app.rule=Host(`example.com`) && Method(`POST`)"

# Match with regex
- "traefik.http.routers.app.rule=HostRegexp(`^[a-z]+\\.example\\.com$`)"
```

## Full Example: Web App with HTTPS

```yaml
# In Portainer: Stacks > Add Stack
services:
  webapp:
    image: myapp:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Router configuration
      - "traefik.http.routers.webapp.rule=Host(`app.example.com`)"
      - "traefik.http.routers.webapp.entrypoints=websecure"
      - "traefik.http.routers.webapp.tls=true"
      - "traefik.http.routers.webapp.tls.certresolver=letsencrypt"
      # Service configuration
      - "traefik.http.services.webapp.loadbalancer.server.port=3000"
      # Optional: health check
      - "traefik.http.services.webapp.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.webapp.loadbalancer.healthcheck.interval=10s"

networks:
  proxy:
    external: true
```

## Example: API Behind Path Prefix

```yaml
services:
  api:
    image: myapi:latest
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Route /api requests to this service
      - "traefik.http.routers.api.rule=Host(`example.com`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls=true"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=8080"
      # Strip the /api prefix before forwarding
      - "traefik.http.middlewares.api-strip.stripprefix.prefixes=/api"
      - "traefik.http.routers.api.middlewares=api-strip"
```

## Priority: Resolving Routing Conflicts

When multiple routers could match a request, Traefik uses router priority. By default, priority is based on rule length, so set explicit priorities when rules overlap:

```yaml
# This more specific rule takes priority
- "traefik.http.routers.admin.rule=Host(`example.com`) && PathPrefix(`/admin`)"
- "traefik.http.routers.admin.priority=10"

# Less specific fallback
- "traefik.http.routers.app.rule=Host(`example.com`)"
- "traefik.http.routers.app.priority=1"
```

## Verifying Discovery

```bash
# If the Traefik API is exposed locally on :8080, check discovered routers
curl http://localhost:8080/api/http/routers | jq '.[] | {name: .name, rule: .rule}'

# Check discovered services
curl http://localhost:8080/api/http/services | jq '.[] | {name: .name}'
```

## Conclusion

Traefik's label-based service discovery means deploying a new service through Portainer and exposing it over HTTPS requires only adding the right labels to the container. No per-service Traefik configuration files need to be changed, no restarts required, and Portainer's deployment workflow integrates seamlessly with Traefik's automatic discovery.
