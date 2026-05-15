# How to Configure Pacemaker Alerts and Notifications on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Alert, Notification, High Availability, Cluster, Monitoring, Linux

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

RHEL 9 includes sample alert agents:

```bash
ls /usr/share/pacemaker/alerts/
```

Common agents:

- `alert_smtp.sh.sample` - Send email notifications
- `alert_snmp.sh.sample` - Send SNMP traps
- `alert_file.sh.sample` - Write events to a file

Install the sample alert agents you plan to use on each cluster node:

```bash
sudo install --mode=0755 /usr/share/pacemaker/alerts/alert_smtp.sh.sample /var/lib/pacemaker/alert_smtp.sh
sudo install --mode=0755 /usr/share/pacemaker/alerts/alert_file.sh.sample /var/lib/pacemaker/alert_file.sh
```

## Configuring Email Alerts

### Step 1: Install a Mail Transfer Agent

```bash
sudo dnf install postfix -y
sudo systemctl enable --now postfix
```

### Step 2: Create the Alert

```bash
sudo pcs alert create id=email-alert path=/var/lib/pacemaker/alert_smtp.sh \
    options email_sender=cluster@example.com
```

### Step 3: Add Recipients

```bash
sudo pcs alert recipient add email-alert value=admin@example.com id=admin-email
```

Add multiple recipients:

```bash
sudo pcs alert recipient add email-alert value=oncall@example.com id=oncall-email
```

### Step 4: Configure the SMTP Server

Configure Postfix to relay through your SMTP server if the cluster nodes do not deliver mail directly:

```bash
sudo postconf -e 'relayhost = [smtp.example.com]'
sudo systemctl reload postfix
```

## Configuring File-Based Alerts

Write events to a log file:

```bash
sudo mkdir -p /var/log/cluster
sudo chown hacluster:haclient /var/log/cluster
sudo touch /var/log/cluster/alerts.log
sudo chown hacluster:haclient /var/log/cluster/alerts.log
sudo chmod 600 /var/log/cluster/alerts.log
sudo pcs alert create id=file-alert path=/var/lib/pacemaker/alert_file.sh
sudo pcs alert recipient add file-alert value=/var/log/cluster/alerts.log id=file-log
```

## Creating a Custom Alert Script

Create a custom script that sends to a webhook:

```bash
sudo tee /var/lib/pacemaker/alert_webhook.sh << 'SCRIPT'
#!/bin/bash

# Pacemaker passes event data as environment variables:

# CRM_alert_kind - node, fencing, or resource
# CRM_alert_node - affected node
# CRM_alert_desc - event description
# CRM_alert_rc - fencing or resource operation return code
# CRM_alert_recipient - configured recipient

case "${CRM_alert_kind}" in
    node)
        message="Node ${CRM_alert_node} is now ${CRM_alert_desc}"
        ;;
    fencing)
        message="Fencing operation on ${CRM_alert_node}: ${CRM_alert_desc}"
        ;;
    resource)
        message="Resource ${CRM_alert_rsc} on ${CRM_alert_node}: ${CRM_alert_desc} (rc=${CRM_alert_rc})"
        ;;
esac

json_message=${message//\\/\\\\}
json_message=${json_message//\"/\\\"}

curl -s -X POST "${CRM_alert_recipient}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"[Cluster Alert] ${json_message}\"}"

exit 0
SCRIPT

sudo chmod 755 /var/lib/pacemaker/alert_webhook.sh
sudo chown root:root /var/lib/pacemaker/alert_webhook.sh
```

Register the custom alert:

```bash
sudo pcs alert create id=webhook-alert path=/var/lib/pacemaker/alert_webhook.sh
sudo pcs alert recipient add webhook-alert value=https://hooks.slack.com/services/YOUR/WEBHOOK/URL id=webhook-url
```

## Filtering Alerts by Event Type

Restrict alerts to specific event types with a `select` element in the CIB. For example:

```xml
<!-- Only node events -->
<alert id="email-alert" path="/var/lib/pacemaker/alert_smtp.sh">
  <select>
    <select_nodes />
  </select>
</alert>

<!-- Only fencing events -->
<alert id="webhook-alert" path="/var/lib/pacemaker/alert_webhook.sh">
  <select>
    <select_fencing />
  </select>
</alert>

<!-- Node and resource events -->
<alert id="file-alert" path="/var/lib/pacemaker/alert_file.sh">
  <select>
    <select_nodes />
    <select_resources />
  </select>
</alert>
```

## Viewing Alert Configuration

```bash
sudo pcs alert
```

## Removing Alerts

Remove a recipient:

```bash
sudo pcs alert recipient remove admin-email
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
