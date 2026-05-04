# How to Create Custom Routing Tables on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Routing, Policy Routing, iproute2, Networking, Ip rule

Description: Create custom routing tables on Linux using iproute2 to implement policy-based routing, enabling different traffic flows to use different routes based on source IP, marks, or interfaces.

## Introduction

Linux supports multiple routing tables (numbered 1–252, plus reserved tables `local` (255), `main` (254), `default` (253), and `unspec` (0); modern kernels also support 32-bit table IDs). Custom routing tables allow policy-based routing - different packets can use different routing tables based on rules. This is essential for multi-homing, VPN split tunneling, and traffic engineering.

## Register a Custom Table Name (Optional)

Table names are defined in `/etc/iproute2/rt_tables`:

```bash
# Add a custom table name (append to the file)

echo "100 vpn" >> /etc/iproute2/rt_tables
echo "200 isp2" >> /etc/iproute2/rt_tables

# Verify registration
cat /etc/iproute2/rt_tables
```

## Add Routes to a Custom Table

```bash
# Add a default route to table 100 (named 'vpn') via ISP 2 gateway
ip route add default via 10.0.1.1 dev eth1 table 100

# Add a specific route to table 100
ip route add 192.168.50.0/24 via 10.0.1.1 dev eth1 table 100

# Using the table number directly (no name required)
ip route add default via 10.0.2.1 dev eth2 table 200
```

## Add Rules to Select the Custom Table

```bash
# Route traffic from 192.168.1.0/24 via table 100
ip rule add from 192.168.1.0/24 table 100

# Route traffic from 192.168.2.0/24 via table 200
ip rule add from 192.168.2.0/24 table 200

# Route traffic marked with fwmark 1 via table 100
ip rule add fwmark 1 table 100

# View all rules
ip rule list
```

## Full Multi-Homing Example

Two ISPs: ISP1 via eth0 (10.0.0.1/24), ISP2 via eth1 (10.0.1.1/24):

```bash
# Register table names
echo "100 isp1" >> /etc/iproute2/rt_tables
echo "200 isp2" >> /etc/iproute2/rt_tables

# Routes for ISP1 table
ip route add 10.0.0.0/24 dev eth0 src 10.0.0.100 table isp1
ip route add default via 10.0.0.1 table isp1

# Routes for ISP2 table
ip route add 10.0.1.0/24 dev eth1 src 10.0.1.100 table isp2
ip route add default via 10.0.1.1 table isp2

# Rules: reply traffic from each ISP uses correct table
ip rule add from 10.0.0.100 table isp1
ip rule add from 10.0.1.100 table isp2
```

## List Routes in a Specific Table

```bash
# Show all routes in table 100
ip route show table 100

# Show routes in the main table (default)
ip route show table main

# Show all routes in all tables
ip route show table all
```

## Delete a Route from a Custom Table

```bash
ip route del default table 100
```

## Conclusion

Custom routing tables enable policy-based routing on Linux, allowing traffic to be steered based on source address, firewall marks, or incoming interface. Register table names in `/etc/iproute2/rt_tables`, add routes with `ip route add ... table <name>`, and attach policies with `ip rule add`.
