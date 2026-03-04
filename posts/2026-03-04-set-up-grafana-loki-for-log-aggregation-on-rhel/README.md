# How to Set Up Grafana Loki for Log Aggregation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Grafana Loki, Log Aggregation, Promtail, Logging, Monitoring

Description: Deploy Grafana Loki and Promtail on RHEL for lightweight, Prometheus-style log aggregation that integrates with your existing Grafana dashboards.

---

Grafana Loki is a log aggregation system designed to work with Grafana. Unlike Elasticsearch, Loki indexes only metadata (labels) and not the full log text, making it much lighter on resources. Promtail is the agent that ships logs from RHEL hosts to Loki.

## Install Loki

```bash
# Create a loki user
sudo useradd --no-create-home --shell /bin/false loki
sudo mkdir -p /etc/loki /var/lib/loki
sudo chown loki:loki /var/lib/loki

# Download Loki
cd /tmp
curl -LO https://github.com/grafana/loki/releases/download/v2.9.3/loki-linux-amd64.zip
unzip loki-linux-amd64.zip
sudo cp loki-linux-amd64 /usr/local/bin/loki
sudo chown loki:loki /usr/local/bin/loki
sudo chmod +x /usr/local/bin/loki
```

## Configure Loki

```bash
sudo tee /etc/loki/loki-config.yml << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /var/lib/loki
  storage:
    filesystem:
      chunks_directory: /var/lib/loki/chunks
      rules_directory: /var/lib/loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

storage_config:
  filesystem:
    directory: /var/lib/loki/chunks
EOF

sudo chown loki:loki /etc/loki/loki-config.yml
```

## Create Loki systemd Service

```bash
sudo tee /etc/systemd/system/loki.service << 'EOF'
[Unit]
Description=Grafana Loki
After=network-online.target

[Service]
User=loki
Group=loki
Type=simple
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now loki
```

## Install Promtail on Each RHEL Host

```bash
# Download Promtail
cd /tmp
curl -LO https://github.com/grafana/loki/releases/download/v2.9.3/promtail-linux-amd64.zip
unzip promtail-linux-amd64.zip
sudo cp promtail-linux-amd64 /usr/local/bin/promtail
sudo chmod +x /usr/local/bin/promtail
```

## Configure Promtail

```bash
sudo mkdir -p /etc/promtail
sudo tee /etc/promtail/promtail-config.yml << 'EOF'
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki-server.example.com:3100/loki/api/v1/push

scrape_configs:
  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          host: rhel-host-01
          __path__: /var/log/messages

  # Secure/auth logs
  - job_name: secure
    static_configs:
      - targets:
          - localhost
        labels:
          job: secure
          host: rhel-host-01
          __path__: /var/log/secure

  # Journal logs
  - job_name: journal
    journal:
      max_age: 12h
      labels:
        job: journal
        host: rhel-host-01
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: 'unit'
EOF
```

## Create Promtail systemd Service

```bash
sudo tee /etc/systemd/system/promtail.service << 'EOF'
[Unit]
Description=Promtail Log Agent
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail/promtail-config.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now promtail
```

## Open Firewall Ports

```bash
# On the Loki server
sudo firewall-cmd --permanent --add-port=3100/tcp
sudo firewall-cmd --reload
```

## Add Loki as a Grafana Data Source

In Grafana, go to Configuration > Data Sources > Add data source > Loki. Set the URL to `http://localhost:3100`.

## Query Logs in Grafana

In the Explore view, select the Loki data source and use LogQL:

```logql
# Show all syslog messages
{job="syslog"}

# Filter by host
{host="rhel-host-01"}

# Search for errors
{job="syslog"} |= "error"

# Filter by systemd unit
{unit="sshd.service"}
```

Loki and Promtail give you a lightweight log aggregation solution that fits naturally into a Prometheus and Grafana stack without the overhead of running Elasticsearch.
