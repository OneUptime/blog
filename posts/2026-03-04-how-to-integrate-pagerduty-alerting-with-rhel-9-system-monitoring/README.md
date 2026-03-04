# How to Integrate PagerDuty Alerting with RHEL System Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Monitoring, PagerDuty

Description: Step-by-step guide on integrate pagerduty alerting with RHEL system monitoring with practical examples and commands.

---

PagerDuty alerting integration with RHEL monitoring ensures your team is notified immediately when critical issues arise.

## Integration Options

- PagerDuty Agent (direct integration)
- Email-based integration
- Webhook-based integration from monitoring tools

## Install PagerDuty Agent

```bash
sudo dnf install -y pdagent pdagent-integrations
```

## Configure the Agent

```bash
sudo vi /etc/pdagent.conf
```

Set your integration key:

```ini
[pdagent]
integration_key = your_integration_key_here
```

## Start the Agent

```bash
sudo systemctl enable --now pdagent
```

## Create Alert Scripts

```bash
sudo tee /opt/scripts/pagerduty-alert.sh <<'SCRIPT'
#!/bin/bash
SEVERITY="$1"
SUMMARY="$2"
INTEGRATION_KEY="your_integration_key"

curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d "{
    "routing_key": "$INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "$SUMMARY",
      "severity": "$SEVERITY",
      "source": "$(hostname)"
    }
  }"
SCRIPT
sudo chmod +x /opt/scripts/pagerduty-alert.sh
```

## Integrate with System Monitoring

```bash
# Disk space alert
echo '*/5 * * * * root [ $(df / --output=pcent | tail -1 | tr -d " %") -gt 90 ] && /opt/scripts/pagerduty-alert.sh critical "Disk usage above 90% on $(hostname)"' | sudo tee /etc/cron.d/pd-disk-alert
```

## Conclusion

PagerDuty integration with RHEL ensures critical alerts reach your team through the right escalation policies. Use the Events API for custom alerting from any monitoring script.

