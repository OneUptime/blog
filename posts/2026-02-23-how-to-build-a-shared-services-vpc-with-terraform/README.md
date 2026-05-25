# How to Build a Shared Services VPC with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC, Networking, Shared Services, AWS, Infrastructure Patterns

Description: Learn how to build a shared services VPC with Terraform to centralize DNS, Active Directory, monitoring, and other common infrastructure across your AWS accounts.

---

In a multi-account AWS environment, certain services need to be available to every workload. DNS resolvers, monitoring agents, package repositories, Active Directory, bastion hosts - these do not belong in individual application accounts. They belong in a shared services VPC that every other VPC can reach.

Building this shared layer with Terraform gives you a consistent, auditable foundation that your entire organization can rely on. Let us walk through the architecture and implementation.

## Why a Shared Services VPC?

Without a shared services VPC, teams end up duplicating infrastructure. Each account runs its own NAT gateways, its own DNS resolvers, its own monitoring collectors. That duplication adds cost and creates operational burden. A shared services VPC centralizes these common resources and makes them available to connected VPCs through Transit Gateway or, for non-transitive service-to-service traffic, VPC peering.

## Architecture

Our shared services VPC will host:

- Route53 Resolver endpoints for hybrid DNS
- NAT gateways for centralized internet egress
- VPC endpoints for AWS services (to avoid internet-bound traffic)
- A bastion host for administrative access
- Monitoring collectors and log aggregation

## VPC Foundation

The shared services VPC needs careful CIDR planning since it connects to every other VPC in your environment:

```hcl
resource "aws_vpc" "shared" {
  cidr_block           = var.vpc_cidr # e.g., 10.0.0.0/16
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-shared-services"
    Environment = "shared"
  }
}

# Public subnets for NAT gateways and internet-facing resources

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.shared.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-shared-public-${var.availability_zones[count.index]}"
    Tier = "public"
  }
}

# Private subnets for shared services workloads
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.shared.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-shared-private-${var.availability_zones[count.index]}"
    Tier = "private"
  }
}

# Transit Gateway attachment subnets
resource "aws_subnet" "tgw" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.shared.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-shared-tgw-${var.availability_zones[count.index]}"
    Tier = "transit"
  }
}

resource "aws_internet_gateway" "shared" {
  vpc_id = aws_vpc.shared.id

  tags = {
    Name = "${var.project_name}-shared-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.shared.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.shared.id
  }

  tags = {
    Name = "${var.project_name}-shared-public"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.shared.id

  tags = {
    Name = "${var.project_name}-shared-private-${var.availability_zones[count.index]}"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

## Centralized VPC Endpoints

Instead of every VPC having its own interface endpoints (which cost money per AZ), you can centralize interface endpoints in the shared services VPC when connected VPCs have routing to the endpoint ENIs and DNS is configured to resolve the service names to those private endpoint addresses:

```hcl
# Common AWS service endpoints shared across the organization
locals {
  vpc_endpoints = [
    "com.amazonaws.${var.region}.s3",
    "com.amazonaws.${var.region}.dynamodb",
    "com.amazonaws.${var.region}.ecr.api",
    "com.amazonaws.${var.region}.ecr.dkr",
    "com.amazonaws.${var.region}.logs",
    "com.amazonaws.${var.region}.monitoring",
    "com.amazonaws.${var.region}.secretsmanager",
    "com.amazonaws.${var.region}.ssm",
    "com.amazonaws.${var.region}.kms",
  ]

  # Gateway endpoints (S3, DynamoDB) are attached to route tables in this VPC.
  # They are useful for workloads in the shared services VPC, but they are not
  # reachable from peered VPCs or through Transit Gateway.
  gateway_endpoints = [
    "com.amazonaws.${var.region}.s3",
    "com.amazonaws.${var.region}.dynamodb",
  ]
}

# Interface endpoints
resource "aws_vpc_endpoint" "interface" {
  for_each = toset([
    for ep in local.vpc_endpoints : ep
    if !contains(local.gateway_endpoints, ep)
  ])

  vpc_id              = aws_vpc.shared.id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]

  tags = {
    Name = "${var.project_name}-${replace(each.value, "com.amazonaws.${var.region}.", "")}"
  }
}

# Gateway endpoints
resource "aws_vpc_endpoint" "gateway" {
  for_each = toset(local.gateway_endpoints)

  vpc_id            = aws_vpc.shared.id
  service_name      = each.value
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = {
    Name = "${var.project_name}-${replace(each.value, "com.amazonaws.${var.region}.", "")}"
  }
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "${var.project_name}-vpc-endpoints-"
  vpc_id      = aws_vpc.shared.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, "10.0.0.0/8"] # Allow from all internal CIDRs
    description = "HTTPS from internal networks"
  }
}
```

For spoke VPCs to use centralized interface endpoints with the standard AWS service names, add centralized DNS such as Route53 Resolver forwarding rules or custom private hosted zones. The AWS-managed private DNS for an interface endpoint is associated with the endpoint VPC, not automatically with every connected VPC.

## Route53 Resolver for Hybrid DNS

If you have on-premises DNS servers or need to resolve private hosted zones across accounts, Route53 Resolver endpoints are essential:

```hcl
resource "aws_security_group" "dns" {
  name_prefix = "${var.project_name}-dns-"
  vpc_id      = aws_vpc.shared.id

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr, "10.0.0.0/8"]
    description = "DNS UDP from internal networks"
  }

  ingress {
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, "10.0.0.0/8"]
    description = "DNS TCP from internal networks"
  }
}

