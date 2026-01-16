# How to Set Up Keepalived for VRRP/Failover on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Keepalived, VRRP, High Availability, Failover, Tutorial

Description: Complete guide to setting up Keepalived for high availability with virtual IP failover on Ubuntu.

---

High availability is a critical requirement for production systems. When a server fails, you need traffic to automatically failover to a backup server without manual intervention. Keepalived, using the Virtual Router Redundancy Protocol (VRRP), provides an elegant solution for automatic IP failover between servers. In this comprehensive guide, we will walk through setting up Keepalived for VRRP failover on Ubuntu.

## Understanding VRRP and Keepalived

### What is VRRP?

The Virtual Router Redundancy Protocol (VRRP) is a network protocol that provides automatic assignment of available IP routers to participating hosts. It increases the availability and reliability of routing paths via automatic default gateway selections on an IP network.

Key VRRP concepts:

- **Virtual IP (VIP)**: A floating IP address that can move between servers
- **Master**: The server currently holding the VIP and handling traffic
- **Backup**: Standby server(s) ready to take over if the master fails
- **Priority**: Numeric value (1-255) determining which server becomes master
- **VRID**: Virtual Router ID that groups servers into a failover cluster

### What is Keepalived?

Keepalived is a robust and lightweight service that implements VRRP for Linux systems. It provides:

- **High availability**: Automatic failover of virtual IPs between servers
- **Load balancing**: Built-in IPVS (IP Virtual Server) support
- **Health checking**: Customizable scripts to monitor service health
- **Notification**: Hooks for executing scripts on state changes

### How VRRP Works

1. Multiple servers are configured with the same VRID and virtual IP
2. The server with the highest priority becomes the MASTER
3. The MASTER sends periodic VRRP advertisements (heartbeats)
4. BACKUP servers listen for these advertisements
5. If a BACKUP stops receiving advertisements, it assumes MASTER has failed
6. The BACKUP with the highest priority takes over as the new MASTER
7. When the original MASTER recovers, it can optionally reclaim the VIP

## Prerequisites

Before starting, ensure you have:

- Two or more Ubuntu servers (Ubuntu 20.04, 22.04, or 24.04)
- Root or sudo access on all servers
- Servers on the same network segment
- A free IP address to use as the Virtual IP

For this guide, we will use the following example setup:

| Role | Hostname | Primary IP | Virtual IP |
|------|----------|------------|------------|
| Master | node1 | 192.168.1.10 | 192.168.1.100 |
| Backup | node2 | 192.168.1.11 | 192.168.1.100 |

## Installing Keepalived

### Step 1: Update System Packages

First, update your system packages on both servers:

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Step 2: Install Keepalived

Install Keepalived from the Ubuntu repositories:

```bash
# Install keepalived package
sudo apt install keepalived -y
```

Verify the installation:

```bash
# Check keepalived version
keepalived --version

# Expected output similar to:
# Keepalived v2.2.8 (01/01,2024)
```

### Step 3: Enable Keepalived Service

Enable Keepalived to start automatically on boot:

```bash
# Enable keepalived service
sudo systemctl enable keepalived

# Check service status (will show inactive until configured)
sudo systemctl status keepalived
```

## Basic Configuration

The main Keepalived configuration file is located at `/etc/keepalived/keepalived.conf`. Let us start with a basic configuration.

### Understanding Configuration Structure

A Keepalived configuration consists of several blocks:

```
global_defs {
    # Global definitions and notification settings
}

vrrp_script script_name {
    # Health check script definitions
}

vrrp_instance instance_name {
    # VRRP instance configuration
}
```

### Creating the Configuration Directory

Ensure the configuration directory exists:

```bash
# Create keepalived configuration directory if it doesn't exist
sudo mkdir -p /etc/keepalived

# Create scripts directory for health checks
sudo mkdir -p /etc/keepalived/scripts
```

## Master/Backup Setup

### Master Server Configuration (node1)

Create the configuration file on the master server:

```bash
sudo nano /etc/keepalived/keepalived.conf
```

Add the following configuration:

