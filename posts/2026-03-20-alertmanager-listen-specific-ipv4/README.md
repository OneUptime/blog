# How to Configure Alertmanager to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Prometheus, IPv4, Configuration, Monitoring, Alert

Description: Configure Prometheus Alertmanager to listen on a specific IPv4 address, set up routing for alert notifications, and connect Prometheus to the Alertmanager instance.

## Introduction

Alertmanager handles alerts sent by Prometheus, routing them to email, Slack, PagerDuty, or other receivers. By default it listens on `:9093`, which typically exposes it on all network interfaces. Binding to a specific IPv4 limits exposure and enables targeted firewall rules.

## Installation and Binding Configuration

```bash
# Run Alertmanager on specific IPv4

alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --web.listen-address="10.0.0.5:9093" \
  --storage.path=/var/lib/alertmanager

# systemd service:
# /etc/systemd/system/alertmanager.service
```

## systemd Service Unit

```ini
# /etc/systemd/system/alertmanager.service

[Unit]
Description=Alertmanager
After=network.target

[Service]
User=alertmanager
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --web.listen-address=10.0.0.5:9093 \
  --cluster.listen-address= \
  --storage.path=/var/lib/alertmanager \
  --web.external-url=http://10.0.0.5:9093

Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

## Alertmanager Configuration

```yaml
# /etc/alertmanager/alertmanager.yml

global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'smtppassword'

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'email-alerts'
  routes:
    - matchers:
        - severity="critical"
      receiver: 'pagerduty-critical'
    - matchers:
        - severity="warning"
      receiver: 'email-alerts'

receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'admin@example.com'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-routing-key'

inhibit_rules:
  - source_matchers:
      - severity="critical"
    target_matchers:
      - severity="warning"
    equal: ['alertname', 'instance']
```

## Connecting Prometheus to Alertmanager

```yaml
# /etc/prometheus/prometheus.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - '10.0.0.5:9093'
```

```bash
# Apply and verify
sudo systemctl restart alertmanager

sudo ss -tlnp | grep alertmanager
# Expected: 10.0.0.5:9093

# Test configuration
amtool check-config /etc/alertmanager/alertmanager.yml

# Test alert routing
amtool alert add alertname=TestAlert severity=warning instance=10.0.0.1:9100 \
  --alertmanager.url=http://10.0.0.5:9093

# Check active alerts
curl -s http://10.0.0.5:9093/api/v2/alerts | python3 -m json.tool
```

## Conclusion

Set Alertmanager's bind address with `--web.listen-address=ip:9093`. Configure notification routing in `alertmanager.yml` with `route` and `receivers`. Restrict port 9093 with firewall rules; only Prometheus and admin workstations need access. Use `amtool check-config` to validate configuration and `amtool alert add` to test alert routing before a real incident.
