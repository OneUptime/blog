# How to Set Up Keepalived with IPv6 Virtual IPs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Keepalived, High Availability, Networking, Linux, DevOps

Description: A comprehensive guide to configuring Keepalived with IPv6 virtual IPs for high availability, covering VRRP configuration, failover testing, and production best practices.

---

IPv6 adoption is accelerating. Whether driven by address exhaustion, regulatory requirements, or simply modernizing your infrastructure, the day will come when your high-availability stack needs to speak IPv6 natively. Keepalived, the battle-tested VRRP implementation for Linux, handles IPv6 virtual IPs with a few configuration tweaks that are not always obvious from the documentation.

This guide walks through a complete Keepalived setup with IPv6 virtual IPs: from prerequisites to production-ready configurations, failover testing, and the gotchas that will save you 3 AM debugging sessions.

## Quick Reference

| Topic | IPv4 Approach | IPv6 Approach |
| --- | --- | --- |
| **Address family** | `inet` (default) | `inet6` (explicit) |
| **Multicast group** | 224.0.0.18 | ff02::12 |
| **Router advertisement** | Not applicable | Must be disabled on VIP interfaces |
| **Neighbor Discovery** | ARP gratuitous | NA (Neighbor Advertisement) |
| **Typical VIP format** | 192.168.1.100/24 | 2001:db8:1::100/64 |
| **Health check scripts** | Same approach | Same approach |
| **Interface binding** | `interface eth0` | Same, but watch link-local scope |

## Prerequisites

Before diving into configuration, ensure your environment meets these requirements:

### 1. Kernel Support

Modern Linux kernels (4.x and above) include full IPv6 VRRP support. Verify IPv6 is enabled:

```bash
# Check IPv6 kernel module
lsmod | grep ipv6

# Verify IPv6 is enabled on your interface
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should return 0 (enabled)
```

### 2. Install Keepalived

On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install keepalived
```

On RHEL/CentOS/Rocky:

```bash
sudo dnf install keepalived
```

Verify the version supports IPv6 (1.2.13 and later have stable IPv6 support):

```bash
keepalived --version
```

### 3. Network Requirements

- Both nodes must be on the same Layer 2 network segment for VRRP to function
- IPv6 must be enabled and configured on the relevant interfaces
- Firewall rules must permit VRRP protocol (IP protocol 112)
- Multicast must be enabled on the network segment

### 4. IPv6 Address Planning

Plan your addressing scheme before configuring:

```
Network:          2001:db8:1::/64
Node 1 (Master):  2001:db8:1::10/64
Node 2 (Backup):  2001:db8:1::11/64
Virtual IP:       2001:db8:1::100/64
```

## Basic IPv6 Keepalived Configuration

Let us start with a minimal working configuration for two nodes sharing an IPv6 virtual IP.

### Master Node Configuration

Create `/etc/keepalived/keepalived.conf` on the master node:

```bash
# /etc/keepalived/keepalived.conf - Master Node

global_defs {
    router_id LVS_MASTER
    vrrp_version 3
    vrrp_iptables

    # Enable IPv6 forwarding for this instance
    enable_script_security

    # Logging configuration
    log_level 4
}

vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1

    # IPv6-specific: use multicast group ff02::12
    mcast_src_ip 2001:db8:1::10

    authentication {
        auth_type PASS
        auth_pass secretkey123
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    # Track the interface status
    track_interface {
        eth0
    }
}
```

### Backup Node Configuration

Create `/etc/keepalived/keepalived.conf` on the backup node:

```bash
# /etc/keepalived/keepalived.conf - Backup Node

global_defs {
    router_id LVS_BACKUP
    vrrp_version 3
    vrrp_iptables

    enable_script_security
    log_level 4
}

