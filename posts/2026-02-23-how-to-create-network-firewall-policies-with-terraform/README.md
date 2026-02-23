# How to Create Network Firewall Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS Network Firewall, Security, Networking, VPC, Firewall Policies

Description: Learn how to create and manage AWS Network Firewall policies with Terraform for stateful and stateless traffic inspection and filtering.

---

AWS Network Firewall is a managed service that provides network traffic filtering for your VPCs. It supports stateless and stateful rules, domain name filtering, and intrusion prevention signatures. Unlike security groups and NACLs which operate at the instance and subnet level, Network Firewall provides a centralized point of inspection for all traffic entering, leaving, or crossing your VPC. Terraform allows you to define firewall policies, rule groups, and deployments as code.

## How AWS Network Firewall Works

Network Firewall consists of several components. The firewall itself is deployed in specific subnets. A firewall policy defines the behavior and references rule groups. Stateless rule groups evaluate each packet independently. Stateful rule groups track connection state and can inspect traffic at the application layer. Traffic is routed through the firewall using VPC route tables.

The typical deployment pattern places the firewall in dedicated subnets between your internet gateway and your workload subnets.

## Prerequisites

You need Terraform 1.0 or later, an AWS account with Network Firewall permissions, and a VPC with dedicated subnets for the firewall.

## Setting Up the VPC

Create a VPC with firewall, public, and private subnets:

```hcl
# Configure the AWS provider
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "firewall-vpc" }
}

# Firewall subnets (dedicated to Network Firewall)
resource "aws_subnet" "firewall_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.0.0/28"
  availability_zone = "us-east-1a"

  tags = { Name = "firewall-subnet-a" }
}

resource "aws_subnet" "firewall_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.0.16/28"
  availability_zone = "us-east-1b"

  tags = { Name = "firewall-subnet-b" }
}

# Public subnets
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "public-subnet-a" }
}

# Private subnets
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"

  tags = { Name = "private-subnet-a" }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}
```

## Creating Stateless Rule Groups

Stateless rules evaluate each packet without tracking connection state:

```hcl
# Stateless rule group to handle basic traffic filtering
resource "aws_networkfirewall_rule_group" "stateless_basic" {
  capacity = 100
  name     = "stateless-basic-rules"
  type     = "STATELESS"

  rule_group {
    rules_source {
      stateless_rules_and_custom_actions {

        # Allow established TCP connections (SYN-ACK, ACK)
        stateless_rule {
          priority = 1
          rule_definition {
            actions = ["aws:pass"]
            match_attributes {
              protocols = [6] # TCP

              source {
                address_definition = "0.0.0.0/0"
              }
              destination {
                address_definition = "10.0.0.0/16"
              }
              tcp_flag {
                flags = ["SYN", "ACK"]
              }
            }
          }
        }

        # Drop invalid packets
        stateless_rule {
          priority = 10
          rule_definition {
            actions = ["aws:drop"]
            match_attributes {
              protocols = [6] # TCP

              source {
                address_definition = "0.0.0.0/0"
              }
              destination {
                address_definition = "10.0.0.0/16"
              }
              tcp_flag {
                flags = ["FIN", "SYN", "RST", "PSH", "ACK", "URG"]
                masks = ["FIN", "SYN", "RST", "PSH", "ACK", "URG"]
              }
            }
          }
        }

        # Forward everything else to stateful rules
        stateless_rule {
          priority = 100
          rule_definition {
            actions = ["aws:forward_to_sfe"]
            match_attributes {
              protocols = [6] # TCP
              source {
                address_definition = "0.0.0.0/0"
              }
              destination {
                address_definition = "0.0.0.0/0"
              }
            }
          }
        }
      }
    }
  }

  tags = { Name = "stateless-basic-rules" }
}
```

## Creating Stateful Rule Groups

Stateful rules track connections and can inspect application-layer protocols:

```hcl
# Stateful rule group using 5-tuple format
resource "aws_networkfirewall_rule_group" "stateful_5tuple" {
  capacity = 100
  name     = "stateful-5tuple-rules"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      stateful_rule {
        action = "PASS"
        header {
          destination      = "ANY"
          destination_port = "443"
          direction        = "FORWARD"
          protocol         = "TCP"
          source           = "10.0.0.0/16"
          source_port      = "ANY"
        }
        rule_option {
          keyword  = "sid"
          settings = ["1"]
        }
      }

      stateful_rule {
        action = "PASS"
        header {
          destination      = "ANY"
          destination_port = "80"
          direction        = "FORWARD"
          protocol         = "TCP"
          source           = "10.0.0.0/16"
          source_port      = "ANY"
        }
        rule_option {
          keyword  = "sid"
          settings = ["2"]
        }
      }

      stateful_rule {
        action = "DROP"
        header {
          destination      = "ANY"
          destination_port = "ANY"
          direction        = "FORWARD"
          protocol         = "TCP"
          source           = "10.0.0.0/16"
          source_port      = "ANY"
        }
        rule_option {
          keyword  = "sid"
          settings = ["3"]
        }
      }
    }
  }

  tags = { Name = "stateful-5tuple-rules" }
}
```

