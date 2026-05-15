# How to Configure Pacemaker Alerts and Notifications on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Alert, Notification, High Availability, Monitoring

Description: Configure Pacemaker alert agents on RHEL to receive email and custom notifications when cluster events such as resource failures or node changes occur.

---

Pacemaker can send notifications when important cluster events happen, like a node going down, a resource failing, or a failover. This is done through alert agents, which are scripts that Pacemaker executes on each event.

## Understanding Pacemaker Alerts

Pacemaker supports alert agents since version 1.1.15. Alert agents are scripts placed in `/usr/share/pacemaker/alerts/` that receive event information through environment variables.

## Configure Email Alerts

RHEL ships with a sample email alert agent.

```bash
# First, ensure mailx is installed for sending emails

sudo dnf install -y mailx

# Install the sample alert agent on each cluster node
sudo install --mode=0755 /usr/share/pacemaker/alerts/alert_smtp.sh.sample /var/lib/pacemaker/alert_smtp.sh

# Create the alert configuration
sudo pcs alert create id=my_email_alert \
    path=/var/lib/pacemaker/alert_smtp.sh \
    options email_sender=donotreply@example.com

# Add a recipient for the alert
sudo pcs alert recipient add my_email_alert value=admin@example.com
```

## Configure a Custom Alert Script

You can write your own alert agent for integrations like Slack or PagerDuty.

```bash
# Create a custom alert script
sudo tee /var/lib/pacemaker/alert_custom.sh << 'EOF'
#!/bin/bash
# Custom Pacemaker alert agent
# Environment variables provided by Pacemaker:
#   CRM_alert_kind: node, fencing, resource, attribute
#   CRM_alert_node: affected node name
#   CRM_alert_desc: event description
#   CRM_alert_status: status code (for resource alerts)
#   CRM_alert_rsc: resource name (for resource alerts)

LOGFILE="/var/log/pacemaker-alerts.log"

if [ -n "$required_kind" ] && [ "$CRM_alert_kind" != "$required_kind" ]; then
    exit 0
fi

echo "$(date) | Kind: ${CRM_alert_kind} | Node: ${CRM_alert_node} | Resource: ${CRM_alert_rsc} | Desc: ${CRM_alert_desc}" >> "$LOGFILE"

# Example: send a Slack webhook
if [ -n "$CRM_alert_recipient" ]; then
    curl -s -X POST "$CRM_alert_recipient" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"Pacemaker Alert: ${CRM_alert_kind} event on ${CRM_alert_node} - ${CRM_alert_desc}\"}"
fi
EOF

# Make it executable and create a log file the hacluster user can write to
sudo chmod 755 /var/lib/pacemaker/alert_custom.sh
sudo touch /var/log/pacemaker-alerts.log
sudo chown hacluster:haclient /var/log/pacemaker-alerts.log
sudo chmod 600 /var/log/pacemaker-alerts.log
```

## Register the Custom Alert

```bash
# Register the alert with Pacemaker
sudo pcs alert create id=slack_alert \
    path=/var/lib/pacemaker/alert_custom.sh

# Add the Slack webhook URL as a recipient
sudo pcs alert recipient add slack_alert \
    value=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Filter Alert Types

```bash
# Configure the custom script to process only resource events
sudo pcs alert create id=resource_alerts \
    path=/var/lib/pacemaker/alert_custom.sh \
    options required_kind=resource

# Verify configured alerts
sudo pcs alert config
```

## Test the Alerts

```bash
# Simulate a resource failure to trigger an alert
sudo crm_resource --resource my_resource --fail

# Check the alert log
cat /var/log/pacemaker-alerts.log

# Clean up the failed resource
sudo pcs resource cleanup my_resource
```

## Remove an Alert

```bash
# Remove a specific alert configuration
sudo pcs alert remove my_email_alert

# Verify removal
sudo pcs alert config
```

Using alert agents keeps your team informed about cluster events in real time, which is critical for responding to outages quickly.
