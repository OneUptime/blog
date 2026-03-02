# How to Configure Desktop Notifications on Ubuntu Server (Headless)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Notifications, Headless, Server, Automation

Description: Learn how to configure desktop-style notifications on headless Ubuntu servers, including send-only notifications, notification forwarding over SSH, and alternative alerting approaches.

---

The concept of "desktop notifications" on a headless server might seem contradictory - there is no desktop to display them. But there are several valid use cases: forwarding system events as notifications to a remote desktop, triggering notification-style alerts from cron jobs or scripts, and using the D-Bus notification framework for inter-process communication even in headless contexts.

This guide covers both making notification tools work on headless servers and more practical alternatives for server alerting.

## Understanding the Notification Landscape

On a standard Ubuntu desktop, notifications go through D-Bus to a notification daemon (like GNOME's or libnotify's `notify-send` backend). On a headless server, D-Bus still runs, but there is no notification daemon watching for display notifications.

For server notifications, the practical approaches are:

1. **Email alerts**: Traditional, reliable, works with any mail client
2. **Slack/Teams webhooks**: Modern, supports rich formatting
3. **System journal alerts**: Log-based alerting with systemd
4. **SSH-forwarded notifications**: Show server events as desktop notifications on your workstation
5. **Push notifications**: Services like Gotify or ntfy for mobile push

## Setting Up libnotify on Ubuntu Server

Even on headless servers, you can install the notification tools:

```bash
# Install libnotify tools
sudo apt update
sudo apt install -y libnotify-bin

# This provides notify-send
notify-send --help

# On a headless server, notify-send needs a DISPLAY and DBUS_SESSION_BUS_ADDRESS
# Set these to connect to a specific session
```

## Forwarding Server Notifications to Your Desktop

The most useful "desktop notifications from server" setup is SSH notification forwarding. Your server sends notifications, and they appear on your workstation desktop.

### Using libnotify with SSH

```bash
# On your workstation, create a socket tunnel
# -R forwards the DBUS socket from the server to your workstation
# This is complex - a simpler approach uses a helper script on the server

# On the Ubuntu server, create a notification script
sudo tee /usr/local/bin/remote-notify << 'EOF'
#!/bin/bash
# Send a notification to a remote desktop via SSH
# Usage: remote-notify "Summary" "Body" [urgency]

SUMMARY="${1:-Notification}"
BODY="${2:-No details}"
URGENCY="${3:-normal}"
REMOTE_USER="yourusername"
REMOTE_HOST="your-workstation.example.com"

# Send notification via SSH to the remote desktop
ssh "${REMOTE_USER}@${REMOTE_HOST}" \
  "DISPLAY=:0 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/\$(id -u)/bus \
   notify-send -u ${URGENCY} '${SUMMARY}' '${BODY}'"
EOF

sudo chmod +x /usr/local/bin/remote-notify

# Test it
remote-notify "Server Alert" "Disk usage exceeded 80%"
```

### Setting Up SSH Key Authentication for Notifications

For automated notifications to work without a password prompt:

```bash
# Generate a notification-specific SSH key on the server
sudo -u notification-sender ssh-keygen -t ed25519 -C "server-notifications" \
  -f /etc/notification-keys/id_ed25519 -N ""

# Copy the public key to your workstation
cat /etc/notification-keys/id_ed25519.pub

# On your workstation, add to authorized_keys with command restriction
# echo 'command="notify-send \"\$SSH_ORIGINAL_COMMAND\"" ssh-ed25519 AAAA...' >> ~/.ssh/authorized_keys
```

## Using ntfy for Push Notifications

ntfy is a simple HTTP-based notification service that can send push notifications to your phone or browser:

```bash
# Install ntfy client
sudo apt install -y ntfy 2>/dev/null || \
  sudo snap install ntfy 2>/dev/null || {
    wget -q https://github.com/binwiederhier/ntfy/releases/download/v2.7.0/ntfy_2.7.0_linux_amd64.tar.gz
    tar xzf ntfy_*.tar.gz
    sudo cp ntfy /usr/local/bin/
  }

# Send a notification to ntfy.sh (public server) or your own ntfy instance
# Subscribe to a topic in the ntfy app on your phone: ntfy.sh/my-server-alerts

ntfy publish my-server-alerts "Disk space alert: root at 85%"

# With more options
ntfy publish \
  --title "Server Alert" \
  --priority high \
  --tags "warning,disk" \
  my-server-alerts "Root filesystem at 85% - please investigate"

# Create a wrapper for use in scripts
sudo tee /usr/local/bin/push-notify << 'EOF'
#!/bin/bash
# Send push notification via ntfy
TOPIC="my-server-alerts"      # Your ntfy topic
NTFY_URL="https://ntfy.sh"    # Or your self-hosted instance

TITLE="${1:-Server Notification}"
MESSAGE="${2:-No message}"
PRIORITY="${3:-default}"

curl -s \
  -H "Title: ${TITLE}" \
  -H "Priority: ${PRIORITY}" \
  -H "Tags: server,$(hostname -s)" \
  -d "${MESSAGE}" \
  "${NTFY_URL}/${TOPIC}" > /dev/null

echo "Notification sent: ${TITLE}"
EOF

sudo chmod +x /usr/local/bin/push-notify

# Test
push-notify "Test Alert" "This is a test notification from $(hostname)"
```

## Self-Hosted ntfy Server

For private notifications:

