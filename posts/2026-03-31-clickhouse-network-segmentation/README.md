# How to Implement Network Segmentation for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Segmentation, Security, Firewall, VPC

Description: Implement network segmentation for ClickHouse to isolate your database cluster from the public internet and restrict access to only authorized services and users.

---

Network segmentation for ClickHouse means placing your cluster in an isolated network segment accessible only by authorized services and administrators. This reduces blast radius if another system is compromised and prevents direct public exposure of your database ports.

## Design Principles

A well-segmented ClickHouse deployment follows these principles:
- ClickHouse nodes are in a private subnet with no public IP addresses
- Only an application subnet and a bastion host can reach ClickHouse ports
- Interserver replication traffic is restricted to the ClickHouse subnet
- Monitoring and backup agents connect from a dedicated management subnet

## VPC/Network Design

```text
Public Subnet (10.0.0.0/24)
  - Load Balancer (application traffic only)
  - Bastion Host (SSH access for admins)

Application Subnet (10.0.1.0/24)
  - API servers
  - ETL workers

ClickHouse Subnet (10.0.2.0/24)
  - ClickHouse node 1 (10.0.2.10)
  - ClickHouse node 2 (10.0.2.11)
  - ClickHouse node 3 (10.0.2.12)

Management Subnet (10.0.3.0/24)
  - Monitoring server
  - Backup agent
  - Grafana
```

## Firewall Rules for ClickHouse Nodes

```bash
#!/bin/bash
# Apply to each ClickHouse node

# Default deny all inbound
ufw default deny incoming
ufw default allow outgoing

# Allow SSH only from bastion
ufw allow from 10.0.0.100 to any port 22

# Allow ClickHouse native TLS from application subnet
ufw allow from 10.0.1.0/24 to any port 9440

# Allow ClickHouse HTTPS from application subnet
ufw allow from 10.0.1.0/24 to any port 8443

# Allow interserver replication within ClickHouse subnet only
ufw allow from 10.0.2.0/24 to any port 9009
ufw allow from 10.0.2.0/24 to any port 9010
ufw allow from 10.0.2.0/24 to any port 9440

# Allow monitoring from management subnet
ufw allow from 10.0.3.0/24 to any port 9363  # Prometheus metrics
ufw allow from 10.0.3.0/24 to any port 8443

ufw enable
```

## AWS Security Group Configuration

For AWS deployments, use security groups:

```json
{
  "SecurityGroupRules": [
    {
      "Description": "ClickHouse native TLS from app",
      "IpProtocol": "tcp",
      "FromPort": 9440,
      "ToPort": 9440,
      "SourceSecurityGroupId": "sg-app-servers"
    },
    {
      "Description": "Interserver replication",
      "IpProtocol": "tcp",
      "FromPort": 9009,
      "ToPort": 9010,
      "SourceSecurityGroupId": "sg-clickhouse-nodes"
    },
    {
      "Description": "Monitoring",
      "IpProtocol": "tcp",
      "FromPort": 9363,
      "ToPort": 9363,
      "SourceSecurityGroupId": "sg-monitoring"
    }
  ]
}
```

## ClickHouse Listen Address Restriction

Configure ClickHouse to only listen on the private interface:

```xml
<listen_host>10.0.2.10</listen_host>  <!-- Only the private IP -->
<interserver_http_host>10.0.2.10</interserver_http_host>
```

## Testing Network Segmentation

From the application server, verify connectivity:

```bash
# Should succeed
nc -zv 10.0.2.10 9440

# Should fail (not in allowed range)
nc -zv 10.0.2.10 9000  # plain TCP should be blocked
```

From a public IP, all connections should be blocked:

```bash
# Should timeout/refuse
curl https://10.0.2.10:8443/  # No route from public internet
```

## Monitoring for Unauthorized Access Attempts

```sql
SELECT
    address,
    user,
    count() AS failed_attempts
FROM system.query_log
WHERE exception LIKE '%Authentication failed%'
    OR exception LIKE '%IP address%'
GROUP BY address, user
ORDER BY failed_attempts DESC
LIMIT 20;
```

Unexpected source IPs in this query may indicate a network segmentation bypass.

## Summary

Network segmentation for ClickHouse places your cluster in a private subnet accessible only from authorized application, management, and replication subnets. Combine VPC-level routing, security groups or firewall rules, and ClickHouse's own `listen_host` binding to create defense in depth. Regularly audit connection sources in `system.query_log` to detect and investigate unexpected access patterns.
