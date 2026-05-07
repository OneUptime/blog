# How to Attach VPCs to Transit Gateway with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Transit Gateway, VPC, VPC Attachment, Multi-Account, Networking, Infrastructure as Code

Description: Learn how to attach multiple VPCs to an AWS Transit Gateway using OpenTofu, including cross-account attachments, route table configuration, and network segmentation patterns.

---

Attaching VPCs to a Transit Gateway enables centralized routing between multiple VPCs and on-premises networks. OpenTofu manages same-account attachments directly, and cross-account attachments by combining Transit Gateway sharing through Resource Access Manager with explicit route table associations for network segmentation.

## Multi-VPC Attachment Pattern

```mermaid
graph TD
    A[Transit Gateway<br/>Shared Account] --> B[Prod VPC<br/>Prod Account]
    A --> C[Dev VPC<br/>Dev Account]
    A --> D[Shared Services VPC<br/>Shared Account]
    A --> E[Security VPC<br/>Security Account]
    B -.->|Isolated| C
    B -->|Allowed| D
    C -->|Allowed| D
```

## Same-Account VPC Attachments

```hcl
# attachments.tf

locals {
  vpcs = {
    production = {
      vpc_id     = var.production_vpc_id
      subnet_ids = var.production_tgw_subnet_ids
      cidr       = var.production_vpc_cidr
    }
    development = {
      vpc_id     = var.development_vpc_id
      subnet_ids = var.development_tgw_subnet_ids
      cidr       = var.development_vpc_cidr
    }
    shared = {
      vpc_id     = var.shared_vpc_id
      subnet_ids = var.shared_tgw_subnet_ids
      cidr       = var.shared_vpc_cidr
    }
  }
}

resource "aws_ec2_transit_gateway_vpc_attachment" "main" {
  for_each = local.vpcs

  transit_gateway_id = var.transit_gateway_id
  vpc_id             = each.value.vpc_id
  subnet_ids         = each.value.subnet_ids

  dns_support  = "enable"
  ipv6_support = "disable"

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name        = "${var.prefix}-tgw-${each.key}"
    Environment = each.key
    ManagedBy   = "opentofu"
  }
}
```

## Cross-Account VPC Attachments

```hcl
# cross_account_attachments.tf

# This example uses one OpenTofu configuration with aliased providers
# for both the Transit Gateway account and the spoke account.

provider "aws" {
  alias  = "tgw_account"
  region = var.aws_region

  assume_role {
    role_arn = "arn:aws:iam::${var.tgw_account_id}:role/TerraformRole"
  }
}

provider "aws" {
  alias  = "spoke_account"
  region = var.aws_region

  assume_role {
    role_arn = "arn:aws:iam::${var.spoke_account_id}:role/TerraformRole"
  }
}

# Step 1: In the TGW account - share the TGW with other accounts

resource "aws_ram_resource_share" "tgw" {
  provider = aws.tgw_account

  name                      = "${var.prefix}-tgw"
  allow_external_principals = false
}

resource "aws_ram_resource_association" "tgw" {
  provider = aws.tgw_account

  resource_arn       = var.transit_gateway_arn
  resource_share_arn = aws_ram_resource_share.tgw.arn
}

resource "aws_ram_principal_association" "accounts" {
  provider = aws.tgw_account

  for_each = toset(var.member_account_ids)

  principal          = each.value
  resource_share_arn = aws_ram_resource_share.tgw.arn
}

# If RAM sharing with AWS Organizations isn't enabled, accept the RAM
# resource share in the spoke account before creating the attachment.

# Step 2: In the spoke account - create the attachment
resource "aws_ec2_transit_gateway_vpc_attachment" "spoke" {
  provider = aws.spoke_account

  transit_gateway_id = var.transit_gateway_id  # Shared TGW from central account
  vpc_id             = var.spoke_vpc_id
  subnet_ids         = var.spoke_tgw_subnet_ids

  tags = {
    Name    = "${var.prefix}-spoke-attachment"
    Account = var.spoke_account_id
  }

  depends_on = [
    aws_ram_resource_association.tgw,
    aws_ram_principal_association.accounts,
  ]
}

# Step 3: In the TGW account - accept the cross-account attachment
resource "aws_ec2_transit_gateway_vpc_attachment_accepter" "spoke" {
  provider = aws.tgw_account

  transit_gateway_attachment_id = aws_ec2_transit_gateway_vpc_attachment.spoke.id

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "Accepted attachment from ${var.spoke_account_id}"
  }

  depends_on = [aws_ec2_transit_gateway_vpc_attachment.spoke]
}
```

