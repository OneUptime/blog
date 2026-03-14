# How to Configure NAT Masquerading with Firewalld on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Firewalld, NAT, Masquerading, Linux

Description: How to set up NAT masquerading with firewalld on RHEL, turning your RHEL server into a gateway that provides internet access to private network hosts.

---

NAT masquerading lets hosts on a private network access the internet through a RHEL server acting as a gateway. The gateway replaces the private source IP with its own public IP on outgoing packets, and reverses the process for return traffic. This is the same thing your home router does, and on RHEL, firewalld makes it straightforward to set up.

## How Masquerading Works

```mermaid
graph LR
    A[Private Host<br>10.0.1.50] -->|src: 10.0.1.50| B[RHEL Gateway<br>eth1: 10.0.1.1<br>eth0: 203.0.113.10]
    B -->|src: 203.0.113.10| C[Internet]
    C -->|dst: 203.0.113.10| B
    B -->|dst: 10.0.1.50| A
```

The gateway translates:
- Outgoing: Source 10.0.1.50 becomes 203.0.113.10
- Incoming (return): Destination 203.0.113.10 becomes 10.0.1.50

## Prerequisites

- RHEL server with two network interfaces
- One interface connected to the private network (e.g., eth1 - 10.0.1.1/24)
- One interface connected to the internet or upstream network (e.g., eth0 - public IP)
- Root or sudo access

## Step 1: Enable IP Forwarding

The kernel must forward packets between interfaces:

```bash
# Enable IP forwarding permanently
echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-ip-forward.conf
sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Verify
sysctl net.ipv4.ip_forward
```

## Step 2: Configure Zones

Assign each interface to an appropriate zone:

```bash
# External (internet-facing) interface
firewall-cmd --zone=external --change-interface=eth0 --permanent

# Internal (private network) interface
firewall-cmd --zone=internal --change-interface=eth1 --permanent

firewall-cmd --reload
```

The `external` zone has masquerading enabled by default. You can verify:

```bash
firewall-cmd --zone=external --query-masquerade
```

## Step 3: Enable Masquerading

If you are using a zone that does not have masquerading by default:

```bash
# Enable masquerading on the external zone
firewall-cmd --zone=external --add-masquerade --permanent
firewall-cmd --reload
```

## Step 4: Configure the Internal Zone

Allow the internal network to use the gateway:

```bash
# Allow DNS, DHCP, and other internal services
firewall-cmd --zone=internal --add-service=dns --permanent
firewall-cmd --zone=internal --add-service=dhcp --permanent
firewall-cmd --zone=internal --add-service=ssh --permanent

firewall-cmd --reload
```

## Step 5: Configure Private Hosts

On each private network host, set the RHEL gateway as their default gateway:

```bash
# On the private host, set the gateway
nmcli connection modify "Wired connection 1" ipv4.gateway 10.0.1.1
nmcli connection modify "Wired connection 1" ipv4.dns "10.0.1.1"
nmcli connection up "Wired connection 1"
```

## Step 6: Verify

From a private network host:

```bash
# Test connectivity through the gateway
ping -c 4 8.8.8.8

# Test DNS resolution
dig google.com

# Check your public IP (should show the gateway's public IP)
curl ifconfig.me
```

On the gateway, watch the traffic:

```bash
# Watch NAT translations
conntrack -L | head -20

# Or watch traffic on the external interface
tcpdump -i eth0 -nn | head -20
```

## Running DHCP on the Gateway

If you want the gateway to hand out IP addresses:

```bash
# Install dhcp-server
dnf install -y dhcp-server

# Configure DHCP for the internal interface
cat > /etc/dhcp/dhcpd.conf << 'EOF'
subnet 10.0.1.0 netmask 255.255.255.0 {
    range 10.0.1.100 10.0.1.200;
    option routers 10.0.1.1;
    option domain-name-servers 8.8.8.8, 8.8.4.4;
    default-lease-time 3600;
    max-lease-time 7200;
}
EOF

# Start DHCP server
systemctl enable --now dhcpd
```