vrrp_instance VI_IPv6 {
    state BACKUP
    interface eth0
    virtual_router_id 60
    priority 90
    advert_int 1

    mcast_src_ip 2001:db8:1::11

    authentication {
        auth_type PASS
        auth_pass secretkey123
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    track_interface {
        eth0
    }
}
```

### Key Configuration Parameters Explained

| Parameter | Purpose | IPv6 Consideration |
| --- | --- | --- |
| `vrrp_version 3` | Use VRRPv3 (RFC 5798) | Required for native IPv6 support |
| `virtual_router_id` | Unique ID for the VRRP group | Must match on all nodes (1-255) |
| `priority` | Determines master election | Higher wins; master typically 100, backup 90 |
| `advert_int` | Advertisement interval (seconds) | Keep at 1 for fast failover |
| `mcast_src_ip` | Source IP for multicast packets | Use each node's IPv6 address |
| `vrrp_iptables` | Auto-create firewall rules | Handles VRRP protocol allow rules |

## Advanced Configuration Patterns

### Dual-Stack Configuration (IPv4 + IPv6)

Most production environments need both IPv4 and IPv6 virtual IPs. Here is how to configure both in a single Keepalived instance:

```bash
# /etc/keepalived/keepalived.conf - Dual Stack

global_defs {
    router_id LVS_DUALSTACK
    vrrp_version 3
    vrrp_iptables
    enable_script_security
}

# IPv4 VRRP Instance
vrrp_instance VI_IPv4 {
    state MASTER
    interface eth0
    virtual_router_id 50
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass ipv4secret
    }

    virtual_ipaddress {
        192.168.1.100/24
    }

    track_interface {
        eth0
    }
}

# IPv6 VRRP Instance
vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1

    mcast_src_ip 2001:db8:1::10

    authentication {
        auth_type PASS
        auth_pass ipv6secret
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    track_interface {
        eth0
    }
}
```

### Multiple IPv6 Virtual IPs

You can assign multiple virtual IPs to a single VRRP instance:

```bash
vrrp_instance VI_IPv6_MULTI {
    state MASTER
    interface eth0
    virtual_router_id 61
    priority 100
    advert_int 1

    mcast_src_ip 2001:db8:1::10

    authentication {
        auth_type PASS
        auth_pass multivip123
    }

    virtual_ipaddress {
        2001:db8:1::100/64
        2001:db8:1::101/64
        2001:db8:1::102/64
    }

    # Optionally specify the interface per VIP
    virtual_ipaddress_excluded {
        2001:db8:2::100/64 dev eth1
    }
}
```

### Unicast Mode (When Multicast is Blocked)

Some cloud environments and network configurations block multicast traffic. Use unicast mode instead:

```bash
vrrp_instance VI_IPv6_UNICAST {
    state MASTER
    interface eth0
    virtual_router_id 62
    priority 100
    advert_int 1

    # Disable multicast, use unicast
    unicast_src_ip 2001:db8:1::10

    unicast_peer {
        2001:db8:1::11
        2001:db8:1::12
    }

    authentication {
        auth_type PASS
        auth_pass unicast123
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }
}
```

### Health Check Scripts

Add health checks to trigger failover when services fail, not just when the network goes down:

```bash
# Define the health check script
vrrp_script check_nginx {
    script "/usr/local/bin/check_nginx.sh"
    interval 2
    weight -20
    fall 3
    rise 2
}

vrrp_script check_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight -20
    fall 3
    rise 2
}

vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1

    mcast_src_ip 2001:db8:1::10

    authentication {
        auth_type PASS
        auth_pass healthcheck
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    # Attach the health checks
    track_script {
        check_nginx
        check_haproxy
    }

    track_interface {
        eth0
    }
}
```

Create the health check script `/usr/local/bin/check_nginx.sh`:

```bash
#!/bin/bash
# /usr/local/bin/check_nginx.sh
# Returns 0 if nginx is healthy, 1 otherwise

# Check if nginx process is running
if ! pidof nginx > /dev/null; then
    exit 1
fi

# Check if nginx responds on IPv6
curl -6 -s -o /dev/null -w "%{http_code}" http://[::1]:80/ | grep -q "200\|301\|302"
if [ $? -ne 0 ]; then
    exit 1
fi