```bash
# Keepalived Configuration - Master Server (node1)
# /etc/keepalived/keepalived.conf

# Global definitions block
# Contains global settings and notification email configuration
global_defs {
    # Unique identifier for this keepalived instance
    # Used in notifications and logs
    router_id node1

    # Email notifications configuration
    # Uncomment and configure if you want email alerts
    # notification_email {
    #     admin@example.com
    #     ops-team@example.com
    # }
    # notification_email_from keepalived@node1.example.com
    # smtp_server 127.0.0.1
    # smtp_connect_timeout 30

    # Enable scripts to run as root (required for some health checks)
    enable_script_security

    # Log detail level
    # Uncomment for more verbose logging during troubleshooting
    # vrrp_garp_master_delay 10
    # vrrp_garp_master_repeat 1
}

# VRRP Instance configuration
# Defines the virtual router and failover behavior
vrrp_instance VI_1 {
    # State: MASTER or BACKUP
    # The server with state MASTER and highest priority takes the VIP first
    state MASTER

    # Network interface to bind VRRP
    # This should be your primary network interface
    interface eth0

    # Virtual Router ID (1-255)
    # Must be the same on all servers in the same failover group
    # Must be unique per VRRP instance on the network segment
    virtual_router_id 51

    # Priority (1-255)
    # Higher priority = more likely to become master
    # Master should have higher priority than backups
    priority 100

    # Advertisement interval in seconds
    # How often the master sends heartbeat packets
    # Lower values = faster failover, but more network traffic
    advert_int 1

    # Preemption mode
    # When true (default), higher priority server reclaims VIP when it comes back
    # Set to false (nopreempt) to prevent automatic failback
    # nopreempt

    # Authentication between VRRP peers
    # All servers in the same VRRP group must use identical authentication
    authentication {
        # Authentication type: PASS (simple password) or AH (IPsec)
        auth_type PASS
        # Shared secret (max 8 characters for PASS type)
        auth_pass secret123
    }

    # Virtual IP addresses
    # These IPs will float between master and backup servers
    virtual_ipaddress {
        # Virtual IP with subnet mask and interface
        # You can specify multiple VIPs
        192.168.1.100/24 dev eth0 label eth0:vip
    }

    # Track network interfaces
    # If any tracked interface goes down, priority is reduced
    track_interface {
        eth0 weight -20
    }

    # Notification scripts (optional)
    # Scripts to run on state changes
    # notify_master "/etc/keepalived/scripts/notify.sh MASTER"
    # notify_backup "/etc/keepalived/scripts/notify.sh BACKUP"
    # notify_fault "/etc/keepalived/scripts/notify.sh FAULT"
}
```

### Backup Server Configuration (node2)

Create the configuration file on the backup server:

```bash
sudo nano /etc/keepalived/keepalived.conf
```

Add the following configuration:

```bash
# Keepalived Configuration - Backup Server (node2)
# /etc/keepalived/keepalived.conf

# Global definitions block
global_defs {
    # Unique identifier for this keepalived instance
    router_id node2

    # Enable scripts to run as root
    enable_script_security
}

# VRRP Instance configuration
vrrp_instance VI_1 {
    # State: BACKUP for this server
    state BACKUP

    # Network interface (must match master configuration)
    interface eth0

    # Virtual Router ID (must match master)
    virtual_router_id 51

    # Priority: Lower than master (100)
    # This server will only become master if node1 fails
    priority 90

    # Advertisement interval (must match master)
    advert_int 1

    # Authentication (must match master exactly)
    authentication {
        auth_type PASS
        auth_pass secret123
    }

    # Virtual IP addresses (must match master)
    virtual_ipaddress {
        192.168.1.100/24 dev eth0 label eth0:vip
    }

    # Track interfaces
    track_interface {
        eth0 weight -20
    }
}
```

### Starting Keepalived

Start the Keepalived service on both servers:

```bash
# Start keepalived service
sudo systemctl start keepalived

# Verify service is running
sudo systemctl status keepalived
```

Verify the VIP assignment:

```bash
# Check IP addresses on master (should show the VIP)
ip addr show eth0

# Expected output includes:
# inet 192.168.1.100/24 scope global secondary eth0:vip
```

## Virtual IP Configuration

### Multiple Virtual IPs

You can configure multiple virtual IPs for different services:

```bash
# Multiple VIP configuration example
virtual_ipaddress {
    # Primary VIP for web services
    192.168.1.100/24 dev eth0 label eth0:web

    # Secondary VIP for database services
    192.168.1.101/24 dev eth0 label eth0:db

    # VIP for API services
    192.168.1.102/24 dev eth0 label eth0:api
}
```

### VIP on Different Interfaces

For servers with multiple network interfaces:

```bash
# VIPs on different interfaces
virtual_ipaddress {
    # Public-facing VIP on external interface
    203.0.113.10/24 dev eth0 label eth0:public

    # Internal VIP on private interface
    10.0.0.100/24 dev eth1 label eth1:internal
}
```

### Excluded Virtual IPs

Virtual IPs that should not trigger protocol state changes:

```bash
# Main VIPs
virtual_ipaddress {
    192.168.1.100/24 dev eth0
}

# Excluded VIPs (won't affect VRRP state)
virtual_ipaddress_excluded {
    # Management VIP
    192.168.1.200/24 dev eth0
}
```

## Health Checks (track_script)

Health check scripts allow Keepalived to monitor service availability and trigger failover when services fail.

### Basic Health Check Script

Create a script to check if a service is running:

```bash
sudo nano /etc/keepalived/scripts/check_service.sh
```

