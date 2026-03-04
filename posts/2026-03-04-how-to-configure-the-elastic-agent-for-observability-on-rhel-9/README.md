# How to Configure the Elastic Agent for Observability on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Elastic

Description: Step-by-step guide on configure the elastic agent for observability on rhel 9 with practical examples and commands.

---

The Elastic Agent provides unified data collection for Elasticsearch, Kibana, and the Elastic observability platform on RHEL 9.

## Install the Elastic Agent

```bash
curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-8.12.0-x86_64.rpm
sudo rpm -ivh elastic-agent-8.12.0-x86_64.rpm
```

## Enroll the Agent

```bash
sudo elastic-agent enroll \
  --url=https://fleet-server.example.com:8220 \
  --enrollment-token=YOUR_ENROLLMENT_TOKEN
```

## Start the Agent

```bash
sudo systemctl enable --now elastic-agent
```

## Verify

```bash
sudo elastic-agent status
```

## Configure System Integration

In Kibana Fleet, add the System integration to collect:
- System metrics (CPU, memory, disk, network)
- System logs (/var/log/messages, /var/log/secure)
- Process metrics

## Configure Custom Log Collection

```yaml
# In the agent policy, add custom log input
- type: logfile
  paths:
    - /var/log/httpd/access_log
    - /var/log/httpd/error_log
  processors:
    - add_fields:
        target: ''
        fields:
          service.name: httpd
```

## Conclusion

The Elastic Agent on RHEL 9 provides unified metrics, logs, and security data collection for the Elastic Stack. Manage agent policies centrally through Kibana Fleet for consistent observability.