exit 0
```

Make the script executable:

```bash
chmod +x /usr/local/bin/check_nginx.sh
```

### Notification Scripts

Get notified when failover events occur:

```bash
vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1

    mcast_src_ip 2001:db8:1::10

    authentication {
        auth_type PASS
        auth_pass notify123
    }

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    # Notification scripts
    notify_master "/usr/local/bin/keepalived_notify.sh MASTER"
    notify_backup "/usr/local/bin/keepalived_notify.sh BACKUP"
    notify_fault  "/usr/local/bin/keepalived_notify.sh FAULT"
    notify_stop   "/usr/local/bin/keepalived_notify.sh STOP"
}
```

Create `/usr/local/bin/keepalived_notify.sh`:

```bash
#!/bin/bash
# /usr/local/bin/keepalived_notify.sh

STATE=$1
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log to syslog
logger -t keepalived "State transition to $STATE on $HOSTNAME at $TIMESTAMP"

# Send to monitoring system (e.g., OneUptime webhook)
curl -X POST "https://oneuptime.com/api/webhook/keepalived" \
    -H "Content-Type: application/json" \
    -d "{\"state\": \"$STATE\", \"hostname\": \"$HOSTNAME\", \"timestamp\": \"$TIMESTAMP\"}"

# Optional: Send email notification
# echo "Keepalived state changed to $STATE on $HOSTNAME" | mail -s "Keepalived Alert" admin@example.com

exit 0
```

## Firewall Configuration

### iptables/ip6tables Rules

If you are not using `vrrp_iptables` directive, manually configure firewall rules:

```bash
# Allow VRRP protocol (112) for IPv6
sudo ip6tables -A INPUT -p 112 -j ACCEPT
sudo ip6tables -A OUTPUT -p 112 -j ACCEPT

# Allow VRRP multicast group
sudo ip6tables -A INPUT -d ff02::12 -j ACCEPT

# Save the rules
sudo ip6tables-save > /etc/ip6tables.rules
```

### firewalld Configuration

For systems using firewalld:

```bash
# Create a custom service for VRRP
sudo firewall-cmd --permanent --new-service=vrrp

# Add VRRP protocol
sudo firewall-cmd --permanent --service=vrrp --add-protocol=112

# Add the service to the zone
sudo firewall-cmd --permanent --zone=public --add-service=vrrp

# Reload firewalld
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### nftables Configuration

For modern systems using nftables:

```bash
# /etc/nftables.conf addition

table inet filter {
    chain input {
        # Allow VRRP protocol
        ip protocol 112 accept
        ip6 nexthdr 112 accept

        # Allow VRRP multicast
        ip6 daddr ff02::12 accept
    }

    chain output {
        ip protocol 112 accept
        ip6 nexthdr 112 accept
    }
}
```

## Starting and Managing Keepalived

### Enable and Start the Service

```bash
# Enable Keepalived to start on boot
sudo systemctl enable keepalived

# Start the service
sudo systemctl start keepalived

# Check status
sudo systemctl status keepalived
```

### Verify Configuration

Before starting, validate your configuration:

```bash
# Check configuration syntax
sudo keepalived --config-test

# Or with explicit config file
sudo keepalived --config-test -f /etc/keepalived/keepalived.conf
```

### View Logs

```bash
# Follow Keepalived logs
sudo journalctl -u keepalived -f

# Or check syslog
sudo tail -f /var/log/syslog | grep -i keepalived
```

## Failover Testing

Thorough failover testing is essential before going to production. Here is a comprehensive test plan.

### Test 1: Verify Initial State

On the master node:

```bash
# Check if VIP is assigned
ip -6 addr show eth0 | grep "2001:db8:1::100"

# Expected output:
# inet6 2001:db8:1::100/64 scope global

# Check VRRP state
sudo cat /var/run/keepalived.pid && echo "Running"
```

On the backup node:

```bash
# VIP should NOT be present
ip -6 addr show eth0 | grep "2001:db8:1::100"

# Expected: no output
```

### Test 2: Service Failover

Stop Keepalived on the master to simulate failure:

```bash
# On master node
sudo systemctl stop keepalived

# Immediately check backup node
ip -6 addr show eth0 | grep "2001:db8:1::100"

# Expected: VIP should appear on backup within 1-3 seconds
```

