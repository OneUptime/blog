# How to Set Up the Datadog Agent for Infrastructure Monitoring on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Monitoring, Datadog

Description: Step-by-step guide on set up the datadog agent for infrastructure monitoring on rhel 9 with practical examples and commands.

---

The Datadog Agent collects metrics, traces, and logs from RHEL 9 servers for comprehensive infrastructure monitoring.

## Install the Datadog Agent

```bash
DD_API_KEY=your_api_key_here DD_SITE="datadoghq.com" bash -c \
  "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"
```

## Verify Installation

```bash
sudo systemctl status datadog-agent
sudo datadog-agent status
```

## Configure System Metrics

Edit the main configuration:

```bash
sudo vi /etc/datadog-agent/datadog.yaml
```

Key settings:

```yaml
api_key: your_api_key_here
site: datadoghq.com
hostname: rhel9-server-01
tags:
  - env:production
  - role:webserver
  - os:rhel9
```

## Enable Log Collection

```yaml
# In /etc/datadog-agent/datadog.yaml
logs_enabled: true
```

Create a log configuration:

```bash
sudo tee /etc/datadog-agent/conf.d/syslog.d/conf.yaml <<EOF
logs:
  - type: file
    path: /var/log/messages
    source: syslog
    service: rhel9

  - type: file
    path: /var/log/secure
    source: auth
    service: rhel9
EOF
```

## Enable Integrations

```bash
# Process monitoring
sudo tee /etc/datadog-agent/conf.d/process.d/conf.yaml <<EOF
init_config:
instances:
  - name: sshd
    search_string: ['sshd']
  - name: httpd
    search_string: ['httpd']
EOF
```

## Restart the Agent

```bash
sudo systemctl restart datadog-agent
sudo datadog-agent status
```

## Conclusion

The Datadog Agent on RHEL 9 provides deep visibility into system metrics, logs, and processes. Use tags to organize servers and create dashboards and alerts in the Datadog console.

