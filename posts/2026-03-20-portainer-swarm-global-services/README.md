# How to Set Up Global Services (DaemonSet Equivalent) in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Global Service, Infrastructure, Monitoring

Description: Deploy Docker Swarm global services that run one instance per node, equivalent to Kubernetes DaemonSets, using Portainer.

## Introduction

Global services in Docker Swarm run one task on every available node in the cluster, or on every available node matching placement constraints. This is the Docker Swarm equivalent of Kubernetes DaemonSets. Common use cases include monitoring agents, log collectors, security scanners, and storage drivers.

## Global Service Use Cases

- **Monitoring**: Run a metrics exporter on every node
- **Logging**: Run a log shipper on every node
- **Security**: Run a security scanner on every node
- **Storage**: Run a storage provisioner on every node
- **Networking**: Run network or SDN agents on every node

## Global Service Configuration

```yaml
# global-services-stack.yml

version: '3.8'

services:
  # Node exporter: metrics from every node
  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    deploy:
      mode: global              # Run on ALL nodes
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - --path.procfs=/host/proc
      - --path.sysfs=/host/sys
      - --path.rootfs=/rootfs
      - --collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+)($$|/)
    networks:
      - monitoring

  # Portainer agent (legacy option): management on every node
  portainer-agent:
    image: portainer/agent:latest
    environment:
      AGENT_CLUSTER_ADDR: tasks.portainer-agent:9001
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    ports:
      - published: 9001
        target: 9001
        mode: host
    networks:
      - portainer-agent-net

  # CAdvisor: container metrics from every node
  cadvisor:
    image: ghcr.io/google/cadvisor:latest
    deploy:
      mode: global
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - published: 8080
        target: 8080
        mode: host    # Publish on each node directly

networks:
  monitoring:
    driver: overlay
    attachable: true
  portainer-agent-net:
    driver: overlay
    attachable: true
```

## Deploying via Portainer

In Portainer: **Stacks > Add stack**

1. Name: `global-monitoring`
2. Paste the compose content
3. Click **Deploy the stack**

Portainer will show the global service with `global` mode and one task per node.

## Global Service with Placement Constraints

```yaml
services:
  # Only run on nodes with SSD (subset of nodes)
  disk-monitor:
    image: disk-monitor:latest
    deploy:
      mode: global
      placement:
        constraints:
          - node.labels.storage == ssd
          - node.role == worker

  # Run on all nodes except managers
  user-monitor:
    image: security-monitor:latest
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == worker
```

## Scaling Global Services

Global services automatically scale when nodes join or leave:

```bash
# Add a new node to the swarm
docker swarm join --token $WORKER_TOKEN manager:2377

# Global services automatically deploy to the new node
docker service ps global-monitoring_node-exporter
# Should show a new task on the new node
```

## Monitoring Global Service Health

```bash
# Check global service task distribution
docker service ps global-monitoring_node-exporter

# Check the task on a specific node
docker service ps --filter node=worker2 global-monitoring_node-exporter

# Restart the global service with a rolling update
docker service update --force global-monitoring_node-exporter
```

## Conclusion

Global services in Docker Swarm via Portainer provide the DaemonSet equivalent for ensuring infrastructure agents run on every eligible cluster node. Portainer's stack management makes deploying and monitoring global services straightforward, with per-node task visibility in the Services view. As nodes join or leave the cluster, global services automatically adjust, maintaining consistent observability and security coverage.
