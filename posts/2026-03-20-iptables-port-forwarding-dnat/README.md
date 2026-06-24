# How to Set Up Port Forwarding with iptables DNAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, DNAT, Port Forwarding, NAT, Linux, Networking

Description: Configure iptables DNAT rules to forward incoming connections on one port to a different host or port, enabling port forwarding and reverse proxy scenarios.

DNAT (Destination Network Address Translation) rewrites the destination IP or port of incoming packets, redirecting traffic to a different host. This is how port forwarding works - external port 8080 becomes internal port 80 on a different server.

## How DNAT Works

```text
Without DNAT:
  Internet → Your Server:8080 → (no rule) → connection refused

With DNAT:
  Internet → Your Server:8080 → DNAT → 192.168.1.100:80 → web server responds
```

## Forward a Port to Another Host

```bash
# Enable IP forwarding (required for DNAT to work across hosts)

sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# Forward public port 8080 to internal server 192.168.1.100:80
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 8080 \
  -j DNAT --to-destination 192.168.1.100:80

# Allow the forwarded traffic
sudo iptables -A FORWARD \
  -p tcp -d 192.168.1.100 --dport 80 \
  -m state --state NEW,ESTABLISHED,RELATED \
  -j ACCEPT
sudo iptables -A FORWARD \
  -p tcp -s 192.168.1.100 --sport 80 \
  -m state --state ESTABLISHED,RELATED \
  -j ACCEPT

# No POSTROUTING MASQUERADE rule is needed for ordinary port forwarding.
# Add SNAT or MASQUERADE only for same-LAN hairpin cases.
```

## Forward to Same Server, Different Port

```bash
# Redirect incoming port 80 to port 8080 on the same server
# (useful when app runs on non-privileged port)
sudo iptables -t nat -A PREROUTING \
  -p tcp --dport 80 \
  -j REDIRECT --to-port 8080

# Redirect loopback connections too
sudo iptables -t nat -A OUTPUT \
  -o lo \
  -p tcp --dport 80 \
  -j REDIRECT --to-port 8080
```

## Forward Specific External IP to Internal Host

```bash
# Only forward connections to specific public IP
sudo iptables -t nat -A PREROUTING \
  -d 203.0.113.10 \
  -p tcp --dport 443 \
  -j DNAT --to-destination 192.168.1.50:443

# Allow the forwarding
sudo iptables -A FORWARD \
  -p tcp -d 192.168.1.50 --dport 443 \
  -m state --state NEW,ESTABLISHED,RELATED \
  -j ACCEPT
sudo iptables -A FORWARD \
  -p tcp -s 192.168.1.50 --sport 443 \
  -m state --state ESTABLISHED,RELATED \
  -j ACCEPT
```

## Forward a UDP Port

```bash
# Forward external UDP port 53 to internal DNS server
sudo iptables -t nat -A PREROUTING \
  -p udp --dport 53 \
  -j DNAT --to-destination 192.168.1.10:53

sudo iptables -A FORWARD \
  -p udp -d 192.168.1.10 --dport 53 \
  -m state --state NEW,ESTABLISHED,RELATED \
  -j ACCEPT
sudo iptables -A FORWARD \
  -p udp -s 192.168.1.10 --sport 53 \
  -m state --state ESTABLISHED,RELATED \
  -j ACCEPT
```

## Verify DNAT Rules

```bash
# List NAT rules
sudo iptables -t nat -L PREROUTING -n -v --line-numbers

# Output:
# Chain PREROUTING (policy ACCEPT)
# num  target  prot  source    destination     extra
# 1    DNAT    tcp   0.0.0.0/0 0.0.0.0/0   tcp dpt:8080 to:192.168.1.100:80

# From another host, test the forwarding
curl http://your-server:8080
# Should reach 192.168.1.100:80
```

## Save DNAT Rules

```bash
# Example: save the current ruleset to /etc/iptables/rules.v4
sudo iptables-save -f /etc/iptables/rules.v4

# The saved file will include:
# *nat
# :PREROUTING ACCEPT [0:0]
# -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.100:80
# COMMIT
```

DNAT is the foundation of port forwarding - used in home routers, load balancers, and any Linux gateway that needs to redirect traffic from one port or host to another.