# Inbound endpoint - on-premises can resolve AWS private zones
resource "aws_route53_resolver_endpoint" "inbound" {
  name      = "${var.project_name}-inbound-resolver"
  direction = "INBOUND"
  security_group_ids = [aws_security_group.dns.id]

  dynamic "ip_address" {
    for_each = aws_subnet.private
    content {
      subnet_id = ip_address.value.id
    }
  }

  tags = {
    Name = "${var.project_name}-inbound-dns"
  }
}

# Outbound endpoint - AWS can resolve on-premises domains
resource "aws_route53_resolver_endpoint" "outbound" {
  name      = "${var.project_name}-outbound-resolver"
  direction = "OUTBOUND"
  security_group_ids = [aws_security_group.dns.id]

  dynamic "ip_address" {
    for_each = aws_subnet.private
    content {
      subnet_id = ip_address.value.id
    }
  }

  tags = {
    Name = "${var.project_name}-outbound-dns"
  }
}

# Forwarding rule for on-premises domains
resource "aws_route53_resolver_rule" "onprem" {
  name                 = "forward-to-onprem"
  domain_name          = var.onprem_domain
  rule_type            = "FORWARD"
  resolver_endpoint_id = aws_route53_resolver_endpoint.outbound.id

  dynamic "target_ip" {
    for_each = var.onprem_dns_servers
    content {
      ip = target_ip.value
    }
  }
}

# Share the resolver rule with the organization via RAM
resource "aws_ram_resource_share" "dns_rules" {
  name                      = "${var.project_name}-dns-rules"
  allow_external_principals = false
}

resource "aws_ram_resource_association" "dns_rule" {
  resource_arn       = aws_route53_resolver_rule.onprem.arn
  resource_share_arn = aws_ram_resource_share.dns_rules.arn
}

resource "aws_ram_principal_association" "org" {
  principal          = var.organization_arn
  resource_share_arn = aws_ram_resource_share.dns_rules.arn
}
```

## Centralized NAT Gateways

Centralizing NAT gateways reduces cost since spoke VPCs do not need their own:

```hcl
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-shared-nat-eip-${count.index}"
  }
}

resource "aws_nat_gateway" "shared" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-shared-nat-${count.index}"
  }
}

resource "aws_route" "private_default" {
  count                  = length(aws_route_table.private)
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.shared[count.index].id
}
```

For centralized egress from spoke VPCs, you also need routes from spoke subnet route tables to the Transit Gateway, Transit Gateway route-table entries toward this attachment, routes from the Transit Gateway attachment subnet route tables to the NAT gateways, and return routes from the NAT/public subnet route tables back to spoke CIDRs through the Transit Gateway. Keep those routes AZ-aware to avoid cross-AZ data processing and availability issues.

## Transit Gateway Attachment

Connect the shared services VPC to the Transit Gateway so all spokes can reach it after you associate and propagate the attachment with the correct Transit Gateway route tables and add matching VPC subnet routes:

```hcl
resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  subnet_ids         = aws_subnet.tgw[*].id
  transit_gateway_id = var.transit_gateway_id
  vpc_id             = aws_vpc.shared.id

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = {
    Name = "${var.project_name}-shared-services-attachment"
  }
}
```

## Package Repository

Host internal package repositories so build systems do not need to reach public package registries directly:

```hcl
# CodeArtifact domain and repository for internal packages
resource "aws_codeartifact_domain" "main" {
  domain = var.project_name
}

resource "aws_codeartifact_repository" "internal" {
  repository = "internal"
  domain     = aws_codeartifact_domain.main.domain

  upstream {
    repository_name = aws_codeartifact_repository.npm_proxy.repository
  }
}

# Proxy to public npm registry
resource "aws_codeartifact_repository" "npm_proxy" {
  repository = "npm-proxy"
  domain     = aws_codeartifact_domain.main.domain

  external_connections {
    external_connection_name = "public:npmjs"
  }
}
```

## Putting It All Together

The shared services VPC is a critical piece of your [landing zone architecture](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-landing-zone-with-terraform/view). It reduces costs, simplifies operations, and gives every team in your organization access to common infrastructure. Define it once in Terraform, connect it to your Transit Gateway, configure the required VPC and Transit Gateway route tables, and every spoke VPC can use the shared services intentionally.

## Wrapping Up

A well-designed shared services VPC eliminates duplication and gives your platform team a single place to manage common infrastructure. The key is to plan your CIDR blocks carefully, centralize what makes sense (DNS, NAT, VPC endpoints), and share resources across your organization using RAM and Transit Gateway. As your organization grows, this shared foundation scales with it.
