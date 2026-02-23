# How to Build a Hybrid Cloud Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infrastructure Patterns, Hybrid Cloud, VPN, Direct Connect, Multi-Cloud

Description: Learn how to build a hybrid cloud architecture with Terraform connecting on-premises infrastructure to AWS with VPN, Direct Connect, DNS, and unified monitoring.

---

Not everything can move to the cloud overnight. Legacy systems, data sovereignty requirements, specialized hardware, and regulatory constraints mean many organizations need to operate in both on-premises and cloud environments simultaneously. A hybrid cloud architecture bridges these two worlds, and Terraform is uniquely suited to manage it because it can provision resources in both environments with the same workflow.

## Why Terraform for Hybrid Cloud?

Terraform's provider model is its secret weapon for hybrid cloud. You can use the AWS provider for cloud resources, the VMware provider for on-premises VMs, and the Active Directory provider for identity management - all in the same configuration. This gives you a single source of truth for your entire infrastructure, regardless of where it runs.

## Architecture Overview

Our hybrid cloud setup includes:

- Site-to-site VPN for secure connectivity
- AWS Direct Connect for high-bandwidth links
- Transit Gateway for centralized routing
- Route53 for hybrid DNS resolution
- Shared Active Directory
- Unified monitoring
- Data replication between environments

## Site-to-Site VPN

Start with a VPN connection for immediate connectivity. You can add Direct Connect later for production traffic.

```hcl
# Virtual Private Gateway on AWS side
resource "aws_vpn_gateway" "main" {
  vpc_id          = aws_vpc.main.id
  amazon_side_asn = 64512

  tags = {
    Name        = "hybrid-vpn-gateway"
    Environment = var.environment
  }
}

# Customer Gateway - represents your on-premises VPN device
resource "aws_customer_gateway" "onprem" {
  bgp_asn    = 65000
  ip_address = var.onprem_vpn_ip
  type       = "ipsec.1"

  tags = {
    Name = "on-premises-gateway"
  }
}

# VPN connection with redundant tunnels
resource "aws_vpn_connection" "main" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"
  static_routes_only  = false

  tunnel1_inside_cidr   = "169.254.10.0/30"
  tunnel1_preshared_key = var.tunnel1_psk

  tunnel2_inside_cidr   = "169.254.10.4/30"
  tunnel2_preshared_key = var.tunnel2_psk

  tags = {
    Name = "onprem-to-aws-vpn"
  }
}

# Enable route propagation
resource "aws_vpn_gateway_route_propagation" "main" {
  vpn_gateway_id = aws_vpn_gateway.main.id
  route_table_id = aws_route_table.private.id
}
```

## Transit Gateway for Centralized Routing

When you have multiple VPCs and on-premises sites, Transit Gateway simplifies routing.

```hcl
# Transit Gateway
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Hybrid cloud transit gateway"
  amazon_side_asn                 = 64512
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"

  tags = {
    Name = "hybrid-transit-gateway"
  }
}

# Attach VPCs to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "app_vpc" {
  subnet_ids         = var.app_private_subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.app.id

  dns_support = "enable"

  tags = {
    Name = "app-vpc-attachment"
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "data_vpc" {
  subnet_ids         = var.data_private_subnet_ids
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.data.id

  dns_support = "enable"

  tags = {
    Name = "data-vpc-attachment"
  }
}

# Attach VPN to Transit Gateway
resource "aws_vpn_connection" "tgw" {
  customer_gateway_id = aws_customer_gateway.onprem.id
  transit_gateway_id  = aws_ec2_transit_gateway.main.id
  type                = "ipsec.1"
  static_routes_only  = false

  tags = {
    Name = "onprem-tgw-vpn"
  }
}

# Route tables for Transit Gateway
resource "aws_ec2_transit_gateway_route_table" "cloud" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "cloud-route-table"
  }
}

resource "aws_ec2_transit_gateway_route_table" "onprem" {
  transit_gateway_id = aws_ec2_transit_gateway.main.id

  tags = {
    Name = "onprem-route-table"
  }
}
```

## Direct Connect for Production Traffic

For production workloads, Direct Connect provides dedicated bandwidth.

```hcl
# Direct Connect gateway
resource "aws_dx_gateway" "main" {
  name            = "hybrid-dx-gateway"
  amazon_side_asn = 64512
}

# Direct Connect gateway association with Transit Gateway
resource "aws_dx_gateway_association" "tgw" {
  dx_gateway_id         = aws_dx_gateway.main.id
  associated_gateway_id = aws_ec2_transit_gateway.main.id

  allowed_prefixes = [
    "10.0.0.0/8",
    "172.16.0.0/12",
  ]
}

# Virtual interface on the Direct Connect connection
resource "aws_dx_private_virtual_interface" "main" {
  connection_id  = var.dx_connection_id
  name           = "hybrid-private-vif"
  vlan           = 100
  address_family = "ipv4"
  bgp_asn        = 65000
  dx_gateway_id  = aws_dx_gateway.main.id

  tags = {
    Name = "onprem-dx-vif"
  }
}
```

## Hybrid DNS

DNS resolution needs to work in both directions - cloud resources resolving on-premises names and vice versa.

