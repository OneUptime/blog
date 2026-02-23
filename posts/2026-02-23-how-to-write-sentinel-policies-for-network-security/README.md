# How to Write Sentinel Policies for Network Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Network Security, VPC, Security Groups, Firewall

Description: Learn how to write Sentinel policies that enforce network security best practices including VPC configuration, security groups, NACLs, and network segmentation.

---

Network security is the foundation of cloud infrastructure protection. A misconfigured VPC, an overly permissive security group, or a missing network ACL can expose your entire environment to attack. Sentinel policies let you enforce network security standards automatically, catching misconfigurations in the Terraform plan before they are ever applied.

## Core Network Security Concerns

When writing network security policies, you typically need to address:

- Security group rules (ingress and egress)
- Network ACLs
- VPC flow logging
- Subnet configuration
- VPN and peering connections
- Network interface configurations

Let us tackle each of these.

## Security Group Policies

Security groups are the most common source of network security issues. Here is a comprehensive security group policy:

```python
# network-security.sentinel
# Enforces network security standards

import "tfplan/v2" as tfplan

# Ports that must never be open to 0.0.0.0/0
restricted_ports = {
    22:    "SSH",
    3389:  "RDP",
    3306:  "MySQL",
    5432:  "PostgreSQL",
    1433:  "MSSQL",
    6379:  "Redis",
    27017: "MongoDB",
    9200:  "Elasticsearch",
    9300:  "Elasticsearch",
    5601:  "Kibana",
    8080:  "HTTP Alt",
    2379:  "etcd",
    2380:  "etcd",
    6443:  "Kubernetes API",
}

# Get security group rules
sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

# Get inline security groups
security_groups = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check if a port falls within a range
port_in_range = func(port, from_port, to_port) {
    return from_port <= port and port <= to_port
}

# Validate a standalone security group rule
validate_rule = func(rule) {
    cidr = rule.change.after.cidr_blocks
    ipv6_cidr = rule.change.after.ipv6_cidr_blocks

    is_open_ipv4 = cidr is not null and cidr contains "0.0.0.0/0"
    is_open_ipv6 = ipv6_cidr is not null and ipv6_cidr contains "::/0"

    if not (is_open_ipv4 or is_open_ipv6) {
        return true
    }

    from = rule.change.after.from_port
    to = rule.change.after.to_port

    # Block all-traffic rules
    if from is 0 and to is 65535 {
        print(rule.address, "- allows all ports from the internet")
        return false
    }

    if from is -1 and to is -1 {
        print(rule.address, "- allows all traffic from the internet")
        return false
    }

    # Check restricted ports
    valid = true
    for restricted_ports as port, service {
        if port_in_range(port, from, to) {
            print(rule.address, "- port", port, "("+service+")",
                  "must not be open to the internet")
            valid = false
        }
    }

    return valid
}

# Validate inline ingress rules
validate_inline_ingress = func(sg) {
    if sg.change.after.ingress is null {
        return true
    }

    valid = true
    for sg.change.after.ingress as _, ingress {
        cidr = ingress.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = ingress.from_port
            to = ingress.to_port

            if from is 0 and to is 65535 {
                print(sg.address, "- inline rule allows all ports from internet")
                valid = false
            }

            for restricted_ports as port, service {
                if port_in_range(port, from, to) {
                    print(sg.address, "- inline rule exposes", service,
                          "(port", port, ") to internet")
                    valid = false
                }
            }
        }
    }
    return valid
}

standalone_valid = rule {
    all sg_rules as _, r {
        validate_rule(r)
    }
}

inline_valid = rule {
    all security_groups as _, sg {
        validate_inline_ingress(sg)
    }
}

main = rule {
    standalone_valid and inline_valid
}
```

## Egress Restrictions

Most organizations focus on ingress rules, but egress restrictions are also important for preventing data exfiltration:

```python
import "tfplan/v2" as tfplan

# Get egress security group rules
egress_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "egress"
}

# Block unrestricted egress (0.0.0.0/0 on all ports)
# This is a strict policy - many orgs allow open egress
main = rule {
    all egress_rules as address, r {
        cidr = r.change.after.cidr_blocks

        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = r.change.after.from_port
            to = r.change.after.to_port

            # Allow HTTPS egress (port 443) to anywhere
            # Allow DNS egress (port 53) to anywhere
            if (from is 443 and to is 443) or (from is 53 and to is 53) {
                true
            } else if from is 0 and to is 65535 {
                print(address, "- unrestricted egress to 0.0.0.0/0 is not allowed.",
                      "Specify allowed ports.")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}
```

## VPC Flow Logging

Flow logs are essential for network monitoring and incident investigation:

