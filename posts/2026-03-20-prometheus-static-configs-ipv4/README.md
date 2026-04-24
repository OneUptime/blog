# How to Configure Prometheus static_configs with IPv4 Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, IPv4, Static_configs, Configuration, Monitoring, Target

Description: Use Prometheus static_configs to define fixed sets of IPv4 scrape targets, organize targets with labels, and combine multiple static configurations in a single job.

## Introduction

`static_configs` is the simplest Prometheus service discovery method-you define a fixed list of targets that Prometheus will scrape. This is appropriate for stable infrastructure where the list of monitored hosts doesn't change frequently.

## Static Configuration Structure

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'servers'
    static_configs:
      # Syntax: list of target groups
      - targets: ['10.0.0.1:9100', '10.0.0.2:9100']
        labels:
          group: 'web-tier'

      - targets: ['10.0.0.10:9100', '10.0.0.11:9100']
        labels:
          group: 'db-tier'
```

## Comprehensive Static Configuration Example

```yaml
# /etc/prometheus/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    datacenter: 'us-east-1'

scrape_configs:
  # Web servers
  - job_name: 'web_servers'
    static_configs:
      - targets:
          - '10.0.1.1:9100'
          - '10.0.1.2:9100'
          - '10.0.1.3:9100'
        labels:
          tier: web
          env: prod

  # Application servers
  - job_name: 'app_servers'
    static_configs:
      - targets:
          - '10.0.2.1:9100'
          - '10.0.2.2:9100'
        labels:
          tier: app
          env: prod

  # Database servers
  - job_name: 'db_servers'
    static_configs:
      - targets:
          - '10.0.3.1:9100'
          - '10.0.3.2:9100'
        labels:
          tier: db
          env: prod

  # Database metrics (MySQL exporter)
  - job_name: 'mysql'
    static_configs:
      - targets: ['10.0.3.1:9104', '10.0.3.2:9104']
        labels:
          tier: db

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['10.0.3.3:9121']
        labels:
          tier: cache
```

## Per-Target Labels with Separate static_configs Entries

```yaml
# Assign individual labels by placing each target in its own static_config entry:

scrape_configs:
  - job_name: 'servers'
    static_configs:
      - targets: ['10.0.0.1:9100']
        labels:
          hostname: 'web-01'
          role: 'nginx'
      - targets: ['10.0.0.2:9100']
        labels:
          hostname: 'web-02'
          role: 'nginx'
      - targets: ['10.0.0.10:9100']
        labels:
          hostname: 'db-01'
          role: 'mysql-primary'
```

## Validating Configuration

```bash
# Validate prometheus.yml syntax
promtool check config /etc/prometheus/prometheus.yml
# Expected: SUCCESS: /etc/prometheus/prometheus.yml is valid prometheus config file syntax

# Reload Prometheus configuration over HTTP (requires --web.enable-lifecycle)
curl -X POST http://10.0.0.5:9090/-/reload

# Or send SIGHUP to the Prometheus process
sudo kill -HUP <prometheus-pid>

# Verify targets were loaded
curl -s "http://10.0.0.5:9090/api/v1/targets" | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print(len(data['data']['activeTargets']),'active targets')"
```

## Conclusion

`static_configs` is the simplest way to define Prometheus scrape targets. List targets as `host:port` strings, add labels to group targets for dashboard filtering. Use `promtool check config` to validate YAML before reloading. For larger, dynamic environments, migrate to `file_sd_configs` (file-based), `consul_sd_configs` (Consul), or other service discovery backends that don't require manual updates when hosts are added.
