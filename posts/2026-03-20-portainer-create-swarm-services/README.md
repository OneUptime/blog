# How to Create Services in Portainer on Docker Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Service, DevOps

Description: Learn how to create and configure Docker Swarm services using the Portainer UI for reliable multi-node deployments.

## Introduction

Docker Swarm services are the primary deployment unit in a Swarm cluster. Unlike standalone containers, services define desired state - how many replicas, what image, what networks - and Swarm ensures that state is maintained across the cluster. Portainer provides a full-featured UI for creating and managing Swarm services. This guide walks through the complete service creation process.

## Prerequisites

- Portainer installed on Docker Swarm
- A running Swarm cluster with at least one manager
- Admin or operator access in Portainer

## Step 1: Navigate to Services

1. In Portainer, select your Swarm environment
2. Click **Services** in the left sidebar
3. Click **+ Add service**

## Step 2: Configure Basic Settings

### Name and Image

```text
Service name:  web-frontend
Image:         nginx:alpine
```

### Service Mode

| Mode | Description |
|------|-------------|
| **Replicated** | Run a specified number of identical tasks |
| **Global** | Run one task on every node that meets constraints |

Select **Replicated** for most services. Use **Global** for agents, log shippers, or services that must run on every node.

### Replica Count

```text
Replicas: 3    # Run 3 copies distributed across nodes
```

## Step 3: Configure Port Publishing

Click **+ Publish a new network port**:

```text
Protocol:          TCP
Target port:       80       (container port)
Published port:    80       (host/cluster port)
Mode:              Ingress  (or Host)
```

**Ingress mode** - Uses the Swarm routing mesh; any node can receive traffic on port 80 and forward it to a container running anywhere in the cluster. This is the recommended mode.

**Host mode** - Publishes the port directly on the node where the container runs; no routing mesh.

If you use **Host** mode with a fixed published port, only one task for that service can bind that port on a given node.

## Step 4: Configure Placement Constraints

Restrict where the service runs:

```text
Constraint:  node.role==worker         # Only on worker nodes
Constraint:  node.labels.zone==us-east # Only in us-east zone
```

Add constraints from the **Placement** section.

## Step 5: Configure Resource Limits

```text
Memory limit:      256m
Memory reserve:    128m
CPU limit:         0.5
CPU reserve:       0.25
```

Limits prevent a service from consuming all resources on a node. Reserves ensure minimum resources are available when the task starts.

## Step 6: Configure Volumes

Under **Volumes**, click **+ Map an additional volume**:

```text
Volume type:    Named volume
Source:         nginx-data
Target:         /usr/share/nginx/html
```

Or for a bind mount:

```text
Volume type:    Bind
Source:         /data/www
Target:         /usr/share/nginx/html
Access:         Read/Write
```

With the default `local` volume driver, named volumes are node-local in Swarm rather than automatically shared across replicas. For bind mounts, ensure the source path exists on every node that can run the service.

## Step 7: Configure Environment Variables

Under **Env**, add variables:

```text
NGINX_HOST=example.com
NGINX_PORT=80
APP_ENV=production
```

## Step 8: Configure Networks

Under **Networks**, select overlay networks for the service to join:

```text
Network:  my-overlay-network    # Service joins this overlay network
```

Services on the same overlay network can communicate using service name DNS resolution.

## Step 9: Configure Labels

Add Docker labels for service metadata or proxy routing:

```text
com.example.service=frontend
traefik.enable=true
traefik.http.routers.web.rule=Host(`example.com`)
```

## Step 10: Create the Service

1. Review all settings
2. Click **Create the service**
3. Portainer creates the Swarm service and the Swarm manager schedules tasks on appropriate nodes

## Step 11: Verify Service Deployment

After creation:

1. The Services list shows the new service
2. Click the down-arrow to the left of the service to see:
   - **Tasks** - Individual container instances and their node placement
3. Click the service name to access:
   - **Service logs** - Docker logs for the service
   - **Update** - Modify the service configuration

```bash
# Verify from a swarm manager node

docker service ls
docker service ps web-frontend
```

Example `docker service ls` output:

```text
ID            NAME           MODE         REPLICAS  IMAGE
abc123def456  web-frontend   replicated   3/3       nginx:alpine
```

Example `docker service ps web-frontend` output:

```text
ID            NAME              IMAGE         NODE       DESIRED STATE  CURRENT STATE         ERROR  PORTS
qihejybwf1x5  web-frontend.1    nginx:alpine  worker-01  Running        Running 2 minutes ago
r8yt076polmc  web-frontend.2    nginx:alpine  worker-02  Running        Running 2 minutes ago
8eaxrb2fqpbn  web-frontend.3    nginx:alpine  worker-03  Running        Running 2 minutes ago
```

## Creating a Service via Docker CLI

For reference, a comparable CLI command for the core settings above:

```bash
# Run on a swarm manager node
docker service create \
  --name web-frontend \
  --replicas 3 \
  --publish published=80,target=80,mode=ingress \
  --mount type=volume,source=nginx-data,target=/usr/share/nginx/html \
  --constraint node.role==worker \
  --network my-overlay-network \
  --limit-cpu 0.5 \
  --reserve-cpu 0.25 \
  --limit-memory 256m \
  --reserve-memory 128m \
  --env APP_ENV=production \
  --label com.example.service=frontend \
  nginx:alpine
```

## Conclusion

Creating Swarm services in Portainer is straightforward and covers the main options you would configure via the Docker CLI. By using the Portainer UI, you get immediate visual feedback on service placement, task status, and resource usage. For production services, always configure resource limits, placement constraints, and update policies to ensure reliable deployments.