```bash
#!/bin/bash
# Health check script for Keepalived
# /etc/keepalived/scripts/check_service.sh
#
# Exit codes:
#   0 = success (service is healthy)
#   1 = failure (service is unhealthy, triggers failover)

# Check if nginx is running
# Using pgrep to check for nginx process
if pgrep -x "nginx" > /dev/null; then
    # Nginx is running, return success
    exit 0
else
    # Nginx is not running, return failure
    exit 1
fi
```

Make the script executable:

```bash
sudo chmod +x /etc/keepalived/scripts/check_service.sh
```

### HTTP Health Check Script

A more comprehensive health check that verifies HTTP response:

```bash
sudo nano /etc/keepalived/scripts/check_http.sh
```

```bash
#!/bin/bash
# HTTP Health Check Script
# /etc/keepalived/scripts/check_http.sh
#
# Checks if the local web server is responding correctly
# Returns 0 on success, 1 on failure

# Configuration
URL="http://127.0.0.1/health"
TIMEOUT=3
EXPECTED_CODE=200

# Perform HTTP check using curl
# -s: silent mode
# -o /dev/null: discard output
# -w "%{http_code}": output only HTTP status code
# --connect-timeout: connection timeout in seconds
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$URL")

# Check if we got the expected response code
if [ "$HTTP_CODE" -eq "$EXPECTED_CODE" ]; then
    # Health check passed
    exit 0
else
    # Health check failed
    # Log the failure for debugging
    logger "Keepalived health check failed: HTTP $HTTP_CODE from $URL"
    exit 1
fi
```

### TCP Port Health Check

Check if a specific port is accepting connections:

```bash
sudo nano /etc/keepalived/scripts/check_port.sh
```

```bash
#!/bin/bash
# TCP Port Health Check Script
# /etc/keepalived/scripts/check_port.sh
#
# Checks if a TCP port is accepting connections

# Configuration
HOST="127.0.0.1"
PORT=80
TIMEOUT=2

# Check TCP connection using nc (netcat)
# -z: zero-I/O mode (just check connection)
# -w: timeout in seconds
if nc -z -w $TIMEOUT $HOST $PORT > /dev/null 2>&1; then
    # Port is accepting connections
    exit 0
else
    # Port is not responding
    logger "Keepalived: Port $PORT health check failed"
    exit 1
fi
```

### Integrating Health Checks in Configuration

Update the Keepalived configuration to use health checks:

```bash
# Keepalived Configuration with Health Checks
# /etc/keepalived/keepalived.conf

global_defs {
    router_id node1
    enable_script_security

    # Script security settings
    # Specify the user/group for running scripts
    script_user root
}

# Define health check script
# This block defines how and when to run the check
vrrp_script check_nginx {
    # Path to the health check script
    script "/etc/keepalived/scripts/check_service.sh"

    # Check interval in seconds
    interval 2

    # Number of consecutive successes required to consider healthy
    rise 2

    # Number of consecutive failures required to consider unhealthy
    fall 3

    # Weight adjustment when script fails
    # Negative value: subtract from priority when unhealthy
    # Positive value: add to priority when healthy
    weight -50

    # Timeout for script execution
    timeout 5
}

# HTTP health check definition
vrrp_script check_http {
    script "/etc/keepalived/scripts/check_http.sh"
    interval 3
    rise 2
    fall 2
    weight -30
    timeout 5
}

# VRRP Instance with health check tracking
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }

    # Track the health check scripts
    # If any tracked script fails, priority is adjusted by weight
    track_script {
        check_nginx
        check_http
    }
}
```

## Notification Scripts

Notification scripts run when Keepalived changes state, allowing you to perform custom actions during failover.

### Creating a Notification Script

```bash
sudo nano /etc/keepalived/scripts/notify.sh
```

