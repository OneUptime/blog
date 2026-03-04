# How to Configure Prometheus Service Discovery for Dynamic RHEL Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Prometheus, Service Discovery, Monitoring, Automation, Consul

Description: Configure Prometheus service discovery on RHEL to automatically detect and monitor new hosts using file-based, DNS-based, or Consul-based discovery instead of static target lists.

---

Manually editing `prometheus.yml` every time you add a server does not scale. Prometheus supports several service discovery methods that automatically find new targets. This guide covers the three most practical options for RHEL environments.

## Method 1: File-Based Service Discovery

This is the simplest method. Prometheus watches a JSON or YAML file for target changes. No restart required when targets change.

```bash
# Create a directory for discovery files
sudo mkdir -p /etc/prometheus/file_sd

# Create a targets file
sudo tee /etc/prometheus/file_sd/rhel_nodes.json << 'EOF'
[
  {
    "targets": ["192.168.1.50:9100", "192.168.1.51:9100"],
    "labels": {
      "env": "production",
      "role": "webserver"
    }
  },
  {
    "targets": ["192.168.1.60:9100", "192.168.1.61:9100"],
    "labels": {
      "env": "production",
      "role": "database"
    }
  }
]
EOF

sudo chown -R prometheus:prometheus /etc/prometheus/file_sd
```

Configure Prometheus to use file discovery:

```yaml
# In /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'rhel-nodes'
    file_sd_configs:
      - files:
          - '/etc/prometheus/file_sd/rhel_nodes.json'
        # How often to re-read the file
        refresh_interval: 30s
```

```bash
# Reload Prometheus
sudo systemctl reload prometheus

# To add a new target, just edit the JSON file
# Prometheus picks up changes automatically
```

## Automate File-Based Discovery with a Script

```bash
# Script that generates targets from your CMDB or inventory
sudo tee /usr/local/bin/update-prometheus-targets.sh << 'SCRIPT'
#!/bin/bash
# Generate Prometheus targets from a list of hosts
# This could query an API, read from Ansible inventory, etc.

HOSTS_FILE="/etc/prometheus/hosts.list"
OUTPUT="/etc/prometheus/file_sd/rhel_nodes.json"

# Read host list and build JSON
TARGETS=""
while IFS= read -r host; do
    [ -z "$host" ] && continue
    TARGETS="${TARGETS}\"${host}:9100\","
done < "$HOSTS_FILE"

# Remove trailing comma
TARGETS="${TARGETS%,}"

cat > "$OUTPUT" << EOF
[{"targets": [${TARGETS}], "labels": {"env": "production"}}]
EOF
SCRIPT

sudo chmod +x /usr/local/bin/update-prometheus-targets.sh

# Run it via cron every 5 minutes
echo "*/5 * * * * root /usr/local/bin/update-prometheus-targets.sh" | \
    sudo tee /etc/cron.d/prometheus-discovery
```

## Method 2: DNS-Based Service Discovery

If your RHEL hosts are registered in DNS, Prometheus can discover them via SRV or A records.

```yaml
# In prometheus.yml
scrape_configs:
  - job_name: 'rhel-dns'
    dns_sd_configs:
      - names:
          - '_node-exporter._tcp.example.com'
        type: SRV
        refresh_interval: 60s
```

Create DNS SRV records pointing to your hosts:

```bash
# Example DNS SRV records (in your DNS zone file)
# _node-exporter._tcp.example.com. 300 IN SRV 0 0 9100 web01.example.com.
# _node-exporter._tcp.example.com. 300 IN SRV 0 0 9100 web02.example.com.
# _node-exporter._tcp.example.com. 300 IN SRV 0 0 9100 db01.example.com.
```

## Method 3: Consul-Based Service Discovery

For larger environments, Consul provides a service registry.

```yaml
# In prometheus.yml
scrape_configs:
  - job_name: 'rhel-consul'
    consul_sd_configs:
      - server: 'consul.example.com:8500'
        services:
          - 'node-exporter'
    relabel_configs:
      - source_labels: ['__meta_consul_tags']
        regex: '.*,production,.*'
        action: keep
```

Register a service in Consul from each RHEL host:

```bash
# Register node-exporter with Consul
curl -X PUT http://consul.example.com:8500/v1/agent/service/register \
    -d '{
        "ID": "node-exporter-web01",
        "Name": "node-exporter",
        "Tags": ["production", "webserver"],
        "Port": 9100,
        "Address": "192.168.1.50"
    }'
```

## Verify Discovery Is Working

```bash
# Check Prometheus targets via the API
curl -s http://localhost:9090/api/v1/targets | python3 -m json.tool | grep -A5 "discoveredLabels"

# Check in the Prometheus web UI
# Navigate to Status > Targets
```

File-based discovery works best for small to medium environments. DNS discovery works well if you already manage DNS records for your hosts. Consul is the right choice for large, dynamic environments with frequent changes.