```bash
# Install ntfy server
sudo apt install -y ntfy 2>/dev/null || {
  wget https://github.com/binwiederhier/ntfy/releases/download/v2.7.0/ntfy_2.7.0_linux_amd64.deb
  sudo dpkg -i ntfy_*.deb
}

# Configure ntfy server
sudo tee /etc/ntfy/server.yml << 'EOF'
base-url: "https://ntfy.example.com"
listen-http: ":80"
# listen-https: ":443"
# key-file: /etc/ssl/private/ntfy.key
# cert-file: /etc/ssl/certs/ntfy.crt
cache-file: /var/cache/ntfy/cache.db
auth-file: /var/lib/ntfy/user.db
auth-default-access: "deny-all"
behind-proxy: true
EOF

sudo systemctl enable --now ntfy

# Create a user for publishing
ntfy user add --role admin adminuser
ntfy access adminuser '*' write-only
```

## Alerting from System Events

### Monitoring with systemd and Sending Notifications

```bash
# Create a service failure notification handler
sudo tee /usr/local/bin/service-failure-notify << 'EOF'
#!/bin/bash
# Called by systemd when a service fails
# Arguments: %n (service name) %u (UID) %i (service instance)

SERVICE_NAME="$1"
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log the failure
logger "Service failure: ${SERVICE_NAME} on ${HOSTNAME} at ${TIMESTAMP}"

# Send email notification
echo "Service ${SERVICE_NAME} failed on ${HOSTNAME} at ${TIMESTAMP}

$(systemctl status "${SERVICE_NAME}" 2>&1 | head -30)" | \
  mail -s "ALERT: Service ${SERVICE_NAME} failed on ${HOSTNAME}" \
  alerts@example.com

# Send push notification
/usr/local/bin/push-notify "Service Failure" "${SERVICE_NAME} failed on ${HOSTNAME}" urgent

EOF

sudo chmod +x /usr/local/bin/service-failure-notify

# Add failure notification to any service
# Edit the service file:
sudo mkdir -p /etc/systemd/system/nginx.service.d/

sudo tee /etc/systemd/system/nginx.service.d/notify-on-failure.conf << 'EOF'
[Service]
OnFailure=service-failure-notify@%n.service
EOF

# Create the notification service template
sudo tee /etc/systemd/system/service-failure-notify@.service << 'EOF'
[Unit]
Description=Send notification for failed service %i

[Service]
Type=oneshot
ExecStart=/usr/local/bin/service-failure-notify %i
EOF

sudo systemctl daemon-reload
```

### Disk Space Notifications

```bash
# Create a disk space monitoring script
sudo tee /usr/local/bin/check-disk-space << 'EOF'
#!/bin/bash
# Check disk usage and send notifications if over threshold

THRESHOLD=80
HOSTNAME=$(hostname -s)

while IFS= read -r line; do
    USAGE=$(echo "$line" | awk '{print $5}' | tr -d '%')
    MOUNT=$(echo "$line" | awk '{print $6}')
    DEVICE=$(echo "$line" | awk '{print $1}')

    if [[ "$USAGE" -gt "$THRESHOLD" ]]; then
        MESSAGE="Disk ${MOUNT} on ${HOSTNAME} is at ${USAGE}% (device: ${DEVICE})"
        /usr/local/bin/push-notify "Disk Space Alert" "$MESSAGE" high
        logger "DISK ALERT: $MESSAGE"
    fi
done < <(df -h | grep -v "tmpfs\|udev\|Filesystem")
EOF

sudo chmod +x /usr/local/bin/check-disk-space

# Add to cron
echo "*/15 * * * * /usr/local/bin/check-disk-space" | sudo tee /etc/cron.d/disk-monitor
```

## Webhook-Based Notifications (Slack, Teams)

```bash
# Create a Slack notification function
sudo tee /usr/local/bin/slack-notify << 'EOF'
#!/bin/bash
# Send notification to Slack via incoming webhook

WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
CHANNEL="#server-alerts"
USERNAME="$(hostname -s) Alert"

TITLE="${1:-Server Notification}"
MESSAGE="${2:-No message}"
COLOR="${3:-#FF0000}"  # Red for alerts

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"${CHANNEL}\",
    \"username\": \"${USERNAME}\",
    \"attachments\": [{
      \"color\": \"${COLOR}\",
      \"title\": \"${TITLE}\",
      \"text\": \"${MESSAGE}\",
      \"footer\": \"$(hostname) | $(date '+%Y-%m-%d %H:%M:%S')\",
      \"mrkdwn_in\": [\"text\"]
    }]
  }" > /dev/null

echo "Slack notification sent"
EOF

sudo chmod +x /usr/local/bin/slack-notify

# Test
slack-notify "Server Test" "Notification system is working on $(hostname)"
```

## Using wall for Local Console Notifications

For notifications visible to users logged into the server via terminal:

```bash
# Send a notification to all logged-in users
sudo wall "ALERT: Disk space at 90% on $(hostname). Please investigate."

# Create a script that broadcasts to logged-in users
sudo tee /usr/local/bin/broadcast-alert << 'EOF'
#!/bin/bash
# Broadcast an alert to all logged-in users
MESSAGE="$*"
echo "[$(date '+%H:%M:%S')] ALERT: ${MESSAGE}" | sudo wall
logger "Broadcast alert: ${MESSAGE}"
EOF

sudo chmod +x /usr/local/bin/broadcast-alert
```

## Summary: Choosing the Right Approach

For a headless Ubuntu server, the appropriate "notification" strategy depends on your use case:

- **SSH tunneled notify-send**: When you want desktop popups on your workstation for server events
- **ntfy or similar push service**: When you want mobile notifications for critical events
- **Slack/Teams webhooks**: When your team uses these platforms and wants alerts in-channel
- **Email**: When reliability matters more than immediacy
- **wall**: When you need to alert interactive terminal users on the server
- **systemd OnFailure**: When you want automatic alerts for service failures

The tools are simple but combining them thoughtfully - using push notifications for critical events, Slack for important ones, and email for summaries - creates a notification system that gets the right information to the right people without creating alert fatigue.