```bash
#!/bin/bash
# Keepalived Notification Script
# /etc/keepalived/scripts/notify.sh
#
# This script is called when VRRP state changes
# Usage: notify.sh <STATE> <INSTANCE> <PRIORITY>
#
# Arguments:
#   STATE: MASTER, BACKUP, or FAULT
#   INSTANCE: VRRP instance name (e.g., VI_1)
#   PRIORITY: Current priority value

# Get arguments
STATE=$1
INSTANCE=$2
PRIORITY=$3

# Get timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log file location
LOG_FILE="/var/log/keepalived-state.log"

# Function to send email notification
send_email() {
    local SUBJECT="$1"
    local BODY="$2"
    # Uncomment and configure for email notifications
    # echo "$BODY" | mail -s "$SUBJECT" admin@example.com
}

# Function to log state change
log_state() {
    echo "[$TIMESTAMP] Server: $(hostname), Instance: $INSTANCE, State: $STATE, Priority: $PRIORITY" >> $LOG_FILE
}

# Actions based on state
case $STATE in
    "MASTER")
        # Server became MASTER
        log_state
        logger "Keepalived: Transitioned to MASTER state for $INSTANCE"

        # Start services that should only run on master
        # systemctl start myservice

        # Send notification
        send_email "Keepalived MASTER on $(hostname)" \
            "Server $(hostname) is now MASTER for $INSTANCE\nPriority: $PRIORITY\nTime: $TIMESTAMP"

        # Optional: Update DNS, notify load balancer, etc.
        ;;

    "BACKUP")
        # Server became BACKUP
        log_state
        logger "Keepalived: Transitioned to BACKUP state for $INSTANCE"

        # Stop services that should only run on master
        # systemctl stop myservice

        # Send notification
        send_email "Keepalived BACKUP on $(hostname)" \
            "Server $(hostname) is now BACKUP for $INSTANCE\nPriority: $PRIORITY\nTime: $TIMESTAMP"
        ;;

    "FAULT")
        # Server entered FAULT state
        log_state
        logger "Keepalived: Entered FAULT state for $INSTANCE"

        # Send alert notification
        send_email "ALERT: Keepalived FAULT on $(hostname)" \
            "WARNING: Server $(hostname) entered FAULT state for $INSTANCE\nPriority: $PRIORITY\nTime: $TIMESTAMP"
        ;;

    *)
        # Unknown state
        logger "Keepalived: Unknown state $STATE for $INSTANCE"
        ;;
esac

exit 0
```

Make the script executable:

```bash
sudo chmod +x /etc/keepalived/scripts/notify.sh
```

### Using Notification Scripts in Configuration

Update the VRRP instance configuration:

```bash
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }

    # Notification scripts
    # Called with: <state> <instance_name> <priority>

    # Script called when becoming MASTER
    notify_master "/etc/keepalived/scripts/notify.sh MASTER VI_1 100"

    # Script called when becoming BACKUP
    notify_backup "/etc/keepalived/scripts/notify.sh BACKUP VI_1 100"

    # Script called when entering FAULT state
    notify_fault "/etc/keepalived/scripts/notify.sh FAULT VI_1 100"

    # Alternative: Single notify script called for all transitions
    # The script receives: $1=group/instance, $2=name, $3=state, $4=priority
    # notify "/etc/keepalived/scripts/notify.sh"
}
```

### Slack Notification Script

For modern alerting, integrate with Slack:

```bash
sudo nano /etc/keepalived/scripts/slack_notify.sh
```

```bash
#!/bin/bash
# Slack Notification Script for Keepalived
# /etc/keepalived/scripts/slack_notify.sh

STATE=$1
INSTANCE=$2
PRIORITY=$3

# Slack webhook URL (replace with your webhook)
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Server information
HOSTNAME=$(hostname)
IP_ADDRESS=$(hostname -I | awk '{print $1}')
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Set color based on state
case $STATE in
    "MASTER")
        COLOR="good"
        EMOJI=":white_check_mark:"
        ;;
    "BACKUP")
        COLOR="warning"
        EMOJI=":large_orange_diamond:"
        ;;
    "FAULT")
        COLOR="#FF0000"
        EMOJI=":red_circle:"
        ;;
    *)
        COLOR="#808080"
        EMOJI=":question:"
        ;;
esac

# Build JSON payload
read -r -d '' PAYLOAD << EOF
{
    "attachments": [
        {
            "color": "$COLOR",
            "title": "$EMOJI Keepalived State Change",
            "fields": [
                {"title": "Server", "value": "$HOSTNAME", "short": true},
                {"title": "IP", "value": "$IP_ADDRESS", "short": true},
                {"title": "State", "value": "$STATE", "short": true},
                {"title": "Instance", "value": "$INSTANCE", "short": true},
                {"title": "Priority", "value": "$PRIORITY", "short": true},
                {"title": "Time", "value": "$TIMESTAMP", "short": true}
            ]
        }
    ]
}
EOF

# Send notification to Slack
curl -s -X POST -H 'Content-type: application/json' --data "$PAYLOAD" "$WEBHOOK_URL" > /dev/null

exit 0
```

## Nginx/HAProxy Integration

### Nginx High Availability Setup

Configure Keepalived to monitor and failover Nginx:

#### Nginx Health Check Script

```bash
sudo nano /etc/keepalived/scripts/check_nginx.sh
```

```bash
#!/bin/bash
# Nginx Health Check for Keepalived
# /etc/keepalived/scripts/check_nginx.sh

# Check if nginx process is running
if ! pgrep -x "nginx" > /dev/null; then
    logger "Keepalived: Nginx process not found"
    exit 1
fi

# Check if nginx is responding on localhost
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1/)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ]; then
    exit 0
else
    logger "Keepalived: Nginx health check failed with HTTP $HTTP_CODE"
    exit 1
fi
```

#### Complete Nginx HA Configuration

