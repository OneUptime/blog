# How to Restrict Database Operations by IP in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, IP, Network, Access Control

Description: Learn how to restrict MongoDB access by IP address using bindIp, firewall rules, and Atlas IP allowlists to limit which hosts can connect to your database.

---

## Overview

Restricting MongoDB access by IP address is one of the most effective security controls you can apply. Even with authentication enabled, limiting which IP addresses can reach port 27017 significantly reduces the attack surface. MongoDB provides both server-level binding controls and supports network-level firewall integration.

## Method 1: bindIp in mongod.conf

The `net.bindIp` setting controls which network interfaces MongoDB listens on. By default (MongoDB 3.6+), it binds to localhost only.

```yaml
# /etc/mongod.conf
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.5
```

This configuration makes MongoDB listen on localhost and the private IP `10.0.1.5` only. External hosts cannot reach MongoDB at all - they receive a connection refused error.

To listen on all interfaces (needed for multi-host setups) but rely on the firewall for IP restrictions:

```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # Listen on all interfaces - use firewall to restrict
```

## Method 2: iptables Firewall Rules

Allow only specific application server IPs to connect to port 27017:

```bash
# Allow access from application server IPs
sudo iptables -A INPUT -p tcp -s 10.0.1.10 --dport 27017 -j ACCEPT
sudo iptables -A INPUT -p tcp -s 10.0.1.11 --dport 27017 -j ACCEPT

# Block all other access to port 27017
sudo iptables -A INPUT -p tcp --dport 27017 -j DROP

# Save rules permanently
sudo iptables-save > /etc/iptables/rules.v4
```

## Method 3: ufw (Ubuntu)

```bash
# Allow MongoDB from specific app servers
sudo ufw allow from 10.0.1.10 to any port 27017
sudo ufw allow from 10.0.1.11 to any port 27017

# Default deny (if not already set)
sudo ufw default deny incoming

# Apply rules
sudo ufw enable
```

## Method 4: Security Groups (AWS / Cloud)

In cloud environments, use security groups to restrict access:

```json
{
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 27017,
      "ToPort": 27017,
      "IpRanges": [
        { "CidrIp": "10.0.1.10/32", "Description": "App server 1" },
        { "CidrIp": "10.0.1.11/32", "Description": "App server 2" }
      ]
    }
  ]
}
```

Apply with the AWS CLI:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --ip-permissions file://mongodb-rules.json
```

## Method 5: MongoDB Atlas IP Allowlist

For MongoDB Atlas, configure the IP allowlist in the console or via the Atlas API:

```bash
# Add an IP to the Atlas allowlist
atlas accessLists create 203.0.113.45 \
  --projectId <project-id> \
  --type ipAddress \
  --comment "Office IP"

# Allow a CIDR range
atlas accessLists create 10.0.0.0/8 \
  --projectId <project-id> \
  --type cidrBlock \
  --comment "Private network"
```

## Verifying Access Control

```bash
# Test from an allowed IP
mongosh --host 10.0.1.5:27017 --authenticationDatabase admin -u admin -p

# Test from a blocked IP (should timeout or be refused)
mongosh --host 10.0.1.5:27017
```

## Combining bindIp with Authentication

IP restrictions alone are not sufficient - always enable MongoDB authentication as well:

```yaml
# mongod.conf
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.1.5

security:
  authorization: enabled
```

IP restrictions prevent unauthorized hosts from connecting at all. Authentication ensures that even if an attacker is on an allowed network, they need valid credentials to query data.

## Summary

Restricting MongoDB by IP address works at two levels: server-level binding with `bindIp` prevents MongoDB from accepting connections on untrusted interfaces, and network-level firewall rules drop packets from untrusted sources. Use both layers together. In cloud environments, use security groups or Atlas IP allowlists. Always combine IP restrictions with `security.authorization: enabled` - network controls and authentication are complementary, not alternatives.
