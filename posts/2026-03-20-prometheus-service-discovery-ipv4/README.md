# How to Set Up Prometheus Service Discovery for IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Service Discovery, IPv4, Monitoring, Configuration, File_sd, DNS SD

Description: Learn how to configure Prometheus service discovery mechanisms to automatically discover and scrape IPv4 metric endpoints.

---

Prometheus supports multiple service discovery mechanisms that automatically find scrape targets. Instead of manually listing every IP address, service discovery keeps the target list current as services scale or restart.

## Static Configuration (Baseline)

The simplest approach - explicitly list IPv4 targets.

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - '10.0.0.10:9100'   # Server 1
          - '10.0.0.11:9100'   # Server 2
          - '10.0.0.12:9100'   # Server 3
        labels:
          env: production
          region: us-east-1
```

## File-Based Service Discovery (file_sd)

Write target lists to JSON files; Prometheus watches for changes and updates automatically.

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'app_servers'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/*.json'   # Watch all JSON files in this directory
        refresh_interval: 30s                  # Re-read files every 30 seconds
```

```json
[
  {
    "targets": ["10.0.0.20:9100", "10.0.0.21:9100"],
    "labels": {
      "job": "app_servers",
      "env": "production"
    }
  },
  {
    "targets": ["10.0.0.30:9100"],
    "labels": {
      "job": "app_servers",
      "env": "staging"
    }
  }
]
```

## DNS-Based Service Discovery (dns_sd)

Resolve a DNS SRV or A record to find targets dynamically.

```yaml
scrape_configs:
  - job_name: 'web_servers'
    dns_sd_configs:
      - names:
          - 'web.internal.example.com'   # DNS A record with multiple IPs
        type: A                           # Use A records (IPv4)
        port: 9100                        # Scrape port
        refresh_interval: 60s
```

## HTTP-Based Service Discovery (http_sd)

Poll an HTTP endpoint that returns a JSON list of target groups.

```yaml
scrape_configs:
  - job_name: 'dynamic_services'
    http_sd_configs:
      - url: 'http://10.0.0.5:8080/api/prometheus-targets'
        refresh_interval: 60s
```

```python
# Simple Python service discovery server
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/api/prometheus-targets')
def targets():
    # In production, query a service registry here
    return jsonify([
        {"targets": ["10.0.0.50:9100", "10.0.0.51:9100"],
         "labels": {"env": "prod", "role": "database"}}
    ])

if __name__ == '__main__':
    app.run(host='10.0.0.5', port=8080)
```

## Consul Service Discovery

```yaml
scrape_configs:
  - job_name: 'consul_services'
    consul_sd_configs:
      - server: '10.0.0.100:8500'   # Consul server IPv4 address
        services: []                  # Empty = discover all services
    relabel_configs:
      - source_labels: [__meta_consul_service]
        target_label: service
```

## Key Takeaways

- `file_sd` is ideal for environments where a script or CI/CD pipeline manages target lists.
- `dns_sd` with `type: A` discovers IPv4 addresses from DNS records automatically.
- `http_sd` works well when you have a service registry or CMDB with an HTTP API.
- `consul_sd` integrates natively with HashiCorp Consul for dynamic service discovery.
