# How to Set Up Inter-Service Communication in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Microservice, Docker Network, Service Communication, DNS, Container Networking

Description: Learn how to configure inter-service communication between containers in Portainer using Docker networks and DNS-based service discovery.

---

Services in a Portainer-managed Docker environment communicate through shared Docker networks. Understanding how Docker's built-in DNS resolves service names on user-defined networks enables reliable service-to-service communication.

## Docker's Built-in Service DNS

When containers share a user-defined Docker network, they can reach each other by container name or alias. In Compose stacks, services on the same network are also discoverable by service name. Docker's embedded DNS automatically resolves these names to container IPs:

```bash
# From inside container A, reach container B by service name

curl http://user-service:3001/api/users
#           ^^^^^^^^^^^  Service name from compose
#                        resolves to container IP automatically
```

## Setting Up a Shared Network

**Option 1: Single Compose Stack (simplest)**

Services in the same Compose stack share a default network automatically:

```yaml
services:
  web:
    image: nginx:alpine
  api:
    image: node:20-alpine
    # 'web' can reach 'api' as: http://api:3000
```

**Option 2: Named Network for Cross-Stack Communication**

```yaml
networks:
  shared_net:
    name: shared_network    # Fixed name so other stacks can join

services:
  api:
    image: myapi:latest
    networks:
      - shared_net
```

In a second stack, join the same network:

```yaml
networks:
  shared_net:
    external: true          # Network already exists
    name: shared_network

services:
  worker:
    image: myworker:latest
    networks:
      - shared_net
    # Can now reach 'api' from the other stack
```

## Testing Connectivity

```bash
# Test from inside a container via Portainer Console (if curl is installed)
curl -f http://api:3000/health && echo "Connected" || echo "Failed"

# DNS resolution test (if nslookup is installed)
nslookup api
# Returns the IP address for 'api' on the shared network
```

## Service Communication Patterns

```javascript
// Node.js service calling another service by service name
async function getUserById(userId) {
  // Use the service name, not a container IP
  const res = await fetch(`http://user-service:3001/users/${userId}`);
  return res.json();
}
```

## Isolating Services

Use separate networks to control which services can communicate:

```yaml
services:
  frontend:
    networks:
      - frontend_net       # Can reach nginx
  nginx:
    networks:
      - frontend_net       # Bridges frontend and backend
      - backend_net
  api:
    networks:
      - backend_net        # Cannot be reached by frontend directly

networks:
  frontend_net:
  backend_net:
```