```hcl
# Route53 private hosted zone for cloud resources
resource "aws_route53_zone" "cloud_private" {
  name = "cloud.company.internal"

  vpc {
    vpc_id = aws_vpc.app.id
  }

  vpc {
    vpc_id = aws_vpc.data.id
  }
}

# Route53 Resolver inbound endpoint - allows on-premises to resolve cloud DNS
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "onprem-to-cloud-dns"
  direction = "INBOUND"

  security_group_ids = [aws_security_group.dns_resolver.id]

  ip_address {
    subnet_id = var.dns_subnet_a_id
    ip        = "10.0.1.10"
  }

  ip_address {
    subnet_id = var.dns_subnet_b_id
    ip        = "10.0.2.10"
  }

  tags = {
    Name = "inbound-dns-resolver"
  }
}

# Route53 Resolver outbound endpoint - allows cloud to resolve on-premises DNS
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "cloud-to-onprem-dns"
  direction = "OUTBOUND"

  security_group_ids = [aws_security_group.dns_resolver.id]

  ip_address {
    subnet_id = var.dns_subnet_a_id
  }

  ip_address {
    subnet_id = var.dns_subnet_b_id
  }

  tags = {
    Name = "outbound-dns-resolver"
  }
}

# Forward on-premises domains to on-premises DNS servers
resource "aws_route53_resolver_rule" "onprem_forward" {
  domain_name          = "onprem.company.internal"
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  target_ip {
    ip   = var.onprem_dns_server_1
    port = 53
  }

  target_ip {
    ip   = var.onprem_dns_server_2
    port = 53
  }

  tags = {
    Name = "forward-to-onprem-dns"
  }
}

resource "aws_route53_resolver_rule_association" "onprem_forward" {
  resolver_rule_id = aws_route53_resolver_rule.onprem_forward.id
  vpc_id           = aws_vpc.app.id
}
```

## Data Replication

Keep data synchronized between on-premises and cloud.

```hcl
# S3 bucket for hybrid data staging
resource "aws_s3_bucket" "hybrid_data" {
  bucket = "company-hybrid-data-${var.environment}"

  tags = {
    Purpose = "hybrid-data-sync"
  }
}

# DataSync for file-level synchronization
resource "aws_datasync_location_s3" "cloud" {
  s3_bucket_arn = aws_s3_bucket.hybrid_data.arn
  subdirectory  = "/synced-data"

  s3_config {
    bucket_access_role_arn = aws_iam_role.datasync.arn
  }
}

# DataSync task for scheduled synchronization
resource "aws_datasync_task" "onprem_to_cloud" {
  name                     = "onprem-to-cloud-sync"
  source_location_arn      = var.datasync_onprem_location_arn
  destination_location_arn = aws_datasync_location_s3.cloud.arn

  schedule {
    schedule_expression = "cron(0 */6 * * ? *)"  # Every 6 hours
  }

  options {
    verify_mode       = "POINT_IN_TIME_CONSISTENT"
    overwrite_mode    = "ALWAYS"
    transfer_mode     = "CHANGED"
    preserve_deleted_files = "PRESERVE"
    log_level         = "TRANSFER"
  }

  tags = {
    Purpose = "hybrid-data-sync"
  }
}

# Database replication with DMS
resource "aws_dms_replication_instance" "hybrid" {
  replication_instance_class = "dms.r5.large"
  replication_instance_id    = "hybrid-replication"
  allocated_storage          = 100
  multi_az                   = true
  vpc_security_group_ids     = [aws_security_group.dms.id]
  replication_subnet_group_id = aws_dms_replication_subnet_group.hybrid.id

  tags = {
    Purpose = "hybrid-db-replication"
  }
}
```

## Monitoring Across Environments

Unified monitoring across cloud and on-premises is critical.

```hcl
# CloudWatch agent configuration for on-premises servers
# (installed via Systems Manager or manual deployment)
resource "aws_ssm_parameter" "cloudwatch_config" {
  name = "/cloudwatch-agent/config"
  type = "String"

  value = jsonencode({
    agent = {
      metrics_collection_interval = 60
    }
    metrics = {
      namespace = "Hybrid/OnPremises"
      metrics_collected = {
        cpu = {
          measurement = ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"]
          totalcpu    = true
        }
        mem = {
          measurement = ["mem_used_percent"]
        }
        disk = {
          measurement = ["used_percent"]
          resources   = ["*"]
        }
      }
    }
    logs = {
      logs_collected = {
        files = {
          collect_list = [{
            file_path        = "/var/log/syslog"
            log_group_name   = "/hybrid/onprem/syslog"
            retention_in_days = 30
          }]
        }
      }
    }
  })
}

# VPN tunnel status monitoring
resource "aws_cloudwatch_metric_alarm" "vpn_tunnel_down" {
  alarm_name          = "vpn-tunnel-down"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TunnelState"
  namespace           = "AWS/VPN"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.hybrid_alerts.arn]

  dimensions = {
    VpnId = aws_vpn_connection.main.id
  }
}

resource "aws_sns_topic" "hybrid_alerts" {
  name = "hybrid-infrastructure-alerts"
}
```

## Wrapping Up

Hybrid cloud architecture requires careful coordination between on-premises and cloud environments. VPN and Direct Connect provide the connectivity. Transit Gateway centralizes routing. Hybrid DNS ensures name resolution works in both directions. And unified monitoring gives you visibility across the entire infrastructure.

Terraform is the natural choice for this because it can manage resources in both environments. Your on-premises VMware VMs, your AWS instances, your DNS records, and your VPN tunnels all live in the same Terraform state, reviewed in the same pull requests.

For monitoring your hybrid cloud infrastructure with unified dashboards spanning both on-premises and cloud resources, check out [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-hybrid-cloud-architecture-with-terraform/view) for hybrid infrastructure observability.
