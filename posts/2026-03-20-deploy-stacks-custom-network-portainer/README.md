# How to Deploy Stacks with Custom Network Configurations in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Networking, Custom Networks, Stack, DevOps

Description: Configure custom Docker networks in Portainer stacks with specific drivers, subnets, and isolation settings to control how services communicate within and between stacks.

---

Custom network configurations in Portainer stacks let you control service communication boundaries, assign specific IP ranges, and isolate applications from each other.

## Custom Bridge Network with Subnet

```yaml
services:
  webapp:
    image: myapp:1.2.3
    networks:
      - frontend
      - backend

  database:
    image: postgres:16-alpine
    networks:
      - backend    # Only accessible from backend network

  nginx:
    image: nginx:1.25
    ports:
      - "80:80"
    networks:
      - frontend   # Only needs to reach the web app

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: "172.20.0.0/24"
          gateway: "172.20.0.1"

  backend:
    driver: bridge
    internal: true    # Externally isolated backend network
    ipam:
      config:
        - subnet: "172.21.0.0/24"
          gateway: "172.21.0.1"
```

## Connecting Stacks via External Networks

To allow services in different stacks in the same Docker environment to communicate, deploy the stack that creates the network first, then attach the second stack to it:

```yaml
# stack-a.yml
services:
  api:
    image: my-api:1.0
    networks:
      - shared-net

networks:
  shared-net:
    name: shared-application-network
    driver: bridge

# stack-b.yml - connects to the same network
services:
  worker:
    image: my-worker:1.0
    networks:
      - shared-net

networks:
  shared-net:
    external: true    # Don't create - use existing
    name: shared-application-network
```

## Overlay Networks for Swarm

For multi-host Docker Swarm deployments in Portainer:

```yaml
networks:
  app-overlay:
    driver: overlay
    driver_opts:
      encrypted: "true"   # Encrypt traffic between Swarm nodes
    attachable: true
```

## Summary

Custom network configurations in Portainer stacks enable precise control over service communication. Use `internal: true` to create externally isolated database networks, custom subnets to prevent conflicts, and external networks to connect services across stacks in the same Docker environment.