```bash
# Keepalived Configuration for Nginx High Availability
# /etc/keepalived/keepalived.conf

global_defs {
    router_id nginx_ha_node1
    enable_script_security
    script_user root
}

# Nginx health check
vrrp_script check_nginx {
    script "/etc/keepalived/scripts/check_nginx.sh"
    interval 2
    weight -50
    fall 3
    rise 2
    timeout 5
}

# VRRP instance for Nginx HA
vrrp_instance NGINX_HA {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass nginx_ha
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }

    track_script {
        check_nginx
    }

    notify_master "/etc/keepalived/scripts/notify.sh MASTER NGINX_HA 100"
    notify_backup "/etc/keepalived/scripts/notify.sh BACKUP NGINX_HA 100"
    notify_fault "/etc/keepalived/scripts/notify.sh FAULT NGINX_HA 100"
}
```

### HAProxy High Availability Setup

Configure Keepalived for HAProxy failover:

#### HAProxy Health Check Script

```bash
sudo nano /etc/keepalived/scripts/check_haproxy.sh
```

```bash
#!/bin/bash
# HAProxy Health Check for Keepalived
# /etc/keepalived/scripts/check_haproxy.sh

# Configuration
HAPROXY_STATS_URL="http://127.0.0.1:8404/stats"
HAPROXY_STATS_SOCKET="/var/run/haproxy/admin.sock"

# Method 1: Check if HAProxy process is running
if ! pgrep -x "haproxy" > /dev/null; then
    logger "Keepalived: HAProxy process not running"
    exit 1
fi

# Method 2: Check HAProxy stats page (if enabled)
if [ -n "$HAPROXY_STATS_URL" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$HAPROXY_STATS_URL")
    if [ "$HTTP_CODE" -ne 200 ]; then
        logger "Keepalived: HAProxy stats check failed with HTTP $HTTP_CODE"
        exit 1
    fi
fi

# Method 3: Check via HAProxy socket (alternative)
# if [ -S "$HAPROXY_STATS_SOCKET" ]; then
#     if ! echo "show info" | socat stdio "$HAPROXY_STATS_SOCKET" > /dev/null 2>&1; then
#         logger "Keepalived: HAProxy socket check failed"
#         exit 1
#     fi
# fi

exit 0
```

#### Complete HAProxy HA Configuration

```bash
# Keepalived Configuration for HAProxy High Availability
# /etc/keepalived/keepalived.conf

global_defs {
    router_id haproxy_ha_node1
    enable_script_security
    script_user root
}

# HAProxy health check
vrrp_script check_haproxy {
    script "/etc/keepalived/scripts/check_haproxy.sh"
    interval 2
    weight -50
    fall 3
    rise 2
    timeout 5
}

# VRRP instance for HAProxy HA
vrrp_instance HAPROXY_HA {
    state MASTER
    interface eth0
    virtual_router_id 70
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass haproxy_ha
    }

    # Virtual IP for load balancer
    virtual_ipaddress {
        192.168.1.100/24 dev eth0 label eth0:vip
    }

    track_script {
        check_haproxy
    }

    # Enable non-local IP binding
    # Required for HAProxy to bind to VIP before it's assigned
    # Add to /etc/sysctl.conf: net.ipv4.ip_nonlocal_bind = 1
}
```

#### Enable Non-Local IP Binding for HAProxy

HAProxy needs to bind to the VIP even when it is not assigned to the server:

```bash
# Add to /etc/sysctl.conf
echo "net.ipv4.ip_nonlocal_bind = 1" | sudo tee -a /etc/sysctl.conf

# Apply immediately
sudo sysctl -p
```

## Firewall Configuration

### UFW (Uncomplicated Firewall)

Configure UFW to allow VRRP traffic:

```bash
# Allow VRRP protocol (IP protocol 112)
# VRRP uses multicast address 224.0.0.18
sudo ufw allow from 192.168.1.0/24 to 224.0.0.18 proto vrrp

# Alternative: Allow all traffic from peer servers
sudo ufw allow from 192.168.1.10   # Allow from node1
sudo ufw allow from 192.168.1.11   # Allow from node2

# If using UFW, you may need to edit before.rules
sudo nano /etc/ufw/before.rules
```

Add before the `*filter` section:

```bash
# Allow VRRP traffic
-A ufw-before-input -p vrrp -j ACCEPT
-A ufw-before-output -p vrrp -j ACCEPT
```

Reload UFW:

```bash
sudo ufw reload
```

### iptables

Configure iptables directly:

```bash
# Allow VRRP protocol (protocol number 112)
sudo iptables -A INPUT -p vrrp -j ACCEPT
sudo iptables -A OUTPUT -p vrrp -j ACCEPT

# Allow VRRP multicast
sudo iptables -A INPUT -d 224.0.0.18/32 -j ACCEPT
sudo iptables -A OUTPUT -d 224.0.0.18/32 -j ACCEPT

# Allow traffic from peer servers
sudo iptables -A INPUT -s 192.168.1.10 -j ACCEPT
sudo iptables -A INPUT -s 192.168.1.11 -j ACCEPT

# Save iptables rules
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

### Firewalld

For systems using firewalld:

```bash
# Allow VRRP protocol
sudo firewall-cmd --permanent --add-protocol=vrrp

