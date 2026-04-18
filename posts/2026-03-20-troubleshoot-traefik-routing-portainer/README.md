# How to Troubleshoot Traefik Routing Issues with Portainer - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traefik, Portainer, Docker, Reverse Proxy, Troubleshooting, Routing

Description: Learn how to diagnose and fix Traefik routing issues when using Portainer for container management, including router misconfiguration, middleware errors, and network problems.

## Introduction

Traefik is a powerful reverse proxy with dynamic configuration via Docker labels. When routing breaks, the Traefik dashboard and logs are your primary diagnostic tools. This guide covers the most common routing problems and their solutions.

## Step 1: Access the Traefik Dashboard

The Traefik dashboard (typically at `:8080/dashboard/`) shows all configured routers, services, and middleware.

Check:
- **Routers** tab - verify your router appears and shows no errors
- **Services** tab - confirm the service has healthy backends
- **Middlewares** tab - check for misconfigured middleware

## Step 2: Check Traefik Logs

```bash
docker logs traefik --tail=100 -f
```

Enable debug logging for more detail:

```yaml
command:
  - "--log.level=DEBUG"
```

Common error patterns:
- `router not found` - label configuration incorrect
- `service not found` - service name mismatch
- `middleware not found` - middleware referenced but not defined

## Step 3: Verify Docker Labels

Ensure your container has the correct labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
  - "traefik.http.routers.myapp.entrypoints=websecure"
  - "traefik.http.services.myapp.loadbalancer.server.port=8080"
```

Common mistakes:
- `traefik.enable=true` missing (if `exposedByDefault=false`)
- Wrong port number
- Mismatched router and service names

## Step 4: Check Network Connectivity

Traefik must be on the same Docker network as the container:

```bash
docker network inspect proxy
docker inspect myapp | grep Networks -A10
docker inspect traefik | grep Networks -A10
```

If missing from the network:

```bash
docker network connect proxy myapp
```

## Step 5: Verify Entry Points

Check that the entrypoint in the label matches a configured entrypoint:

```bash
docker inspect traefik | grep -A5 "Cmd"
# Look for: --entrypoints.websecure.address=:443

```

## Step 6: Rule Syntax Issues

Test router rules with the Traefik dashboard route debugger. Common syntax errors:

```yaml
# Wrong - missing backticks
- "traefik.http.routers.app.rule=Host(app.example.com)"

# Correct
- "traefik.http.routers.app.rule=Host(`app.example.com`)"

# Correct - combining matchers with &&
- "traefik.http.routers.app.rule=Host(`app.example.com`) && PathPrefix(`/api`)"
```

## Step 7: Middleware Ordering

Middleware is applied in the order defined. If authentication middleware is blocking requests:

```bash
docker logs traefik 2>&1 | grep "middleware\|auth" | tail -20
```

## Step 8: Reload Configuration

Traefik automatically reloads on Docker events. Force a reload:

```bash
docker restart traefik
```

## Conclusion

Troubleshooting Traefik routing starts with the dashboard to see the state of routers and services, then moves to logs for error details. Most issues stem from label typos, wrong port numbers, or network connectivity between Traefik and the target container.