## Running DNS on the Gateway

A caching DNS resolver on the gateway reduces external DNS queries:

```bash
# Install a DNS resolver
dnf install -y dnsmasq

# Configure dnsmasq
cat > /etc/dnsmasq.d/gateway.conf << 'EOF'
interface=eth1
bind-interfaces
listen-address=10.0.1.1
server=8.8.8.8
server=8.8.4.4
cache-size=1000
EOF

# Allow DNS in firewalld
firewall-cmd --zone=internal --add-service=dns --permanent
firewall-cmd --reload

# Start dnsmasq
systemctl enable --now dnsmasq
```

## Port Forwarding Through the Gateway

Forward external traffic to internal hosts:

```bash
# Forward port 80 to an internal web server
firewall-cmd --zone=external --add-forward-port=port=80:proto=tcp:toport=80:toaddr=10.0.1.50 --permanent

# Forward port 443 to the same server
firewall-cmd --zone=external --add-forward-port=port=443:proto=tcp:toport=443:toaddr=10.0.1.50 --permanent

firewall-cmd --reload
```

## Restricting Outbound Access

You might want to limit what the private network can access:

```bash
# Only allow HTTP, HTTPS, and DNS outbound
# Use direct rules for outbound filtering
firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -i eth1 -o eth0 -p tcp --dport 80 -j ACCEPT --permanent
firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -i eth1 -o eth0 -p tcp --dport 443 -j ACCEPT --permanent
firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -i eth1 -o eth0 -p udp --dport 53 -j ACCEPT --permanent
firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -i eth1 -o eth0 -p tcp --dport 53 -j ACCEPT --permanent

# Allow return traffic for established connections
firewall-cmd --direct --add-rule ipv4 filter FORWARD 0 -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT --permanent

# Drop everything else forwarded
firewall-cmd --direct --add-rule ipv4 filter FORWARD 10 -i eth1 -o eth0 -j DROP --permanent

firewall-cmd --reload
```

## Monitoring NAT Connections

```bash
# Install conntrack tools
dnf install -y conntrack-tools

# View active NAT translations
conntrack -L -n

# Count active connections
conntrack -C

# Watch connections in real time
conntrack -E
```

## Tuning for Performance

For a busy gateway, tune the connection tracking table:

```bash
# Check current limits
sysctl net.netfilter.nf_conntrack_max
sysctl net.netfilter.nf_conntrack_count

# Increase the maximum connections
echo "net.netfilter.nf_conntrack_max = 262144" >> /etc/sysctl.d/99-ip-forward.conf
sysctl -p /etc/sysctl.d/99-ip-forward.conf
```

## Troubleshooting

**Private hosts cannot reach the internet**:

```bash
# Check IP forwarding
sysctl net.ipv4.ip_forward

# Check masquerading is enabled
firewall-cmd --zone=external --query-masquerade

# Check routing on the gateway
ip route show

# Verify the private host's gateway is set correctly
# On the private host:
ip route show default
```

**Slow performance**:

```bash
# Check conntrack table usage
conntrack -C
sysctl net.netfilter.nf_conntrack_max

# If count is near max, increase the limit
```

**Port forwarding not working**:

```bash
# Verify the forward rules
firewall-cmd --zone=external --list-forward-ports

# Check that masquerading is on
firewall-cmd --zone=external --query-masquerade

# Verify the internal host is reachable from the gateway
ping 10.0.1.50
```

## Summary

NAT masquerading with firewalld turns a RHEL server into a network gateway. Enable IP forwarding, assign interfaces to zones, enable masquerading on the external zone, and configure internal hosts to use the gateway. Add DHCP and DNS services for a complete gateway setup. For security, restrict outbound access with direct rules and use port forwarding for inbound services. Monitor the conntrack table size for performance and tune it for busy networks.