# Allow VRRP from specific zone
sudo firewall-cmd --permanent --zone=trusted --add-source=192.168.1.0/24

# Reload firewalld
sudo firewall-cmd --reload
```

### Cloud Provider Considerations

#### AWS

AWS does not support multicast, so standard VRRP will not work. Use unicast mode:

```bash
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    # Use unicast instead of multicast for cloud environments
    unicast_src_ip 10.0.1.10    # This server's private IP
    unicast_peer {
        10.0.1.11               # Peer server's private IP
    }

    authentication {
        auth_type PASS
        auth_pass secret123
    }

    virtual_ipaddress {
        10.0.1.100/24 dev eth0
    }
}
```

Note: For AWS, you typically need to use Elastic IPs with API-based failover scripts instead of VRRP VIPs.

#### DigitalOcean/Vultr

These providers support floating IPs with API-based reassignment. You can use Keepalived with notification scripts that call their APIs.

## Testing Failover

### Verify Initial Setup

On the master server (node1):

```bash
# Check Keepalived status
sudo systemctl status keepalived

# View VRRP state
sudo journalctl -u keepalived -f

# Check if VIP is assigned
ip addr show eth0 | grep -E "192\.168\.1\.100"

# Check VRRP statistics
sudo keepalived --dump-conf
```

On the backup server (node2):

```bash
# Verify backup state
sudo journalctl -u keepalived -f

# Confirm VIP is NOT assigned to backup
ip addr show eth0 | grep -E "192\.168\.1\.100"
```

### Test Failover Scenarios

#### Scenario 1: Stop Keepalived on Master

```bash
# On node1 (master), stop keepalived
sudo systemctl stop keepalived

# On node2 (backup), verify VIP takeover
ip addr show eth0 | grep -E "192\.168\.1\.100"
# Should now show the VIP

# Restart keepalived on node1
sudo systemctl start keepalived

# Verify VIP returns to node1 (if preempt is enabled)
ip addr show eth0 | grep -E "192\.168\.1\.100"
```

#### Scenario 2: Stop the Monitored Service

```bash
# On node1, stop nginx (or your monitored service)
sudo systemctl stop nginx

# Watch the failover
sudo journalctl -u keepalived -f

# node2 should become master within a few seconds
```

#### Scenario 3: Network Interface Failure

```bash
# Simulate network failure on node1
sudo ip link set eth0 down

# Verify failover to node2
# On node2:
ip addr show eth0

# Restore network on node1
sudo ip link set eth0 up
```

#### Scenario 4: Test from Client Perspective

From a client machine:

```bash
# Continuous ping to VIP
ping 192.168.1.100

# Watch for any packet loss during failover
# Expect 1-3 seconds of loss during transition
```

### Automated Failover Testing Script

```bash
sudo nano /etc/keepalived/scripts/test_failover.sh
```

```bash
#!/bin/bash
# Failover Testing Script
# /etc/keepalived/scripts/test_failover.sh

VIP="192.168.1.100"
LOG_FILE="/var/log/failover-test.log"

echo "=== Failover Test Started at $(date) ===" | tee -a $LOG_FILE

# Test 1: Check current state
echo "Current VRRP state:" | tee -a $LOG_FILE
ip addr show | grep $VIP | tee -a $LOG_FILE

# Test 2: Check Keepalived status
echo "Keepalived status:" | tee -a $LOG_FILE
systemctl is-active keepalived | tee -a $LOG_FILE

# Test 3: Check health check scripts
echo "Running health check:" | tee -a $LOG_FILE
/etc/keepalived/scripts/check_nginx.sh
echo "Health check exit code: $?" | tee -a $LOG_FILE

# Test 4: Verify VIP is reachable
echo "Pinging VIP:" | tee -a $LOG_FILE
ping -c 3 $VIP | tee -a $LOG_FILE

echo "=== Failover Test Completed ===" | tee -a $LOG_FILE
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: VIP Not Assigned

**Symptoms**: Virtual IP does not appear on any server

**Solutions**:

```bash
# Check Keepalived is running
sudo systemctl status keepalived

# Check for configuration errors
sudo keepalived -f /etc/keepalived/keepalived.conf --check

# Verify network interface name
ip link show

# Check syslog for errors
sudo journalctl -u keepalived --no-pager | tail -50

# Ensure VRRP traffic is allowed
sudo tcpdump -i eth0 vrrp
```

#### Issue 2: Split-Brain (Both Servers Claim Master)

**Symptoms**: Both servers have the VIP assigned simultaneously

**Solutions**:

