# How to Install and Configure the New Relic Infrastructure Agent on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, New Relic

Description: Step-by-step guide on install and configure the new relic infrastructure agent on rhel 9 with practical examples and commands.

---

The New Relic Infrastructure Agent monitors RHEL 9 system health and integrates with the New Relic observability platform.

## Install the Agent

```bash
# Add New Relic repository
sudo curl -o /etc/yum.repos.d/newrelic-infra.repo \
  https://download.newrelic.com/infrastructure_agent/linux/yum/el/9/x86_64/newrelic-infra.repo

sudo dnf install -y newrelic-infra
```

## Configure the Agent

```bash
sudo tee /etc/newrelic-infra.yml <<EOF
license_key: YOUR_LICENSE_KEY
display_name: rhel9-server-01
custom_attributes:
  environment: production
  team: infrastructure
  os: rhel9
EOF
```

## Start the Agent

```bash
sudo systemctl enable --now newrelic-infra
```

## Configure Log Forwarding

```bash
sudo tee /etc/newrelic-infra/logging.d/syslog.yml <<EOF
logs:
  - name: syslog
    file: /var/log/messages

  - name: secure
    file: /var/log/secure

  - name: audit
    file: /var/log/audit/audit.log
EOF

sudo systemctl restart newrelic-infra
```

## Verify

```bash
sudo systemctl status newrelic-infra
# Check New Relic UI for the host
```

## Conclusion

New Relic Infrastructure Agent on RHEL 9 provides real-time system monitoring with log forwarding. Use custom attributes to organize and filter your hosts in the New Relic dashboard.

