# How to Create Private Endpoints Across Cloud Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Private Endpoint, AWS, Azure, GCP, Multi-Cloud, Networking, Infrastructure as Code

Description: Learn how to create private endpoints across AWS, Azure, and GCP using Terraform for secure access to cloud services without public internet exposure.

---

Private endpoints let you access cloud services like databases, storage, and APIs through your private network instead of the public internet. This eliminates exposure to the public internet, reduces latency, and satisfies compliance requirements. Every major cloud provider has their own implementation: AWS has VPC Endpoints, Azure has Private Endpoints, and GCP has Private Service Connect.

In this guide, we will create private endpoints across all three cloud providers using Terraform, showing the patterns and differences for each.

## Why Private Endpoints Matter

When you access an S3 bucket or an Azure SQL database, the traffic normally goes over the public internet. With a private endpoint, that traffic stays entirely within the cloud provider's network. The benefits are:

- No data exposure on the public internet
- Lower and more consistent latency
- Reduced data transfer costs (no NAT Gateway charges for AWS)
- Compliance with regulations requiring private network access

## AWS VPC Endpoints

AWS has two types of VPC endpoints: Gateway endpoints (for S3 and DynamoDB) and Interface endpoints (for everything else).

### Gateway Endpoints

Gateway endpoints are free and work by adding routes to your route tables.

```hcl
# aws-gateway-endpoints.tf - S3 and DynamoDB gateway endpoints
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  vpc_endpoint_type = "Gateway"

  # Associate with private route tables
  route_table_ids = var.private_route_table_ids

  # Policy to restrict which S3 buckets can be accessed
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSpecificBuckets"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          "arn:aws:s3:::${var.project_name}-*",
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-s3-endpoint"
    Service = "S3"
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"

  vpc_endpoint_type = "Gateway"

  route_table_ids = var.private_route_table_ids

  tags = {
    Name    = "${var.project_name}-dynamodb-endpoint"
    Service = "DynamoDB"
  }
}
```

### Interface Endpoints

Interface endpoints create ENIs in your subnets with private IP addresses.

```hcl
# aws-interface-endpoints.tf - Interface endpoints for various services
# Security group for interface endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  tags = {
    Name = "${var.project_name}-vpc-endpoints-sg"
  }
}

# Common interface endpoints
locals {
  interface_endpoints = {
    ecr_api = {
      service_name = "com.amazonaws.${var.aws_region}.ecr.api"
      description  = "ECR API"
    }
    ecr_dkr = {
      service_name = "com.amazonaws.${var.aws_region}.ecr.dkr"
      description  = "ECR Docker"
    }
    logs = {
      service_name = "com.amazonaws.${var.aws_region}.logs"
      description  = "CloudWatch Logs"
    }
    monitoring = {
      service_name = "com.amazonaws.${var.aws_region}.monitoring"
      description  = "CloudWatch Monitoring"
    }
    secretsmanager = {
      service_name = "com.amazonaws.${var.aws_region}.secretsmanager"
      description  = "Secrets Manager"
    }
    ssm = {
      service_name = "com.amazonaws.${var.aws_region}.ssm"
      description  = "Systems Manager"
    }
    sqs = {
      service_name = "com.amazonaws.${var.aws_region}.sqs"
      description  = "SQS"
    }
    sns = {
      service_name = "com.amazonaws.${var.aws_region}.sns"
      description  = "SNS"
    }
    kms = {
      service_name = "com.amazonaws.${var.aws_region}.kms"
      description  = "KMS"
    }
    sts = {
      service_name = "com.amazonaws.${var.aws_region}.sts"
      description  = "STS"
    }
    execute_api = {
      service_name = "com.amazonaws.${var.aws_region}.execute-api"
      description  = "API Gateway"
    }
    rds = {
      service_name = "com.amazonaws.${var.aws_region}.rds"
      description  = "RDS API"
    }
  }
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id            = aws_vpc.main.id
  service_name      = each.value.service_name
  vpc_endpoint_type = "Interface"

  # Deploy ENIs in private subnets
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [aws_security_group.vpc_endpoints.id]

  # Enable private DNS so you can use the default service endpoints
  private_dns_enabled = true

  tags = {
    Name    = "${var.project_name}-${each.key}-endpoint"
    Service = each.value.description
  }
}
```

## Azure Private Endpoints

Azure Private Endpoints work differently. Each endpoint creates a private IP in your subnet that maps to a specific Azure resource.