```bash
# Check firewall rules - ensure VRRP (protocol 112) is allowed
sudo iptables -L -n | grep vrrp

# Verify authentication matches on both servers
# Check virtual_router_id is the same on both servers

# Check network connectivity between servers
ping -c 3 192.168.1.11  # From node1 to node2

# Verify multicast is working
sudo tcpdump -i eth0 host 224.0.0.18

# If in cloud environment, switch to unicast mode
```

#### Issue 3: Frequent State Changes (Flapping)

**Symptoms**: Server rapidly switches between MASTER and BACKUP

**Solutions**:

```bash
# Increase advertisement interval
advert_int 2  # Instead of 1

# Adjust health check parameters
vrrp_script check_service {
    script "/etc/keepalived/scripts/check_service.sh"
    interval 5    # Increase interval
    fall 5        # Require more failures
    rise 3        # Require more successes
    weight -50
}

# Check for network issues
sudo mtr 192.168.1.11

# Check system resources
top
vmstat 1
```

#### Issue 4: Health Check Script Not Working

**Symptoms**: Health check does not trigger failover

**Solutions**:

```bash
# Test script manually
sudo /etc/keepalived/scripts/check_nginx.sh
echo $?  # Should return 0 (healthy) or 1 (unhealthy)

# Check script permissions
ls -la /etc/keepalived/scripts/
# Scripts must be executable

# Verify script_user in configuration
global_defs {
    script_user root
    enable_script_security
}

# Check script execution in logs
sudo journalctl -u keepalived | grep -i script

# Ensure bash shebang is correct
head -1 /etc/keepalived/scripts/check_nginx.sh
# Should be: #!/bin/bash
```

#### Issue 5: VIP Not Accessible from Network

**Symptoms**: VIP is assigned but clients cannot connect

**Solutions**:

```bash
# Check IP is properly assigned
ip addr show eth0

# Verify ARP is updated
# On a client machine:
arp -a | grep 192.168.1.100

# Force ARP update on server
sudo arping -U -I eth0 192.168.1.100 -c 3

# Check routing
ip route show

# Verify no IP conflicts
sudo arping -D -I eth0 192.168.1.100 -c 3
```

### Useful Debugging Commands

```bash
# View Keepalived configuration (parsed)
sudo keepalived --dump-conf

# Check Keepalived version and build options
keepalived --version

# Real-time log monitoring
sudo journalctl -u keepalived -f

# Detailed syslog messages
sudo tail -f /var/log/syslog | grep -i keepalived

# Check VRRP packets
sudo tcpdump -i eth0 -nn vrrp

# View Keepalived statistics
sudo killall -USR1 keepalived
sudo cat /tmp/keepalived.stats

# Check current VRRP state
sudo killall -USR2 keepalived
sudo cat /tmp/keepalived.data
```

### Log Analysis

```bash
# Common log messages and meanings

# Successful master election
"VRRP_Instance(VI_1) Entering MASTER STATE"

# Transition to backup
"VRRP_Instance(VI_1) Entering BACKUP STATE"

# Received higher priority advertisement
"VRRP_Instance(VI_1) Received higher priority advert"

# Script check failure
"VRRP_Script(check_nginx) failed"

# Authentication failure
"Invalid authentication type"
"authentication failure"

# Configuration error
"Configuration error"
"Invalid value"
```

## Advanced Configuration Options

### Sync Groups

Group multiple VRRP instances to fail over together:

```bash
# Sync group configuration
vrrp_sync_group VG_1 {
    group {
        VI_WEB
        VI_DB
    }

    # Notification for the entire group
    notify_master "/etc/keepalived/scripts/notify.sh MASTER VG_1"
    notify_backup "/etc/keepalived/scripts/notify.sh BACKUP VG_1"
}

vrrp_instance VI_WEB {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass web123
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }
}

vrrp_instance VI_DB {
    state MASTER
    interface eth0
    virtual_router_id 52
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass db123
    }

    virtual_ipaddress {
        192.168.1.101/24 dev eth0
    }
}
```

### Priority Adjustment with Multiple Checks

```bash
# Multiple health checks with different weights
vrrp_script check_nginx {
    script "/etc/keepalived/scripts/check_nginx.sh"
    interval 2
    weight -30
}

vrrp_script check_disk {
    script "/etc/keepalived/scripts/check_disk.sh"
    interval 10
    weight -20
}

vrrp_script check_memory {
    script "/etc/keepalived/scripts/check_memory.sh"
    interval 10
    weight -10
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secret
    }

    virtual_ipaddress {
        192.168.1.100/24 dev eth0
    }

    track_script {
        check_nginx   # -30 on failure
        check_disk    # -20 on failure
        check_memory  # -10 on failure
    }

    # Total priority on all failures: 100 - 30 - 20 - 10 = 40
    # Backup with priority 90 would take over
}
```

### Graceful Shutdown

Configure graceful failover when shutting down:

```bash
# Create shutdown script
sudo nano /etc/keepalived/scripts/shutdown.sh
```