Measure failover time:

```bash
# On a client machine, continuously ping the VIP
ping6 -i 0.1 2001:db8:1::100

# Count dropped packets during failover
# Acceptable: 1-3 lost packets (under 1 second)
```

### Test 3: Network Interface Failure

Simulate network failure:

```bash
# On master node, bring down the interface
sudo ip link set eth0 down

# Watch the backup node
watch -n 0.5 'ip -6 addr show eth0 | grep 2001:db8:1::100'

# Bring interface back up
sudo ip link set eth0 up
```

### Test 4: Health Check Failure

If using health check scripts, test the failover trigger:

```bash
# Stop the monitored service (e.g., nginx)
sudo systemctl stop nginx

# Check if failover occurs (priority drops by weight value)
# VIP should move to backup if master priority drops below backup
```

### Test 5: Split-Brain Scenario

Test what happens when nodes cannot communicate:

```bash
# On master, block VRRP traffic temporarily
sudo ip6tables -A INPUT -p 112 -j DROP
sudo ip6tables -A OUTPUT -p 112 -j DROP

# Both nodes will think they are master (split-brain)
# Remove the block after testing
sudo ip6tables -D INPUT -p 112 -j DROP
sudo ip6tables -D OUTPUT -p 112 -j DROP
```

### Test 6: Graceful Failback

After restoring the master:

```bash
# Start Keepalived on master
sudo systemctl start keepalived

# If using default preempt mode, master should reclaim VIP
# If using nopreempt, backup keeps VIP until it fails
```

### Automated Failover Test Script

Create a comprehensive test script:

```bash
#!/bin/bash
# /usr/local/bin/test_keepalived_failover.sh

VIP="2001:db8:1::100"
MASTER_HOST="node1.example.com"
BACKUP_HOST="node2.example.com"
TEST_DURATION=60

echo "Starting Keepalived IPv6 Failover Test"
echo "======================================="
echo "VIP: $VIP"
echo "Test Duration: ${TEST_DURATION}s"
echo ""

# Function to check VIP location
check_vip() {
    echo "Checking VIP location..."

    MASTER_HAS_VIP=$(ssh $MASTER_HOST "ip -6 addr show | grep -q $VIP && echo yes || echo no")
    BACKUP_HAS_VIP=$(ssh $BACKUP_HOST "ip -6 addr show | grep -q $VIP && echo yes || echo no")

    echo "Master ($MASTER_HOST) has VIP: $MASTER_HAS_VIP"
    echo "Backup ($BACKUP_HOST) has VIP: $BACKUP_HAS_VIP"

    if [ "$MASTER_HAS_VIP" = "yes" ] && [ "$BACKUP_HAS_VIP" = "yes" ]; then
        echo "WARNING: Split-brain detected!"
        return 1
    fi

    return 0
}

# Function to test connectivity
test_connectivity() {
    echo "Testing VIP connectivity..."

    if ping6 -c 3 -W 1 $VIP > /dev/null 2>&1; then
        echo "VIP is reachable"
        return 0
    else
        echo "VIP is NOT reachable"
        return 1
    fi
}

# Initial state
echo "=== Initial State ==="
check_vip
test_connectivity
echo ""

# Trigger failover
echo "=== Triggering Failover ==="
echo "Stopping Keepalived on master..."
ssh $MASTER_HOST "sudo systemctl stop keepalived"
sleep 3

check_vip
test_connectivity
echo ""

# Measure recovery
echo "=== Testing Failback ==="
echo "Starting Keepalived on master..."
ssh $MASTER_HOST "sudo systemctl start keepalived"
sleep 5

check_vip
test_connectivity
echo ""

echo "Failover test completed!"
```

## Troubleshooting Common Issues

### Issue 1: VIP Not Being Assigned

**Symptoms:** Keepalived starts but VIP never appears on any node.

**Diagnosis:**

```bash
# Check Keepalived status
sudo systemctl status keepalived

# Check for errors in logs
sudo journalctl -u keepalived --since "5 minutes ago"

# Verify interface exists
ip link show eth0

# Check if IPv6 is enabled
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
```

