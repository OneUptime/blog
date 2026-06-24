# How to Set Up Private API Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Azure, Private Endpoint, API Gateway, OpenTofu, Security, PrivateLink

Description: Learn how to configure private API endpoints on AWS and Azure using OpenTofu to restrict API access to within VPCs, eliminating public internet exposure.

## Overview

Private API endpoints expose APIs over private network paths inside environments such as VPCs and VNets instead of the public internet. AWS PrivateLink and Azure Private Link enable this pattern for both managed services and custom APIs. OpenTofu configures the required endpoints, DNS resolution, and security.

## Step 1: AWS API Gateway Private Endpoint

```hcl
# main.tf - Private API Gateway using VPC endpoint

resource "aws_vpc_endpoint" "apigw" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.execute-api"
  vpc_endpoint_type   = "Interface"
  security_group_ids  = [aws_security_group.apigw_endpoint.id]
  subnet_ids          = module.vpc.private_subnets
  private_dns_enabled = true
}

# Private REST API
resource "aws_api_gateway_rest_api" "private_api" {
  name = "private-api"

  endpoint_configuration {
    types            = ["PRIVATE"]
    vpc_endpoint_ids = [aws_vpc_endpoint.apigw.id]
  }
}

# Resource policy to restrict to VPC endpoint
resource "aws_api_gateway_rest_api_policy" "private" {
  rest_api_id = aws_api_gateway_rest_api.private_api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "arn:aws:execute-api:*:*:${aws_api_gateway_rest_api.private_api.id}/*"
        Condition = {
          StringEquals = {
            "aws:SourceVpce" = aws_vpc_endpoint.apigw.id
          }
        }
      },
      {
        Effect    = "Deny"
        Principal = "*"
        Action    = "execute-api:Invoke"
        Resource  = "arn:aws:execute-api:*:*:${aws_api_gateway_rest_api.private_api.id}/*"
        Condition = {
          StringNotEquals = {
            "aws:SourceVpce" = aws_vpc_endpoint.apigw.id
          }
        }
      }
    ]
  })
}
```

## Step 2: AWS PrivateLink for Custom Services

```hcl
# Expose a service via PrivateLink to other VPCs
resource "aws_lb" "nlb" {
  name               = "service-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = module.vpc.private_subnets
}

# VPC Endpoint Service (PrivateLink)
resource "aws_vpc_endpoint_service" "service" {
  acceptance_required        = true  # Manual approval for new consumers
  network_load_balancer_arns = [aws_lb.nlb.arn]

  allowed_principals = [
    "arn:aws:iam::${var.consumer_account_id}:root"
  ]
}

# Consumer VPC creates an endpoint to access the service
resource "aws_vpc_endpoint" "consumer" {
  provider            = aws.consumer_account
  vpc_id              = var.consumer_vpc_id
  service_name        = aws_vpc_endpoint_service.service.service_name
  vpc_endpoint_type   = "Interface"
  security_group_ids  = [var.consumer_security_group_id]
  subnet_ids          = var.consumer_subnet_ids
  private_dns_enabled = false  # Set to true only if the service has a verified private DNS name
}
```

## Step 3: Azure Private Link for APIM

```hcl
# Azure API Management with private endpoint
resource "azurerm_private_endpoint" "apim" {
  name                = "apim-private-endpoint"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "apim-connection"
    private_connection_resource_id = azurerm_api_management.apim.id
    is_manual_connection           = false
    subresource_names              = ["Gateway"]
  }

  private_dns_zone_group {
    name = "apim-dns"
    private_dns_zone_ids = [azurerm_private_dns_zone.apim.id]
  }
}

# Private DNS zone for APIM private endpoint
resource "azurerm_private_dns_zone" "apim" {
  name                = "privatelink.azure-api.net"
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "apim" {
  name                  = "apim-dns-link"
  resource_group_name   = azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.apim.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}
```

To make APIM private-only, disable public network access on the API Management instance after the private endpoint is created.

## Step 4: Security Group for VPC Endpoint

```hcl
# Security group restricting VPC endpoint access
resource "aws_security_group" "apigw_endpoint" {
  name   = "apigw-endpoint"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
    description = "HTTPS from within VPC only"
  }
}
```

## Summary

Private API endpoints configured with OpenTofu route traffic over private network paths instead of the public internet. AWS PrivateLink creates a dedicated private network path from consumer VPCs to the service without any traffic traversing the internet. Azure Private Link follows the same pattern for APIM and custom services, but APIM must also have public network access disabled to be private-only. When configured, private DNS can keep name resolution working without modifying application connection strings.
