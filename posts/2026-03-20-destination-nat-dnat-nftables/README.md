# How to Configure Destination NAT (DNAT) with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, DNAT, NAT, Port Forwarding, Networking

Description: Use nftables DNAT rules to redirect incoming traffic on a public IP to an internal server, enabling port forwarding through a Linux firewall.

## Introduction

Destination NAT (DNAT) changes the destination address of incoming packets, routing them to an internal host. This is commonly called port forwarding and is used to expose services (web servers, game servers, etc.) running on private IPs through a public-facing Linux router.

## Prerequisites

- Linux router/gateway with a public interface (e.g., `eth0`) and a private interface (e.g., `eth1`)
- nftables installed
- IP forwarding enabled (`net.ipv4.ip_forward = 1`)

## Enable IP Forwarding

```bash
# Enable immediately and persist

sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-forwarding.conf
```

## Create the Prerouting Chain for DNAT

DNAT rules go in the `prerouting` chain of the `nat` table, which processes packets before routing decisions are made.

```bash
# Create the nat table and prerouting chain
nft add table ip nat
nft add chain ip nat prerouting { type nat hook prerouting priority -100 \; }

# Forward port 80 on the public IP to an internal web server at 192.168.1.10:80
nft add rule ip nat prerouting iifname "eth0" tcp dport 80 dnat to 192.168.1.10

# Forward port 443 to the same internal web server
nft add rule ip nat prerouting iifname "eth0" tcp dport 443 dnat to 192.168.1.10
```

## DNAT to a Different Port

You can redirect traffic to a different port on the destination host.

```bash
# Forward external port 8080 to internal port 80 on 192.168.1.10
nft add rule ip nat prerouting iifname "eth0" tcp dport 8080 dnat to 192.168.1.10:80
```

## Allow Forwarding for DNAT Traffic

```bash
# Create the filter table and forward chain
nft add table inet filter
nft add chain inet filter forward { type filter hook forward priority 0 \; }

# Allow forwarded traffic to the internal server
nft add rule inet filter forward iifname "eth0" oifname "eth1" \
    ip daddr 192.168.1.10 tcp dport { 80, 443 } ct state new,established,related accept
```

## Full DNAT Configuration

```bash
#!/usr/sbin/nft -f

flush ruleset

table ip nat {
    chain prerouting {
        type nat hook prerouting priority -100; policy accept;

        # Forward HTTP and HTTPS to internal web server
        iifname "eth0" tcp dport { 80, 443 } dnat to 192.168.1.10

        # Forward SSH (port 2222 externally) to internal host port 22
        iifname "eth0" tcp dport 2222 dnat to 192.168.1.20:22
    }

    chain postrouting {
        type nat hook postrouting priority 100; policy accept;

        # Optional: masquerade outbound traffic on the public interface
        oifname "eth0" masquerade
    }
}

table inet filter {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow forwarded traffic to internal web server
        iifname "eth0" oifname "eth1" ip daddr 192.168.1.10 \
            tcp dport { 80, 443 } ct state new,established,related accept

        # Allow SSH port forwarding
        iifname "eth0" oifname "eth1" ip daddr 192.168.1.20 \
            tcp dport 22 ct state new,established,related accept

        # Allow established return traffic
        ct state established,related accept
    }
}
```

## Verify DNAT Rules

```bash
# List the NAT table
nft list table ip nat

# Test the port forward from an external host
curl http://<public-ip>
ssh -p 2222 user@<public-ip>
```

## Conclusion

DNAT with nftables gives you fine-grained control over port forwarding. Use the `prerouting` chain at priority `-100` to intercept packets before the routing decision, add matching `forward` chain rules to permit the redirected traffic, and use `postrouting` SNAT or masquerade when you also need outbound source NAT on the public interface.