**Common causes and fixes:**

```bash
# 1. Wrong interface name
ip link show  # List all interfaces

# 2. IPv6 disabled
sudo sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# 3. Permission issues
sudo setcap cap_net_admin,cap_net_raw+ep /usr/sbin/keepalived
```

### Issue 2: Both Nodes Have VIP (Split-Brain)

**Symptoms:** Both master and backup show the VIP assigned.

**Diagnosis:**

```bash
# Check VRRP communication
sudo tcpdump -i eth0 -n ip6 proto 112

# Verify virtual_router_id matches on both nodes
grep virtual_router_id /etc/keepalived/keepalived.conf
```

**Fixes:**

```bash
# 1. Ensure firewall allows VRRP
sudo ip6tables -L -n | grep 112

# 2. Verify multicast works
ping6 -c 3 ff02::12%eth0

# 3. Check interface for multicast flag
ip link show eth0 | grep -i multicast
```

### Issue 3: Slow Failover

**Symptoms:** Failover takes more than 3 seconds.

**Diagnosis:**

```bash
# Check advertisement interval
grep advert_int /etc/keepalived/keepalived.conf

# Monitor VRRP packets
sudo tcpdump -i eth0 -n ip6 proto 112 -c 10
```

**Fixes:**

```bash
# Reduce advertisement interval (minimum 1 second for VRRPv3)
# In keepalived.conf:
advert_int 1

# For sub-second failover (requires VRRPv3):
advert_int 0.1  # 100ms
```

### Issue 4: VIP Not Reachable After Failover

**Symptoms:** VIP is assigned but clients cannot connect.

**Diagnosis:**

```bash
# Check Neighbor Discovery
ip -6 neigh show | grep "2001:db8:1::100"

# Check if gratuitous NA is being sent
sudo tcpdump -i eth0 -n icmp6 | grep -i neighbor
```

**Fixes:**

```bash
# Force neighbor advertisement
sudo ndisc6 -q 2001:db8:1::100 eth0

# Clear neighbor cache on clients
ip -6 neigh flush dev eth0
```

### Issue 5: Authentication Failures

**Symptoms:** Logs show authentication mismatch warnings.

**Diagnosis:**

```bash
# Check logs for auth errors
sudo journalctl -u keepalived | grep -i auth

# Verify passwords match
grep auth_pass /etc/keepalived/keepalived.conf
```

**Fixes:**

```bash
# Ensure auth_pass is identical on all nodes
# Note: VRRPv3 does not support authentication - use IPsec instead
# For VRRPv2 only:
authentication {
    auth_type PASS
    auth_pass exactlysamepassword
}
```

## Production Best Practices

### 1. Use VRRPv3 for IPv6

VRRPv3 (RFC 5798) is designed for both IPv4 and IPv6:

```bash
global_defs {
    vrrp_version 3
}
```

### 2. Implement Preemption Carefully

Consider whether automatic failback is desired:

```bash
vrrp_instance VI_IPv6 {
    state BACKUP       # Both nodes start as BACKUP
    nopreempt          # Prevents automatic failback
    priority 100       # Higher priority node becomes master
}
```

### 3. Monitor Keepalived Health

Export metrics to your monitoring system:

```bash
# Install keepalived-exporter for Prometheus
# Or use SNMP traps
# Or integrate with OneUptime using notification scripts
```

### 4. Use Separate VRRP Instances for Different Services

Do not bundle unrelated services:

```bash
# Separate instance for web traffic
vrrp_instance VI_WEB {
    virtual_router_id 60
    virtual_ipaddress {
        2001:db8:1::80/64
    }
}

# Separate instance for database traffic
vrrp_instance VI_DB {
    virtual_router_id 61
    virtual_ipaddress {
        2001:db8:1::5432/64
    }
}
```

### 5. Document Your Configuration

Maintain documentation for your HA setup:

