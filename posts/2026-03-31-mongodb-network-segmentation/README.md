# How to Implement Network Segmentation for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Security, Network, Firewall, Configuration

Description: Learn how to implement network segmentation for MongoDB deployments using firewall rules, VPCs, and bind IP settings to reduce attack surface.

---

## Why Network Segmentation Matters for MongoDB

MongoDB databases are frequent targets of automated credential-stuffing attacks and unauthorized access when exposed without proper network controls. Network segmentation limits which hosts can communicate with your MongoDB instances, reducing your attack surface even if authentication is misconfigured or credentials are compromised.

Effective segmentation places MongoDB instances in isolated network segments accessible only to application servers and authorized administrators - never directly reachable from the internet.

## Restricting Bind IP in mongod.conf

The simplest first step is binding MongoDB to specific network interfaces rather than all interfaces:

```yaml
net:
  bindIp: 10.0.1.10,127.0.0.1
  port: 27017
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/server.pem
```

This configuration ensures `mongod` only accepts connections on the private subnet interface (10.0.1.10) and localhost. Connections from any other interface are rejected at the socket level before authentication even occurs.

## Linux Firewall Rules with iptables

Enforce access at the OS level in addition to MongoDB's bind configuration:

```bash
# Flush existing INPUT rules (removes ALL existing INPUT rules - use with caution)
iptables -F INPUT

# Allow MongoDB connections only from app server subnet
iptables -A INPUT -p tcp --dport 27017 \
  -s 10.0.1.0/24 -j ACCEPT

# Allow replica set members to communicate
iptables -A INPUT -p tcp --dport 27017 \
  -s 10.0.2.0/24 -j ACCEPT

# Allow admin access from bastion host only
iptables -A INPUT -p tcp --dport 27017 \
  -s 10.0.0.5/32 -j ACCEPT

# Drop all other MongoDB traffic
iptables -A INPUT -p tcp --dport 27017 -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

## AWS VPC Security Group Configuration

For MongoDB on EC2, use Security Groups to enforce network-level access:

```json
{
  "GroupName": "mongodb-sg",
  "Description": "MongoDB instance security group",
  "SecurityGroupRules": [
    {
      "IpProtocol": "tcp",
      "FromPort": 27017,
      "ToPort": 27017,
      "SourceSecurityGroupId": "sg-appserver-id",
      "Description": "Allow app tier access"
    },
    {
      "IpProtocol": "tcp",
      "FromPort": 27017,
      "ToPort": 27017,
      "CidrIp": "10.0.0.5/32",
      "Description": "Bastion host admin access"
    }
  ]
}
```

Place MongoDB instances in private subnets with no route to an internet gateway. Application servers in the app subnet can reach MongoDB, but external internet traffic cannot.

## Replica Set Network Segmentation

For replica sets, each member needs to communicate with other members on port 27017. Use a dedicated replication subnet:

```yaml
# mongod.conf for replica set member
net:
  bindIp: 10.0.2.10,127.0.0.1
  port: 27017

replication:
  replSetName: "rs0"

# In the replica set config, use internal IPs
```

Initialize the replica set using internal IPs:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.0.2.10:27017" },
    { _id: 1, host: "10.0.2.11:27017" },
    { _id: 2, host: "10.0.2.12:27017" }
  ]
})
```

## Sharded Cluster Network Topology

For sharded clusters, maintain separate security groups or subnets for each tier:

```text
Internet
    |
  [ALB/App Load Balancer]  -- Public Subnet
    |
  [App Servers]            -- App Subnet (10.0.1.0/24)
    |
  [mongos routers]         -- Router Subnet (10.0.2.0/24)
    |
  [Config Servers (CSRS)]  -- Config Subnet (10.0.3.0/24)
  [Shard Replica Sets]     -- Data Subnet  (10.0.4.0/24)
```

Each subnet layer should have ingress rules that only allow traffic from the tier directly above it.

## Monitoring Network Access with OneUptime

After implementing segmentation, use OneUptime to monitor MongoDB connectivity from your application tier. A synthetic TCP monitor confirms that your app servers can reach MongoDB while also verifying that unauthorized paths are blocked. Set up alert policies to notify your team immediately if MongoDB becomes unreachable, which can indicate a firewall rule misconfiguration after a deployment.

## Summary

Network segmentation for MongoDB involves binding to specific interfaces, applying OS-level firewall rules, and placing instances in private subnets with strict security group policies. For replica sets and sharded clusters, use dedicated subnets per tier and internal IP addresses for intra-cluster communication. Combine network controls with TLS and strong authentication for a defense-in-depth security posture.
