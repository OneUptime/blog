# Best Practices for Network Configuration in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Networking, Security, Best Practice, Network Isolation, Firewall

Description: Configure Docker networks in Portainer following security and operational best practices, including network isolation, custom subnets, and segmentation strategies.

---

Docker networking defaults are convenient but not production-ready. This guide covers network configuration best practices in Portainer to improve security, reduce blast radius from compromised containers, and enable predictable container communication.

## Default Network Problems

The default `bridge` network has issues for production:

- All containers on the default bridge can communicate by IP
- No DNS-based service discovery on the default bridge
- No isolation between unrelated services
- Shared bridge network increases lateral movement risk

## Best Practice 1: Use Custom Bridge Networks

Create a custom network for each application or set of related services:

```yaml
# Good: Each service group has its own isolated network

services:
  webapp:
    image: myapp:1.2.3
    networks:
      - frontend   # Can talk to nginx
      - backend    # Can talk to database

  nginx:
    image: nginx:1.25
    networks:
      - frontend   # Only talks to webapp and internet
    ports:
      - "80:80"

  postgres:
    image: postgres:16
    networks:
      - backend    # Only accessible to webapp

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # Externally isolate database traffic on this network
```

## Best Practice 2: Use `internal: true` for Databases

Place database traffic on an externally isolated network:

```yaml
networks:
  db-net:
    driver: bridge
    internal: true   # Create an externally isolated network
```

## Best Practice 3: Custom Subnets

Avoid IP range conflicts with custom subnets:

```yaml
networks:
  app-net:
    driver: bridge
    ipam:
      config:
        - subnet: "172.20.0.0/16"     # Custom subnet range
          gateway: "172.20.0.1"
```

Use a CIDR allocation plan to avoid overlapping with:
- Host networks
- VPN ranges
- Other Docker networks

## Best Practice 4: Network Segmentation by Function

Separate networks by security zone:

```text
Public-facing   → containers that accept external connections
Application     → service-to-service communication
Data            → database connections
Management      → Portainer agent, monitoring, logging
```

## Best Practice 5: macvlan for Bare Metal Integration

When containers need to appear on the physical network (IoT, legacy apps):

```yaml
networks:
  physical-net:
    driver: macvlan
    driver_opts:
      parent: eth0        # Physical network interface
    ipam:
      config:
        - subnet: "192.168.1.0/24"
          gateway: "192.168.1.1"
          ip_range: "192.168.1.240/28"  # Reserve a range for containers
```

## Best Practice 6: Overlay Networks for Swarm

For multi-host Docker Swarm deployments, use encrypted overlay networks:

```yaml
networks:
  swarm-app-net:
    driver: overlay
    driver_opts:
      encrypted: "true"   # Encrypt traffic between Swarm nodes
    attachable: true      # Allow non-Swarm containers to attach
```

## Inspect Networks via Portainer

Use Portainer's **Networks** view to:
- See the networks configured in your environment
- Add or remove networks as needed
- Review IP range, subnet, gateway, and isolation settings
- Check which networks a container is attached to from container details

## Cleanup Orphaned Networks

Schedule regular cleanup of unused networks:

```bash
# Remove networks not used by any container
docker network prune -f

# This is safe to run - it only removes networks with no connected containers
```

## Summary

Production-ready Docker networking requires custom bridge networks per application, `internal: true` for database networks, custom subnets to prevent conflicts, and network segmentation by security zone. Portainer's network management view makes it easy to audit and clean up your network configuration.
