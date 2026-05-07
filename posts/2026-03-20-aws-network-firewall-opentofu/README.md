# How to Set Up AWS Network Firewall with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Network Firewall, Security, Networking, Infrastructure as Code, Stateful Inspection

Description: Learn how to deploy AWS Network Firewall with stateful and stateless rules using OpenTofu to provide deep packet inspection and traffic filtering for your VPCs.

## Introduction

AWS Network Firewall is a managed stateful firewall service that provides fine-grained control over VPC traffic. It supports stateless and stateful rules, domain-based filtering, and Suricata-compatible IPS rules. This guide covers deploying a complete Network Firewall setup.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with Network Firewall permissions
- A VPC with dedicated firewall subnets

## Step 1: Create a Stateless Rule Group

```hcl
# Stateless rule group for fast-path traffic decisions

resource "aws_networkfirewall_rule_group" "stateless" {
  capacity = 100
  name     = "stateless-rules"
  type     = "STATELESS"

  rule_group {
    rules_source {
      stateless_rules_and_custom_actions {
        stateless_rule {
          priority = 1
          rule_definition {
            actions = ["aws:forward_to_sfe"]  # Forward to stateful engine
            match_attributes {
              protocols = [6]  # TCP
              destination_port {
                from_port = 443
                to_port   = 443
              }
            }
          }
        }

        stateless_rule {
          priority = 100
          rule_definition {
            actions = ["aws:drop"]  # Drop everything else
            match_attributes {}
          }
        }
      }
    }
  }

  tags = { Name = "stateless-rules" }
}
```

## Step 2: Create a Stateful Rule Group

```hcl
# Stateful domain-based filtering rule group
resource "aws_networkfirewall_rule_group" "stateful_domain" {
  capacity = 100
  name     = "domain-allow-list"
  type     = "STATEFUL"

  rule_group {
    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = ["10.0.0.0/8"]
        }
      }
    }

    rules_source {
      # Allow only specific domains for egress traffic
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["HTTP_HOST", "TLS_SNI"]
        targets = [
          ".amazonaws.com",
          ".github.com",
          ".docker.io",
        ]
      }
    }
  }

  tags = { Name = "domain-allow-list" }
}
```

## Step 3: Create the Firewall Policy

```hcl
# Firewall policy combining stateless and stateful rule groups
resource "aws_networkfirewall_firewall_policy" "main" {
  name = "main-firewall-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:drop"]

    stateless_rule_group_reference {
      priority     = 1
      resource_arn = aws_networkfirewall_rule_group.stateless.arn
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.stateful_domain.arn
    }
  }

  tags = { Name = "main-firewall-policy" }
}
```

## Step 4: Deploy the Firewall

```hcl
# Deploy the firewall into dedicated subnets (one per AZ)
resource "aws_networkfirewall_firewall" "main" {
  name                = "main-network-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.main.arn
  vpc_id              = var.vpc_id

  dynamic "subnet_mapping" {
    for_each = var.firewall_subnet_ids
    content {
      subnet_id = subnet_mapping.value
    }
  }

  tags = { Name = "main-network-firewall" }
}
```

## Step 5: Configure Logging

```hcl
# Send firewall logs to CloudWatch for analysis
resource "aws_cloudwatch_log_group" "firewall" {
  name = "/aws/network-firewall/flow"
}

resource "aws_cloudwatch_log_group" "firewall_alerts" {
  name = "/aws/network-firewall/alert"
}

resource "aws_networkfirewall_logging_configuration" "main" {
  firewall_arn = aws_networkfirewall_firewall.main.arn

  logging_configuration {
    log_destination_config {
      log_destination_type = "CloudWatchLogs"
      log_type             = "FLOW"
      log_destination = {
        logGroup = aws_cloudwatch_log_group.firewall.name
      }
    }

    log_destination_config {
      log_destination_type = "CloudWatchLogs"
      log_type             = "ALERT"
      log_destination = {
        logGroup = aws_cloudwatch_log_group.firewall_alerts.name
      }
    }
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

You have deployed AWS Network Firewall with stateless rules for fast-path processing and stateful domain allowlisting for egress control. Route your VPC traffic through the firewall endpoints by updating your VPC route tables, including VPC ingress routing where applicable, to enforce inspection on the traffic flows you want to inspect.