```python
import "tfplan/v2" as tfplan
import "tfstate/v2" as tfstate

# Get VPCs being created
new_vpcs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_vpc" and
    rc.change.actions contains "create"
}

# Get flow logs being created
new_flow_logs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_flow_log" and
    rc.change.actions contains "create"
}

# Check existing flow logs
existing_flow_logs = filter tfstate.resources as _, r {
    r.type is "aws_flow_log"
}

# If new VPCs are being created, flow logs should be created too
main = rule {
    if length(new_vpcs) > 0 {
        length(new_flow_logs) > 0
    } else {
        true
    }
}
```

### Validating Flow Log Configuration

```python
import "tfplan/v2" as tfplan

flow_logs = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_flow_log" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Flow logs must capture all traffic (not just ACCEPT or REJECT)
main = rule {
    all flow_logs as address, log {
        traffic_type = log.change.after.traffic_type
        if traffic_type is not "ALL" {
            print(address, "- flow log must capture ALL traffic, not just", traffic_type)
            false
        } else {
            true
        }
    }
}
```

## Network ACL Policies

Network ACLs provide an additional layer of security at the subnet level:

```python
import "tfplan/v2" as tfplan

# Get NACL rules
nacl_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_network_acl_rule" and
    rc.change.actions contains "create"
}

# Prevent allow-all inbound rules at low rule numbers
validate_nacl = func(rule) {
    # Only check inbound rules
    if rule.change.after.egress is true {
        return true
    }

    cidr = rule.change.after.cidr_block
    protocol = rule.change.after.protocol
    rule_number = rule.change.after.rule_number
    action = rule.change.after.rule_action

    # Block "allow all" rules from anywhere
    if action is "allow" and cidr is "0.0.0.0/0" and protocol is "-1" {
        if rule_number < 100 {
            print(rule.address, "- NACL rule allows all traffic from 0.0.0.0/0",
                  "at high priority (rule", rule_number, ")")
            return false
        }
    }

    return true
}

main = rule {
    all nacl_rules as _, r {
        validate_nacl(r)
    }
}
```

## Subnet Configuration Policies

Ensure subnets are configured securely:

```python
import "tfplan/v2" as tfplan

# Get subnets
subnets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_subnet" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Subnets should not auto-assign public IPs by default
no_auto_public_ip = rule {
    all subnets as address, subnet {
        if subnet.change.after.map_public_ip_on_launch is true {
            # Only allow this for explicitly named public subnets
            tags = subnet.change.after.tags
            if tags is not null and "Name" in tags {
                if tags["Name"] matches ".*public.*" {
                    true  # Public subnet is expected to have public IPs
                } else {
                    print(address, "- non-public subnet should not auto-assign public IPs")
                    false
                }
            } else {
                print(address, "- subnet with auto-assign public IP must be tagged as public")
                false
            }
        } else {
            true
        }
    }
}

main = rule {
    no_auto_public_ip
}
```

## VPN and Peering Restrictions

Control which VPC peering connections and VPN configurations are allowed:

```python
import "tfplan/v2" as tfplan

# Get VPC peering connections
peering_connections = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_vpc_peering_connection" and
    rc.change.actions contains "create"
}

# Only allow peering within the same account or with approved accounts
approved_peer_accounts = [
    "123456789012",
    "234567890123",
]

main = rule {
    all peering_connections as address, peer {
        account = peer.change.after.peer_owner_id
        if account is not null and account not in approved_peer_accounts {
            print(address, "- peering with account", account, "is not approved")
            false
        } else {
            true
        }
    }
}
```

## Comprehensive Network Security Policy

Here is a policy that combines multiple network security checks:

```python
# comprehensive-network-security.sentinel

import "tfplan/v2" as tfplan

# --- Security Group Checks ---
restricted_ports = [22, 3389, 3306, 5432, 6379, 27017]

sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

no_restricted_ports_open = rule {
    all sg_rules as _, r {
        cidr = r.change.after.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = r.change.after.from_port
            to = r.change.after.to_port
            all restricted_ports as port {
                not (from <= port and port <= to)
            }
        } else {
            true
        }
    }
}

# --- Subnet Checks ---
subnets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_subnet" and
    rc.change.actions contains "create"
}

no_default_public_ip = rule {
    all subnets as _, subnet {
        subnet.change.after.map_public_ip_on_launch is not true
    }
}

# --- RDS Checks ---
rds = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_not_public = rule {
    all rds as _, db {
        db.change.after.publicly_accessible is not true
    }
}

# --- Combined ---
main = rule {
    no_restricted_ports_open and
    no_default_public_ip and
    rds_not_public
}
```

Network security policies should be among your highest priority Sentinel implementations. They protect against some of the most common and dangerous cloud misconfigurations. For related security topics, check out our guides on [restricting public access](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-restrict-public-access/view) and [enforcing encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-to-enforce-encryption/view).
