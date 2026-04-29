# How to Monitor Docker Swarm Cluster Health from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Monitoring, Observability, Infrastructure

Description: Monitor Docker Swarm cluster health including node availability, service replica counts, and container status across the entire cluster using Portainer's management interface.

---

A healthy Docker Swarm cluster requires ongoing visibility into node status, service replica health, and resource utilization. Portainer provides a real-time dashboard for Swarm health and serves as the starting point for deeper investigation when issues arise.

## What to Monitor in a Swarm Cluster

| Metric | Healthy State |
|---|---|
| Manager node count | Quorum maintained (2 of 3, or 3 of 5) |
| Node availability | All nodes Active or intentionally Paused/Drained |
| Service replicas | Running == Desired for all services |
| Task failures | No repeated task failures in the last hour |
| Network connectivity | All overlay networks reachable across nodes |

## Step 1: Swarm Overview in Portainer

Portainer's **Swarm** section shows:

- Node count and manager/worker breakdown
- Overall service health indicator
- Recent service update history

Navigate to **Swarm > Nodes** for individual node health, resource usage, and availability status.

## Step 2: Monitor Service Replica Health

In **Swarm > Services**, Portainer shows each service with:

- Running replicas vs desired replicas (e.g., `3/3` = healthy)
- Last update timestamp
- Image version currently running

A service showing `1/3` running means replicas are failing - click the service to see which tasks failed and why.

## Step 3: Automated Health Monitoring with Prometheus

Deploy a Prometheus + Grafana stack on the Swarm to collect ongoing metrics:

```yaml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    deploy:
      placement:
        constraints:
          - node.role == manager

  node-exporter:
    image: prom/node-exporter:latest
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
    deploy:
      mode: global        # Run on every node
    ports:
      - target: 9100
        published: 9100
        mode: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro

volumes:
  prometheus-data:
```

Prometheus scrape config:

```yaml
# prometheus.yml

scrape_configs:
  - job_name: 'swarm-nodes'
    static_configs:
      - targets:
          - 'node-worker-1:9100'
          - 'node-worker-2:9100'
          - 'node-worker-3:9100'
```

## Step 4: Alert on Service Degradation

Use Portainer's API to check service health programmatically:

```bash
# Get all services and their replica counts
# Note: ?status=true is required for the Docker API to populate ServiceStatus
curl -s "https://portainer:9443/api/endpoints/1/docker/services?status=true" \
  -H "Authorization: Bearer $TOKEN" | \
  jq '.[] | {name: .Spec.Name, running: .ServiceStatus.RunningTasks, desired: .ServiceStatus.DesiredTasks}'
```

Integrate this into your monitoring system (PagerDuty, OneUptime, Alertmanager) to alert when running < desired.

## Step 5: Check Raft Consensus Health

For manager nodes, Raft quorum health is critical:

```bash
docker node ls
# All managers should show "Reachable" or "Leader" in the ManagerStatus column
```

If a manager shows "Unreachable," the cluster may be approaching a quorum failure - address immediately.

## Summary

Portainer provides immediate visual health status for Swarm clusters. For sustained monitoring, pair Portainer with a Prometheus + Grafana stack using node-exporter as a global service. The combination gives you both real-time troubleshooting capability and historical trend data for capacity planning.
