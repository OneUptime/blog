# How to Deploy a Full Monitoring Stack on Docker Swarm with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Docker Swarm, Monitoring, Prometheus, Grafana, Self-Hosted

Description: Learn how to deploy a complete monitoring stack including Prometheus, Grafana, and Alertmanager on Docker Swarm using Portainer's stack management interface.

## Introduction

Running a monitoring stack on Docker Swarm makes it easier to spread observability components across multiple nodes and scale them over time. Portainer makes it easy to deploy and manage these stacks with a visual interface. In this guide, you'll deploy Prometheus, Grafana, Node Exporter, cAdvisor, and Alertmanager as a unified monitoring stack on Docker Swarm.

## Prerequisites

- Docker Swarm cluster with at least 1 manager and 2 worker nodes
- Portainer Business Edition or CE installed on the Swarm manager
- Basic familiarity with Docker Compose syntax

## Setting Up the Swarm Monitoring Stack

### Step 1: Create Overlay Networks in Portainer

1. Open Portainer and navigate to **Networks**
2. Click **Add network**
3. Set Name: `monitoring`
4. Set Driver: `overlay`
5. Enable **Attachable** for standalone container access
6. Click **Create the network**

### Step 2: Create the Stack

Navigate to **Stacks** in Portainer and click **Add stack**. Name it `monitoring` and paste the following:

```yaml
version: "3.8"

networks:
  monitoring:
    external: true
    name: monitoring

volumes:
  prometheus_data: {}
  grafana_data: {}

services:
  # Prometheus - metrics collection and storage
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
    volumes:
      - prometheus_data:/prometheus
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
    networks:
      - monitoring
    ports:
      - "9090:9090"
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure

  # Grafana - visualization and dashboards
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=securepassword
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring
    ports:
      - "3000:3000"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # Node Exporter - host-level metrics from every node
  node-exporter:
    image: prom/node-exporter:latest
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - monitoring
    deploy:
      mode: global   # Run on every Swarm node
      restart_policy:
        condition: on-failure

  # cAdvisor - container metrics
  cadvisor:
    image: ghcr.io/google/cadvisor:v0.56.2
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - monitoring
    deploy:
      mode: global   # Run on every Swarm node
      restart_policy:
        condition: on-failure

  # Alertmanager - alert routing and notifications
  alertmanager:
    image: prom/alertmanager:latest
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring
    ports:
      - "9093:9093"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

configs:
  prometheus_config:
    external: true
```

### Step 3: Create Prometheus Config as a Swarm Config

Before deploying the stack, create the Prometheus config. In Portainer navigate to **Configs** and create a new config named `prometheus_config`:

```yaml
# prometheus.yml - global scrape configuration

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape Node Exporter on all Swarm nodes
  - job_name: 'node'
    dns_sd_configs:
      - names:
          - 'tasks.node-exporter'
        type: 'A'
        port: 9100

  # Scrape cAdvisor on all Swarm nodes
  - job_name: 'cadvisor'
    dns_sd_configs:
      - names:
          - 'tasks.cadvisor'
        type: 'A'
        port: 8080
```

### Step 4: Deploy and Verify

Click **Deploy the stack** in Portainer. Monitor the deployment under **Services** to confirm all replicas are running. Once healthy:

- Prometheus UI: `http://<manager-ip>:9090`
- Grafana UI: `http://<manager-ip>:3000`
- Alertmanager UI: `http://<manager-ip>:9093`

### Step 5: Add Prometheus Data Source in Grafana

1. Log in to Grafana with `admin/securepassword`
2. Navigate to **Connections > Data sources**
3. Click **Add new data source** and select **Prometheus**
4. Set URL: `http://prometheus:9090`
5. Click **Save & Test**

Import dashboard ID `1860` for Node Exporter Full or `609` for Docker Swarm & Container Overview.

## Scaling and High Availability

To prepare Grafana for HA, run multiple replicas behind a load balancer and move Grafana to a shared database backend:

```yaml
# Add to the grafana service, then increase deploy.replicas above 1
environment:
  - GF_DATABASE_TYPE=postgres
  - GF_DATABASE_HOST=postgres:5432
  - GF_DATABASE_NAME=grafana
  - GF_DATABASE_USER=grafana
  - GF_DATABASE_PASSWORD=grafanadbpassword
```

## Conclusion

You now have a fully functional monitoring stack running on Docker Swarm managed through Portainer. This setup gives you host-level and container-level metrics across all Swarm nodes, centralized visualization in Grafana, and an Alertmanager instance that you can wire up with Prometheus alerting rules and receivers. Portainer's stack management makes it easy to update configurations and scale services as your infrastructure grows.
