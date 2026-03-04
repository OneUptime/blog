# How to Configure the Elastic Agent for Observability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elastic, Observability, Monitoring, Linux

Description: Install and configure the Elastic Agent on RHEL to collect system metrics, logs, and security events for centralized observability.

---

The Elastic Agent is a unified agent that collects logs, metrics, and security data from your RHEL servers and ships them to Elasticsearch. It replaces the need for separate Filebeat, Metricbeat, and Auditbeat installations.

## Prerequisites

You need a running Elasticsearch and Kibana instance, or an Elastic Cloud deployment, with Fleet Server configured.

## Installing the Elastic Agent

```bash
# Download the Elastic Agent RPM (match the version to your Elasticsearch version)
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.12.0-x86_64.rpm

# Install the agent
sudo rpm -vi elastic-agent-8.12.0-x86_64.rpm
```

## Enrolling with Fleet

Fleet provides centralized management of Elastic Agents. Get your enrollment token from Kibana under Fleet > Enrollment tokens:

```bash
# Enroll the agent with Fleet Server
sudo elastic-agent enroll \
  --url=https://fleet-server.example.com:8220 \
  --enrollment-token=YOUR_ENROLLMENT_TOKEN \
  --certificate-authorities=/etc/elastic-agent/ca.crt

# Start the Elastic Agent
sudo systemctl enable --now elastic-agent

# Verify the agent is running and enrolled
sudo elastic-agent status
```

## Standalone Installation (Without Fleet)

If you prefer not to use Fleet, configure the agent with a local config file:

```bash
# Edit the Elastic Agent configuration
sudo tee /etc/elastic-agent/elastic-agent.yml << 'EOF'
outputs:
  default:
    type: elasticsearch
    hosts:
      - "https://elasticsearch.example.com:9200"
    username: "elastic"
    password: "your-password"

inputs:
  - type: system/metrics
    id: system-metrics
    data_stream:
      namespace: default
    use_output: default
    streams:
      - data_stream:
          dataset: system.cpu
          type: metrics
        metricsets: [cpu]
        period: 10s
      - data_stream:
          dataset: system.memory
          type: metrics
        metricsets: [memory]
        period: 10s
      - data_stream:
          dataset: system.diskio
          type: metrics
        metricsets: [diskio]
        period: 10s
      - data_stream:
          dataset: system.filesystem
          type: metrics
        metricsets: [filesystem]
        period: 60s

  - type: logfile
    id: system-logs
    data_stream:
      namespace: default
    use_output: default
    streams:
      - data_stream:
          dataset: system.syslog
          type: logs
        paths:
          - /var/log/messages
          - /var/log/secure
EOF

# Start the agent in standalone mode
sudo elastic-agent run
```

## Firewall Configuration

```bash
# Allow the agent to communicate with Elasticsearch and Fleet Server
sudo firewall-cmd --permanent --add-port=9200/tcp
sudo firewall-cmd --permanent --add-port=8220/tcp
sudo firewall-cmd --reload
```

## Adding Integrations via Fleet

Once enrolled, add integrations from Kibana:

1. Navigate to Fleet > Agent policies
2. Add integrations like "System", "Custom Logs", or "Auditd"
3. The agent will automatically pick up the new configuration

## Verifying Data Collection

```bash
# Check the agent is collecting data
sudo elastic-agent status

# View the agent logs for any errors
sudo journalctl -u elastic-agent -f

# In Kibana, check the Observability > Infrastructure > Inventory page
# Your RHEL host should appear with CPU, memory, and disk metrics
```

The Elastic Agent simplifies observability on RHEL by consolidating all data collection into a single, centrally managed agent.
