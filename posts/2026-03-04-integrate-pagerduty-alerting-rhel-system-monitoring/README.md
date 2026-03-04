# How to Integrate PagerDuty Alerting with RHEL System Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PagerDuty, Alerting, Monitoring, Linux

Description: Set up PagerDuty alerting from RHEL servers using the PagerDuty Agent and custom scripts to trigger incidents for system issues.

---

PagerDuty is a popular incident management platform. Integrating it with your RHEL monitoring ensures on-call engineers get notified immediately when systems have problems.

## Installing the PagerDuty Agent

The PagerDuty Agent runs on your RHEL server and forwards events to PagerDuty:

```bash
# Add the PagerDuty repository
sudo tee /etc/yum.repos.d/pdagent.repo << 'EOF'
[pdagent]
name=PDAgent
baseurl=https://packages.pagerduty.com/pdagent/rpm
enabled=1
gpgcheck=1
gpgkey=https://packages.pagerduty.com/GPG-KEY-RPM-pagerduty
EOF

# Install the PagerDuty Agent
sudo dnf install pdagent pdagent-integrations -y

# Start and enable the agent
sudo systemctl enable --now pdagent
```

## Configuring the Integration Key

Get your integration key from the PagerDuty service configuration page:

```bash
# Test the connection by sending a test event
pd-send -k YOUR_INTEGRATION_KEY \
  -t trigger \
  -d "Test alert from $(hostname)" \
  -i "test-$(hostname)-$(date +%s)"
```

## Creating Custom Monitoring Scripts

Write scripts that check system health and trigger PagerDuty alerts:

```bash
#!/bin/bash
# /usr/local/bin/check-disk-pagerduty.sh
# Trigger a PagerDuty alert when disk usage exceeds 90%

INTEGRATION_KEY="YOUR_INTEGRATION_KEY"
THRESHOLD=90

df -h --output=target,pcent | tail -n +2 | while read mount usage; do
    # Remove the percent sign
    PERCENT=${usage%\%}

    if [ "$PERCENT" -gt "$THRESHOLD" ]; then
        pd-send -k "$INTEGRATION_KEY" \
          -t trigger \
          -d "Disk usage critical on $(hostname): $mount at ${PERCENT}%" \
          -i "disk-$(hostname)-${mount}" \
          -f "hostname=$(hostname)" \
          -f "mount=$mount" \
          -f "usage=${PERCENT}%"
    fi
done
```

```bash
#!/bin/bash
# /usr/local/bin/check-services-pagerduty.sh
# Alert when critical services go down

INTEGRATION_KEY="YOUR_INTEGRATION_KEY"
SERVICES="httpd postgresql sshd"

for svc in $SERVICES; do
    if ! systemctl is-active --quiet "$svc"; then
        pd-send -k "$INTEGRATION_KEY" \
          -t trigger \
          -d "Service $svc is down on $(hostname)" \
          -i "service-$(hostname)-${svc}"
    else
        # Resolve the incident if service is back up
        pd-send -k "$INTEGRATION_KEY" \
          -t resolve \
          -i "service-$(hostname)-${svc}"
    fi
done
```

## Using the PagerDuty Events API Directly

If you prefer not to install the agent, use curl to call the Events API:

```bash
#!/bin/bash
# Send an alert using the PagerDuty Events API v2
ROUTING_KEY="YOUR_INTEGRATION_KEY"

curl -s -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d "{
    \"routing_key\": \"$ROUTING_KEY\",
    \"event_action\": \"trigger\",
    \"dedup_key\": \"disk-$(hostname)\",
    \"payload\": {
      \"summary\": \"High disk usage on $(hostname)\",
      \"severity\": \"critical\",
      \"source\": \"$(hostname)\",
      \"component\": \"disk\"
    }
  }"
```

## Scheduling Checks

```bash
# Run checks every 5 minutes via cron
sudo tee /etc/cron.d/pagerduty-checks << 'EOF'
*/5 * * * * root /usr/local/bin/check-disk-pagerduty.sh
*/2 * * * * root /usr/local/bin/check-services-pagerduty.sh
EOF
```

Make sure to set appropriate dedup keys so PagerDuty does not create duplicate incidents for the same issue.
