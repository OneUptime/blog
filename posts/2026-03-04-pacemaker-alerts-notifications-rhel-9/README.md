# How to Configure Pacemaker Alerts and Notifications on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Alerts, Notifications, High Availability, Cluster, Monitoring, Linux

Description: Learn how to configure Pacemaker alerts and notifications on RHEL 9 to receive email and custom notifications for cluster events.

---

Pacemaker on RHEL 9 supports an alerts framework that triggers notifications when cluster events occur, such as node failures, resource state changes, and fencing events. This guide covers configuring email alerts and custom notification scripts.

## Prerequisites

- A running RHEL 9 Pacemaker cluster
- Root or sudo access
- A mail transfer agent (for email notifications)

## Understanding Pacemaker Alerts

Pacemaker alerts are triggered by:

- **Node events** - Node joins or leaves the cluster
- **Fencing events** - A node is fenced
- **Resource events** - Resource starts, stops, or fails

Alerts call external scripts (alert agents) with event details passed as environment variables.

## Installing the Alert Agents

RHEL 9 includes built-in alert agents:

```bash
ls /usr/share/pacemaker/alerts/
```

Common agents:

- `alert_smtp.sh` - Send email notifications
- `alert_snmp.sh` - Send SNMP traps
- `alert_file.sh` - Write events to a file

## Configuring Email Alerts

### Step 1: Install a Mail Transfer Agent

```bash
sudo dnf install mailx postfix -y
sudo systemctl enable --now postfix
```

### Step 2: Create the Alert

```bash
sudo pcs alert create id=email-alert path=/usr/share/pacemaker/alerts/alert_smtp.sh \
    options email_sender=cluster@example.com
```

### Step 3: Add Recipients

```bash
sudo pcs alert recipient add email-alert value=admin@example.com
```

Add multiple recipients:

```bash
sudo pcs alert recipient add email-alert value=oncall@example.com
```

### Step 4: Configure the SMTP Server

Set the mail server options:

```bash
sudo pcs alert update email-alert options \
    email_sender=cluster@example.com \
    email_host=smtp.example.com
```

## Configuring File-Based Alerts

Write events to a log file:

```bash
sudo pcs alert create id=file-alert path=/usr/share/pacemaker/alerts/alert_file.sh
sudo pcs alert recipient add file-alert value=/var/log/cluster/alerts.log
```

Ensure the directory exists:

```bash
sudo mkdir -p /var/log/cluster
sudo chown hacluster:haclient /var/log/cluster
```

## Creating a Custom Alert Script

Create a custom script that sends to a webhook:

```bash
sudo tee /usr/share/pacemaker/alerts/alert_webhook.sh << 'SCRIPT'
#!/bin/bash

# Pacemaker passes event data as environment variables:
# CRM_alert_kind - node, fencing, or resource
# CRM_alert_node - affected node
# CRM_alert_desc - event description
# CRM_alert_status - status code
# CRM_alert_recipient - configured recipient

case "${CRM_alert_kind}" in
    node)
        message="Node ${CRM_alert_node} is now ${CRM_alert_desc}"
        ;;
    fencing)
        message="Fencing operation on ${CRM_alert_node}: ${CRM_alert_desc}"
        ;;
    resource)
        message="Resource ${CRM_alert_rsc} on ${CRM_alert_node}: ${CRM_alert_desc} (rc=${CRM_alert_status})"
        ;;
esac

curl -s -X POST "${CRM_alert_recipient}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"[Cluster Alert] ${message}\"}"

exit 0
SCRIPT

sudo chmod 755 /usr/share/pacemaker/alerts/alert_webhook.sh
sudo chown root:root /usr/share/pacemaker/alerts/alert_webhook.sh
```

Register the custom alert:

```bash
sudo pcs alert create id=webhook-alert path=/usr/share/pacemaker/alerts/alert_webhook.sh
sudo pcs alert recipient add webhook-alert value=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Filtering Alerts by Event Type

Restrict alerts to specific event types:

```bash
# Only node events
sudo pcs alert update email-alert options \
    CRM_alert_select_kind=node

# Only fencing events
sudo pcs alert update webhook-alert options \
    CRM_alert_select_kind=fencing

# Node and resource events
sudo pcs alert update file-alert options \
    CRM_alert_select_kind="node,resource"
```

## Viewing Alert Configuration

```bash
sudo pcs alert
```

## Removing Alerts

Remove a recipient:

```bash
sudo pcs alert recipient remove email-alert admin@example.com
```

Remove an alert:

```bash
sudo pcs alert remove email-alert
```

## Testing Alerts

Trigger a node event to test:

```bash
sudo pcs node standby node2
```

Check that notifications were received, then:

```bash
sudo pcs node unstandby node2
```

## Conclusion

Pacemaker alerts on RHEL 9 provide automated notifications for cluster events. Configure email alerts for operations teams, file-based alerts for log aggregation, and custom webhook scripts for integration with chat platforms and monitoring systems. Filter alerts by event type to reduce noise.