```bash
# Add comments to your configuration
vrrp_instance VI_IPv6 {
    # Production web cluster VIP
    # Contact: ops@example.com
    # Last updated: 2026-01-15

    state MASTER
    interface eth0
    virtual_router_id 60  # Must be unique per VLAN
    ...
}
```

### 6. Test Failover Regularly

Schedule monthly failover drills:

```bash
# Add to cron for monthly testing
0 3 1 * * /usr/local/bin/test_keepalived_failover.sh >> /var/log/failover-test.log 2>&1
```

### 7. Secure VRRP Traffic

For production environments, consider IPsec:

```bash
# IPsec configuration for VRRP (strongSwan example)
conn vrrp-protection
    left=2001:db8:1::10
    right=2001:db8:1::11
    type=transport
    authby=secret
    esp=aes256-sha256
    auto=start
```

### 8. Handle Router Advertisements

Disable router advertisements on VIP interfaces:

```bash
# Prevent VIP from being advertised as a router
sudo sysctl -w net.ipv6.conf.eth0.accept_ra=0
sudo sysctl -w net.ipv6.conf.eth0.autoconf=0

# Make persistent in /etc/sysctl.conf
net.ipv6.conf.eth0.accept_ra = 0
net.ipv6.conf.eth0.autoconf = 0
```

### 9. Plan for IPv6 Extension Headers

Be aware that some firewalls mishandle IPv6 extension headers:

```bash
# Ensure your firewall properly handles IPv6 extension headers
sudo ip6tables -A INPUT -m ipv6header --header hop,dst,route,frag -j ACCEPT
```

### 10. Use Link-Local Addresses Appropriately

For purely local failover, consider link-local addresses:

```bash
vrrp_instance VI_LOCAL {
    state MASTER
    interface eth0
    virtual_router_id 63
    priority 100
    advert_int 1

    # Use link-local for internal communication
    mcast_src_ip fe80::10

    virtual_ipaddress {
        fe80::100/64
    }
}
```

## Complete Production Configuration Example

Here is a comprehensive production-ready configuration:

```bash
# /etc/keepalived/keepalived.conf
# Production IPv6 High Availability Configuration
# Last updated: 2026-01-15

global_defs {
    router_id PROD_LB_01
    vrrp_version 3
    vrrp_iptables
    enable_script_security

    # Notification email (optional)
    notification_email {
        ops@example.com
    }
    notification_email_from keepalived@example.com
    smtp_server localhost
    smtp_connect_timeout 30

    # Script paths
    script_user keepalived_script
}

# Health check for HAProxy
vrrp_script check_haproxy {
    script "/usr/local/bin/check_haproxy.sh"
    interval 2
    weight -30
    fall 3
    rise 2
    user keepalived_script
}

# Health check for general connectivity
vrrp_script check_connectivity {
    script "/usr/local/bin/check_connectivity.sh"
    interval 5
    weight -50
    fall 2
    rise 3
    user keepalived_script
}

# Primary IPv6 VRRP Instance
vrrp_instance VI_IPv6_PRIMARY {
    state BACKUP
    interface eth0
    virtual_router_id 60
    priority 100
    advert_int 1
    nopreempt

    mcast_src_ip 2001:db8:1::10

    virtual_ipaddress {
        2001:db8:1::100/64
    }

    track_interface {
        eth0 weight -50
    }

    track_script {
        check_haproxy
        check_connectivity
    }

    notify_master "/usr/local/bin/keepalived_notify.sh MASTER VI_IPv6_PRIMARY"
    notify_backup "/usr/local/bin/keepalived_notify.sh BACKUP VI_IPv6_PRIMARY"
    notify_fault  "/usr/local/bin/keepalived_notify.sh FAULT VI_IPv6_PRIMARY"
}

# Secondary IPv6 VRRP Instance (for different service)
vrrp_instance VI_IPv6_SECONDARY {
    state BACKUP
    interface eth0
    virtual_router_id 61
    priority 100
    advert_int 1
    nopreempt

    mcast_src_ip 2001:db8:1::10

    virtual_ipaddress {
        2001:db8:1::101/64
    }

    track_interface {
        eth0 weight -50
    }

    track_script {
        check_haproxy
    }

    notify_master "/usr/local/bin/keepalived_notify.sh MASTER VI_IPv6_SECONDARY"
    notify_backup "/usr/local/bin/keepalived_notify.sh BACKUP VI_IPv6_SECONDARY"
    notify_fault  "/usr/local/bin/keepalived_notify.sh FAULT VI_IPv6_SECONDARY"
}

# IPv4 Instance (Dual Stack)
vrrp_instance VI_IPv4 {
    state BACKUP
    interface eth0
    virtual_router_id 50
    priority 100
    advert_int 1
    nopreempt

    authentication {
        auth_type PASS
        auth_pass v4secret
    }

    virtual_ipaddress {
        192.168.1.100/24
    }

    track_interface {
        eth0 weight -50
    }

    track_script {
        check_haproxy
    }
}
```