```bash
#!/bin/bash
# Graceful shutdown script for Keepalived
# /etc/keepalived/scripts/shutdown.sh

# Reduce priority to trigger failover before stopping
sudo killall -SIGUSR1 keepalived

# Wait for failover
sleep 5

# Stop keepalived
sudo systemctl stop keepalived
```

## Complete Production Configuration Example

Here is a complete production-ready configuration:

```bash
# Production Keepalived Configuration
# /etc/keepalived/keepalived.conf
#
# This configuration provides:
# - High availability for web services (Nginx/HAProxy)
# - Multiple health checks
# - Notification scripts
# - Proper security settings

global_defs {
    # Unique router identifier
    router_id lb_primary

    # Email notifications
    notification_email {
        ops@example.com
    }
    notification_email_from keepalived@example.com
    smtp_server localhost
    smtp_connect_timeout 30

    # Security settings
    enable_script_security
    script_user root

    # Gratuitous ARP settings for faster failover
    vrrp_garp_master_delay 5
    vrrp_garp_master_repeat 3
    vrrp_garp_master_refresh 60

    # Reduce priority instead of going to fault state
    vrrp_gna_interval 0
}

# Health check: Nginx process
vrrp_script check_nginx {
    script "/etc/keepalived/scripts/check_nginx.sh"
    interval 2
    timeout 5
    weight -50
    fall 3
    rise 2
}

# Health check: Disk space
vrrp_script check_disk {
    script "/etc/keepalived/scripts/check_disk.sh"
    interval 30
    timeout 10
    weight -20
    fall 2
    rise 1
}

# Health check: System load
vrrp_script check_load {
    script "/etc/keepalived/scripts/check_load.sh"
    interval 15
    timeout 10
    weight -10
    fall 3
    rise 2
}

# VRRP Instance for Web Services
vrrp_instance WEB_VIP {
    # Initial state (MASTER on primary, BACKUP on secondary)
    state MASTER

    # Network interface
    interface eth0

    # Virtual router ID (unique per VRRP group)
    virtual_router_id 100

    # Priority (higher = preferred master)
    priority 100

    # Advertisement interval
    advert_int 1

    # Enable preemption (master reclaims VIP after recovery)
    # Comment out for no preemption
    # nopreempt

    # Preemption delay (seconds to wait before reclaiming)
    preempt_delay 60

    # Authentication
    authentication {
        auth_type PASS
        auth_pass pr0dP@ss
    }

    # Virtual IPs
    virtual_ipaddress {
        # Primary VIP for HTTPS traffic
        192.168.1.100/24 dev eth0 label eth0:https

        # Secondary VIP for HTTP redirect
        192.168.1.101/24 dev eth0 label eth0:http
    }

    # Track network interfaces
    track_interface {
        eth0 weight -100  # Lose all priority if interface fails
    }

    # Track health check scripts
    track_script {
        check_nginx weight 50   # Can override default weight
        check_disk
        check_load
    }

    # Notification scripts
    notify_master "/etc/keepalived/scripts/notify.sh MASTER WEB_VIP"
    notify_backup "/etc/keepalived/scripts/notify.sh BACKUP WEB_VIP"
    notify_fault "/etc/keepalived/scripts/notify.sh FAULT WEB_VIP"

    # SMTP alert (alternative to notify scripts)
    smtp_alert
}
```

## Monitoring Keepalived with OneUptime

While Keepalived provides robust failover capabilities, you need proper monitoring to ensure your high availability setup is functioning correctly. **OneUptime** offers comprehensive monitoring that perfectly complements Keepalived deployments.

With OneUptime, you can:

- **Monitor Virtual IP Availability**: Set up HTTP/HTTPS monitors on your VIPs to ensure they are always accessible
- **Track Failover Events**: Monitor system logs and receive instant alerts when failover occurs
- **Service Health Monitoring**: Monitor the underlying services (Nginx, HAProxy) that Keepalived protects
- **Multi-Location Checks**: Verify VIP accessibility from multiple geographic locations
- **Custom Health Endpoints**: Create dedicated health check endpoints that OneUptime monitors
- **Incident Management**: Automatically create incidents when failover events occur
- **Status Pages**: Keep your users informed about service availability with public or private status pages
- **On-Call Scheduling**: Ensure the right team members are notified during failover events
- **Historical Metrics**: Track failover frequency and patterns over time to identify underlying issues

To integrate OneUptime monitoring with your Keepalived setup:

1. Create HTTP monitors for each virtual IP address
2. Set up log monitoring to detect Keepalived state changes
3. Configure alerts to notify your team of any failover events
4. Create a status page component for your HA services

By combining Keepalived's automatic failover with OneUptime's comprehensive monitoring, you achieve true high availability with full visibility into your infrastructure's health status.

Visit [OneUptime](https://oneuptime.com) to start monitoring your Keepalived deployment and ensure your high availability infrastructure is always performing optimally.
