# How to Deploy Prometheus and Grafana with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Prometheus, Grafana, Monitoring, Docker, Observability

Description: Learn how to deploy a complete Prometheus and Grafana monitoring stack using Portainer stacks for containerized infrastructure observability.

---

Prometheus scrapes metrics from targets, while Grafana provides dashboards and alerting. Deploying both as a Portainer stack gives you a containerized monitoring platform in minutes.

---

## Deploy via Portainer Stack

In Portainer: **Stacks** → **Add stack** → paste:

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.enable-lifecycle"

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-change-me-now}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

---

## Configure Grafana Data Source

1. Open Grafana at `http://<host>:3000` and sign in as `admin` with the password from `GRAFANA_PASSWORD` (or `change-me-now` if you did not set one).
2. Go to **Connections** → **Data sources** → **Add new data source**.
3. Select **Prometheus**, URL: `http://prometheus:9090`.
4. Click **Save & Test**.

---

## Import Community Dashboards

- **3662** - Prometheus 2.0 Overview

---

## Summary

Deploy Prometheus and Grafana as a single Portainer stack with named volumes for persistence. Add Prometheus as a Grafana data source using the Docker service name (`prometheus:9090`). Import dashboard `3662` for immediate visibility into Prometheus server metrics.
