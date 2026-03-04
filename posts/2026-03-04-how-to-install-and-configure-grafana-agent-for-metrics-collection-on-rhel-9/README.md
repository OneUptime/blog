# How to Install and Configure Grafana Agent for Metrics Collection on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Grafana

Description: Step-by-step guide on install and configure grafana agent for metrics collection on rhel 9 with practical examples and commands.

---

The Grafana Agent collects and ships metrics from RHEL 9 to Grafana Cloud or a Prometheus-compatible backend.

## Install the Grafana Agent

```bash
sudo dnf install -y https://github.com/grafana/agent/releases/download/v0.39.0/grafana-agent-0.39.0-1.amd64.rpm
```

## Configure the Agent

```bash
sudo tee /etc/grafana-agent.yaml <<EOF
metrics:
  global:
    scrape_interval: 15s
    remote_write:
      - url: https://prometheus-us-central1.grafana.net/api/prom/push
        basic_auth:
          username: YOUR_GRAFANA_CLOUD_USER
          password: YOUR_GRAFANA_CLOUD_API_KEY

  configs:
    - name: default
      scrape_configs:
        - job_name: node
          static_configs:
            - targets: ['localhost:9100']
              labels:
                host: rhel9-server-01

logs:
  configs:
    - name: default
      positions:
        filename: /tmp/positions.yaml
      clients:
        - url: https://logs-prod-us-central1.grafana.net/loki/api/v1/push
          basic_auth:
            username: YOUR_GRAFANA_CLOUD_USER
            password: YOUR_GRAFANA_CLOUD_API_KEY
      scrape_configs:
        - job_name: syslog
          static_configs:
            - targets: [localhost]
              labels:
                job: syslog
                host: rhel9-server-01
                __path__: /var/log/messages
EOF
```

## Install Node Exporter

```bash
sudo dnf install -y golang-github-prometheus-node_exporter
sudo systemctl enable --now node_exporter
```

## Start the Grafana Agent

```bash
sudo systemctl enable --now grafana-agent
```

## Verify

```bash
sudo systemctl status grafana-agent
curl http://localhost:9100/metrics | head -20
```

## Conclusion

The Grafana Agent on RHEL 9 provides efficient metrics and log collection for Grafana Cloud. Combine with Prometheus Node Exporter for comprehensive system observability.