## Domain-Based Filtering

Create rules that filter traffic based on domain names:

```hcl
# Stateful rule group for domain filtering
resource "aws_networkfirewall_rule_group" "domain_allow" {
  capacity = 100
  name     = "domain-allowlist"
  type     = "STATEFUL"

  rule_group {
    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = ["10.0.0.0/16"]
        }
      }
    }

    rules_source {
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["HTTP_HOST", "TLS_SNI"]
        targets = [
          ".amazonaws.com",
          ".github.com",
          "registry.npmjs.org",
          "pypi.org",
          ".docker.io",
        ]
      }
    }
  }

  tags = { Name = "domain-allowlist" }
}
```

## Using Suricata-Compatible Rules

For advanced IDS/IPS capabilities, use Suricata-compatible rule strings:

```hcl
# Stateful rule group with Suricata rules
resource "aws_networkfirewall_rule_group" "suricata_rules" {
  capacity = 100
  name     = "suricata-ids-rules"
  type     = "STATEFUL"

  rule_group {
    rules_source {
      rules_string = <<-EOT
        # Block SSH from the internet
        drop tcp any any -> $HOME_NET 22 (msg:"Block inbound SSH"; sid:100001; rev:1;)

        # Alert on DNS queries to suspicious TLDs
        alert dns any any -> any any (msg:"Suspicious DNS query"; dns.query; content:".xyz"; sid:100002; rev:1;)

        # Block outbound connections to known bad ports
        drop tcp $HOME_NET any -> any [4444,5555,6666,7777,8888,9999] (msg:"Block suspicious outbound ports"; sid:100003; rev:1;)
      EOT
    }

    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = ["10.0.0.0/16"]
        }
      }
    }
  }

  tags = { Name = "suricata-ids-rules" }
}
```

## Creating the Firewall Policy

The firewall policy ties rule groups together:

```hcl
# Firewall policy
resource "aws_networkfirewall_firewall_policy" "main" {
  name = "main-firewall-policy"

  firewall_policy {
    # Default action for stateless rules
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    # Stateless rule group references
    stateless_rule_group_reference {
      priority     = 1
      resource_arn = aws_networkfirewall_rule_group.stateless_basic.arn
    }

    # Stateful rule group references
    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.stateful_5tuple.arn
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.domain_allow.arn
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.suricata_rules.arn
    }
  }

  tags = { Name = "main-firewall-policy" }
}
```

## Deploying the Firewall

Create the Network Firewall in the dedicated subnets:

```hcl
# Deploy the Network Firewall
resource "aws_networkfirewall_firewall" "main" {
  name                = "main-network-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.main.arn
  vpc_id              = aws_vpc.main.id

  subnet_mapping {
    subnet_id = aws_subnet.firewall_a.id
  }

  subnet_mapping {
    subnet_id = aws_subnet.firewall_b.id
  }

  tags = { Name = "main-network-firewall" }
}
```

## Enabling Firewall Logging

Configure logging to CloudWatch and S3:

```hcl
# CloudWatch log group for firewall alerts
resource "aws_cloudwatch_log_group" "firewall_alerts" {
  name              = "/aws/network-firewall/alerts"
  retention_in_days = 30
}

# S3 bucket for flow logs
resource "aws_s3_bucket" "firewall_logs" {
  bucket = "my-network-firewall-logs"
}

# Firewall logging configuration
resource "aws_networkfirewall_logging_configuration" "main" {
  firewall_arn = aws_networkfirewall_firewall.main.arn

  logging_configuration {
    # Alert logs to CloudWatch
    log_destination_config {
      log_destination = {
        logGroup = aws_cloudwatch_log_group.firewall_alerts.name
      }
      log_destination_type = "CloudWatchLogs"
      log_type             = "ALERT"
    }

    # Flow logs to S3
    log_destination_config {
      log_destination = {
        bucketName = aws_s3_bucket.firewall_logs.bucket
        prefix     = "flow-logs"
      }
      log_destination_type = "S3"
      log_type             = "FLOW"
    }
  }
}
```

## Monitoring Firewall Policies

Monitor your network firewall for blocked traffic and rule hits. Use [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-network-firewall-policies-with-terraform/view) to track firewall health and set up alerts for unusual traffic patterns or policy violations.

## Best Practices

Use dedicated subnets for the firewall with minimal CIDR ranges. Forward all stateless traffic to the stateful engine unless you have specific performance requirements. Use domain allowlists rather than blocklists for outbound traffic. Enable both alert and flow logging. Regularly review and update Suricata rules. Test firewall policies in a staging environment before deploying to production.

## Conclusion

AWS Network Firewall with Terraform provides centralized, scalable traffic inspection for your VPCs. By defining stateless rules, stateful rules, domain filters, and IDS/IPS signatures as code, you maintain full visibility and control over your network security posture. Terraform ensures these policies are version-controlled, testable, and consistently deployed across environments.