## Route Table Management

```hcl
# route_management.tf

# Segmented route tables - production can't reach dev, both can reach shared
resource "aws_ec2_transit_gateway_route_table" "by_env" {
  for_each = toset(["production", "development"])

  transit_gateway_id = var.transit_gateway_id

  tags = {
    Name = "${var.prefix}-tgw-rt-${each.key}"
  }
}

resource "aws_ec2_transit_gateway_route_table" "shared" {
  transit_gateway_id = var.transit_gateway_id

  tags = {
    Name = "${var.prefix}-tgw-rt-shared"
  }
}

# Associate each VPC with its route table
resource "aws_ec2_transit_gateway_route_table_association" "by_env" {
  for_each = toset(["production", "development"])

  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main[each.key].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.by_env[each.key].id
}

resource "aws_ec2_transit_gateway_route_table_association" "shared" {
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["shared"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}

# Add routes to shared services from all environments
resource "aws_ec2_transit_gateway_route" "to_shared" {
  for_each = toset(["production", "development"])

  destination_cidr_block         = var.shared_vpc_cidr
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["shared"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.by_env[each.key].id
}

# Shared services can respond to all VPCs
resource "aws_ec2_transit_gateway_route" "from_shared_to_prod" {
  destination_cidr_block         = var.production_vpc_cidr
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["production"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}

resource "aws_ec2_transit_gateway_route" "from_shared_to_dev" {
  destination_cidr_block         = var.development_vpc_cidr
  transit_gateway_attachment_id  = aws_ec2_transit_gateway_vpc_attachment.main["development"].id
  transit_gateway_route_table_id = aws_ec2_transit_gateway_route_table.shared.id
}
```

## VPC Route Table Updates

```hcl
# vpc_routes.tf - update VPC route tables on both sides so traffic can flow via TGW

resource "aws_route" "private_to_shared" {
  count = length(var.private_route_table_ids)

  route_table_id         = var.private_route_table_ids[count.index]
  destination_cidr_block = var.shared_vpc_cidr
  transit_gateway_id     = var.transit_gateway_id

  depends_on = [aws_ec2_transit_gateway_vpc_attachment.main]
}

# Shared services VPC needs return routes back to the spoke CIDRs
resource "aws_route" "shared_to_spokes" {
  for_each = {
    production  = var.production_vpc_cidr
    development = var.development_vpc_cidr
  }

  route_table_id         = var.shared_route_table_id
  destination_cidr_block = each.value
  transit_gateway_id     = var.transit_gateway_id

  depends_on = [aws_ec2_transit_gateway_vpc_attachment.main]
}
```

## Best Practices

- Create dedicated `/28` or `/27` subnets per AZ for TGW attachments - these subnets are exclusively used by Transit Gateway and should not contain workload resources.
- Use `transit_gateway_default_route_table_association = false` and `transit_gateway_default_route_table_propagation = false` where you manage the TGW owner side - managing route tables explicitly gives you control over which VPCs can communicate.
- For cross-account attachments, use Resource Access Manager to share the transit gateway. If `auto_accept_shared_attachments` is disabled on the transit gateway, the owner account must accept the attachment.
- Structure TGW route tables around security boundaries, not just team ownership - production and development should be in separate route tables even if managed by the same team.
- After adding attachments, verify connectivity with `traceroute` before updating production route tables - this confirms the attachment, route table, and VPC routes are all configured correctly.