```hcl
# azure-private-endpoints.tf - Azure Private Endpoints

# Private DNS zone for Azure SQL
resource "azurerm_private_dns_zone" "sql" {
  name                = "privatelink.database.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

# Link the DNS zone to the VNet
resource "azurerm_private_dns_zone_virtual_network_link" "sql" {
  name                  = "sql-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.sql.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# Private endpoint for Azure SQL
resource "azurerm_private_endpoint" "sql" {
  name                = "${var.project_name}-sql-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "sql-private-connection"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "sql-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.sql.id]
  }

  tags = {
    Service = "AzureSQL"
  }
}

# Private DNS zone for Storage
resource "azurerm_private_dns_zone" "storage_blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "storage_blob" {
  name                  = "storage-blob-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.storage_blob.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

# Private endpoint for Azure Blob Storage
resource "azurerm_private_endpoint" "storage" {
  name                = "${var.project_name}-storage-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "storage-private-connection"
    private_connection_resource_id = azurerm_storage_account.main.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "storage-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.storage_blob.id]
  }

  tags = {
    Service = "BlobStorage"
  }
}

# Private endpoint for Azure Key Vault
resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault" {
  name                  = "keyvault-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.keyvault.name
  virtual_network_id    = azurerm_virtual_network.main.id
}

resource "azurerm_private_endpoint" "keyvault" {
  name                = "${var.project_name}-kv-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "keyvault-private-connection"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "keyvault-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.keyvault.id]
  }
}
```

## GCP Private Service Connect

Google Cloud uses Private Service Connect for accessing Google APIs and services privately.

```hcl
# gcp-private-service-connect.tf - GCP Private Service Connect

# Reserve an internal IP for the private endpoint
resource "google_compute_global_address" "private_service_connect" {
  name          = "${var.project_name}-psc-address"
  purpose       = "PRIVATE_SERVICE_CONNECT"
  address_type  = "INTERNAL"
  network       = google_compute_network.main.id
  address       = "10.0.100.1"
  prefix_length = 32
}

# Private Service Connect forwarding rule for Google APIs
resource "google_compute_global_forwarding_rule" "private_service_connect" {
  name                  = "${var.project_name}-psc-apis"
  target                = "all-apis"
  network               = google_compute_network.main.id
  ip_address            = google_compute_global_address.private_service_connect.id
  load_balancing_scheme = ""
}

# Private DNS zone for googleapis.com
resource "google_dns_managed_zone" "googleapis" {
  name        = "googleapis-private"
  dns_name    = "googleapis.com."
  description = "Private DNS zone for Google APIs"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.main.id
    }
  }
}

# DNS record pointing *.googleapis.com to our private endpoint
resource "google_dns_record_set" "googleapis" {
  name         = "*.googleapis.com."
  managed_zone = google_dns_managed_zone.googleapis.name
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.private_service_connect.address]
}

# Private Service Connect for Cloud SQL
resource "google_compute_address" "cloudsql_psc" {
  name         = "${var.project_name}-cloudsql-psc"
  address_type = "INTERNAL"
  subnetwork   = google_compute_subnetwork.private.id
  region       = var.gcp_region
}

resource "google_compute_forwarding_rule" "cloudsql_psc" {
  name                  = "${var.project_name}-cloudsql-psc"
  region                = var.gcp_region
  network               = google_compute_network.main.id
  ip_address            = google_compute_address.cloudsql_psc.id
  load_balancing_scheme = ""
  target                = google_sql_database_instance.main.psc_service_attachment_link
}
```

## Dedicated Subnet for Private Endpoints

Across all providers, it is a best practice to have a dedicated subnet for private endpoints.

```hcl
# dedicated-subnet.tf - Subnet for private endpoints

# AWS - Dedicated subnet
resource "aws_subnet" "private_endpoints" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 240)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name    = "private-endpoints-${var.availability_zones[count.index]}"
    Purpose = "PrivateEndpoints"
  }
}

# Azure - Dedicated subnet (must have specific settings)
resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.pe_subnet_cidr]

  # Required for private endpoints
  private_endpoint_network_policies_enabled = true
}

# GCP - Dedicated subnet
resource "google_compute_subnetwork" "private_endpoints" {
  name          = "private-endpoints"
  ip_cidr_range = var.pe_subnet_cidr
  region        = var.gcp_region
  network       = google_compute_network.main.id
  purpose       = "PRIVATE"
}
```

## Cross-Provider Comparison

Here is a quick reference for private endpoint patterns across providers:

| Feature | AWS | Azure | GCP |
|---------|-----|-------|-----|
| Name | VPC Endpoint | Private Endpoint | Private Service Connect |
| DNS | Private DNS enabled | Private DNS Zone | Cloud DNS |
| Scope | Per VPC | Per VNet | Per VPC Network |
| Cost | Interface: per hour + data | Per hour + data | Per hour + data |
| Free tier | Gateway endpoints | None | None |

## Summary

Private endpoints are essential for secure cloud architectures. They keep traffic off the public internet, reduce latency, and help meet compliance requirements. While each cloud provider implements them differently, the concept is the same: create a private IP in your network that maps to a cloud service.

AWS is the most straightforward with two types (Gateway for S3/DynamoDB, Interface for everything else). Azure requires private DNS zones for each service type. GCP uses Private Service Connect with forwarding rules.

In a multi-cloud setup, Terraform lets you manage all these private endpoints in a single codebase, ensuring consistent security posture across providers.

For monitoring the connectivity and performance of your private endpoints, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides visibility into network health and can alert you when endpoint connectivity issues arise.