## Integration with Load Balancers

Keepalived is commonly used with load balancers. Here is how to integrate with HAProxy for IPv6:

### HAProxy Configuration

```bash
# /etc/haproxy/haproxy.cfg

global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    log global
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

# Frontend listening on IPv6 VIP
frontend http_front_ipv6
    bind [2001:db8:1::100]:80
    bind [2001:db8:1::100]:443 ssl crt /etc/ssl/certs/example.pem
    default_backend http_back

# Backend servers
backend http_back
    balance roundrobin
    option httpchk GET /health
    server web1 [2001:db8:1::20]:8080 check
    server web2 [2001:db8:1::21]:8080 check
```

### HAProxy Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/check_haproxy.sh

# Check if HAProxy process is running
if ! pidof haproxy > /dev/null; then
    exit 1
fi

# Check HAProxy stats socket
echo "show stat" | socat stdio /var/run/haproxy.sock > /dev/null 2>&1
if [ $? -ne 0 ]; then
    exit 1
fi

# Check if HAProxy is listening on IPv6 VIP
ss -tlnp | grep -q '\[2001:db8:1::100\]:80'
if [ $? -ne 0 ]; then
    exit 1
fi

exit 0
```

## Summary Table

| Configuration Aspect | Recommendation |
| --- | --- |
| **VRRP Version** | Use VRRPv3 for IPv6 support |
| **Advertisement Interval** | 1 second (or lower for critical services) |
| **Priority** | Master: 100, Backup: 90 (adjust based on nodes) |
| **Preemption** | Use `nopreempt` for stability; enable for active-passive preference |
| **Health Checks** | Always implement service-level checks, not just network checks |
| **Authentication** | VRRPv3 does not support built-in auth; use IPsec for security |
| **Multicast vs Unicast** | Prefer multicast; use unicast when multicast is blocked |
| **Firewall** | Allow protocol 112; use `vrrp_iptables` for automatic rules |
| **Monitoring** | Integrate notification scripts with OneUptime or similar platforms |
| **Testing** | Monthly failover drills; automated testing scripts |
| **Documentation** | Comment configurations; maintain runbooks |

## Conclusion

Setting up Keepalived with IPv6 virtual IPs follows the same principles as IPv4, with a few key differences: you must use VRRPv3, explicitly configure the address family, and pay attention to Neighbor Discovery instead of ARP. The configuration patterns shown here will handle most production scenarios, from simple two-node failover to complex multi-VIP, dual-stack environments.

The most important takeaway: test your failover before you need it. Schedule regular drills, monitor your Keepalived instances, and ensure your team knows what happens when the pager goes off at 3 AM. High availability is not just about configuration files; it is about practiced responses to failure.

With IPv6 continuing its march toward ubiquity, building this expertise now prepares your infrastructure for the dual-stack reality that most organizations will operate in for years to come.

## Further Reading

- [Keepalived Official Documentation](https://www.keepalived.org/manpage.html)
- [RFC 5798 - VRRPv3](https://tools.ietf.org/html/rfc5798)
- [RFC 8200 - IPv6 Specification](https://tools.ietf.org/html/rfc8200)
- [Linux IPv6 HOWTO](https://tldp.org/HOWTO/Linux+IPv6-HOWTO/)
