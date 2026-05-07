# How to Configure Alertmanager Clustering on IPv4 Peers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, IPv4, Clustering, High Availability, Prometheus, Monitoring

Description: Set up an Alertmanager cluster across IPv4 peers for high availability, configure cluster gossip protocol, and point multiple Prometheus instances at the cluster.

## Introduction

Running a single Alertmanager is a single point of failure. An Alertmanager cluster uses a gossip protocol to deduplicate alerts across peers-even if one node fails, alerts are still processed. All cluster nodes share state and deduplicate notifications to prevent duplicate pages.

## Architecture

```text
Prometheus 1 ─┐
               ├→ All 3 Alertmanager nodes (cluster)
Prometheus 2 ─┘       ↓ gossip protocol
                Alertmanager 1 (10.0.0.1:9093)
                Alertmanager 2 (10.0.0.2:9093)
                Alertmanager 3 (10.0.0.3:9093)
```

## Cluster Node Configuration

```bash
# Node 1 (10.0.0.1) - start with peers

alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --web.listen-address=10.0.0.1:9093 \
  --cluster.listen-address=10.0.0.1:9094 \
  --cluster.peer=10.0.0.2:9094 \
  --cluster.peer=10.0.0.3:9094 \
  --storage.path=/var/lib/alertmanager

# Node 2 (10.0.0.2)
alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --web.listen-address=10.0.0.2:9093 \
  --cluster.listen-address=10.0.0.2:9094 \
  --cluster.peer=10.0.0.1:9094 \
  --cluster.peer=10.0.0.3:9094 \
  --storage.path=/var/lib/alertmanager

# Node 3 (10.0.0.3) - same pattern
```

## systemd Service Unit (Per Node)

```ini
# /etc/systemd/system/alertmanager.service (Node 1)

[Unit]
Description=Alertmanager
After=network.target

[Service]
User=alertmanager
ExecStart=/usr/local/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --web.listen-address=10.0.0.1:9093 \
  --cluster.listen-address=10.0.0.1:9094 \
  --cluster.peer=10.0.0.2:9094 \
  --cluster.peer=10.0.0.3:9094 \
  --storage.path=/var/lib/alertmanager

Restart=on-failure
[Install]
WantedBy=multi-user.target
```

## Alertmanager Configuration (Identical on All Nodes)

```yaml
# /etc/alertmanager/alertmanager.yml - same on all nodes

global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  repeat_interval: 4h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'
```

## Prometheus Configuration (Point to All Alertmanager Nodes)

```yaml
# /etc/prometheus/prometheus.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - '10.0.0.1:9093'
            - '10.0.0.2:9093'
            - '10.0.0.3:9093'
```

## Firewall Rules

```bash
# Allow Alertmanager API from Prometheus
for prom_ip in 10.0.0.10 10.0.0.11; do
  sudo iptables -A INPUT -p tcp --dport 9093 -s $prom_ip -j ACCEPT
done

# Allow cluster gossip between Alertmanager nodes
for am_ip in 10.0.0.1 10.0.0.2 10.0.0.3; do
  sudo iptables -A INPUT -p tcp --dport 9094 -s $am_ip -j ACCEPT
  sudo iptables -A INPUT -p udp --dport 9094 -s $am_ip -j ACCEPT
done

sudo iptables -A INPUT -p tcp --dport 9093 -j DROP
sudo iptables -A INPUT -p tcp --dport 9094 -j DROP
sudo iptables -A INPUT -p udp --dport 9094 -j DROP
```

## Verifying Cluster Status

```bash
# Check cluster members
curl -s http://10.0.0.1:9093/api/v2/status | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(p['address']) for p in d['cluster']['peers']]"

# Should show all peer addresses

# Verify deduplication (fire same alert to multiple nodes)
amtool alert add testAlert severity=warning \
  --alertmanager.url=http://10.0.0.1:9093
amtool alert add testAlert severity=warning \
  --alertmanager.url=http://10.0.0.2:9093

# Only one email/notification should arrive (deduplication working)
```

## Conclusion

Alertmanager clustering uses gossip protocol on port 9094 for state synchronization between peers. Each node runs with `--cluster.peer` pointing to all other nodes. Prometheus should be configured with all Alertmanager node addresses-it sends alerts to all of them, and the cluster deduplicates to prevent multiple notifications. All cluster nodes use the same `alertmanager.yml` configuration.
