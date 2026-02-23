# How to Create Shared Subnets Across Accounts with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VPC Sharing, AWS, RAM, Networking, Multi-Account, Subnets

Description: Learn how to share VPC subnets across AWS accounts using Terraform and AWS Resource Access Manager for centralized network management.

---

AWS VPC sharing allows a central networking account to share subnets with other AWS accounts in the same organization. This means workload accounts can launch resources into subnets owned by a central VPC without needing their own VPCs or peering connections. The feature uses AWS Resource Access Manager (RAM) to handle the sharing. Terraform makes it easy to configure both the sharing account and the participating accounts.

## Why Share Subnets

In a multi-account AWS architecture, every team or application often gets its own account. Without subnet sharing, each account needs its own VPC, and you must set up peering or Transit Gateway connections between them. With subnet sharing, a central networking team manages the VPC and subnets, and other accounts simply use the shared subnets. This reduces complexity, conserves IP address space, and centralizes network management.

The key benefit is that resources in shared subnets can communicate with each other using private IP addresses without any peering or routing setup.

## Prerequisites

You need Terraform 1.0 or later, two or more AWS accounts within the same AWS Organization, and the Organizations must have resource sharing enabled. The owner account needs VPC and RAM permissions, and the participant accounts need permissions to launch resources.

## Enabling RAM Sharing in the Organization

First, enable sharing within your AWS Organization:

```hcl
# In the management account, enable RAM sharing
resource "aws_ram_sharing_with_aws_organization" "enable" {
  # This enables RAM sharing across all accounts in the organization
}
```

## Setting Up the Owner Account

The owner account creates the VPC, subnets, and shares them:

```hcl
# Provider for the networking (owner) account
provider "aws" {
  alias  = "networking"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::111111111111:role/TerraformRole"
  }
}

# VPC owned by the networking account
resource "aws_vpc" "shared" {
  provider = aws.networking

  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "shared-vpc" }
}

# Public subnets
resource "aws_subnet" "public" {
  provider = aws.networking
  count    = 3

  vpc_id                  = aws_vpc.shared.id
  cidr_block              = cidrsubnet(aws_vpc.shared.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "shared-public-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "public"
  }
}

# Private subnets for application workloads
resource "aws_subnet" "private_app" {
  provider = aws.networking
  count    = 3

  vpc_id            = aws_vpc.shared.id
  cidr_block        = cidrsubnet(aws_vpc.shared.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "shared-private-app-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private-app"
  }
}

# Private subnets for databases
resource "aws_subnet" "private_db" {
  provider = aws.networking
  count    = 3

  vpc_id            = aws_vpc.shared.id
  cidr_block        = cidrsubnet(aws_vpc.shared.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "shared-private-db-${data.aws_availability_zones.available.names[count.index]}"
    Tier = "private-db"
  }
}

data "aws_availability_zones" "available" {
  provider = aws.networking
  state    = "available"
}
```

## Creating the RAM Resource Share

Share the subnets using AWS Resource Access Manager:

```hcl
# Create a RAM resource share for application subnets
resource "aws_ram_resource_share" "app_subnets" {
  provider = aws.networking

  name                      = "app-subnets-share"
  allow_external_principals = false

  tags = {
    Name = "app-subnets-share"
  }
}

# Associate the app subnets with the resource share
resource "aws_ram_resource_association" "app_subnets" {
  provider = aws.networking
  count    = 3

  resource_arn       = aws_subnet.private_app[count.index].arn
  resource_share_arn = aws_ram_resource_share.app_subnets.arn
}

# Share with specific accounts
resource "aws_ram_principal_association" "app_team" {
  provider = aws.networking

  principal          = "222222222222" # App team account ID
  resource_share_arn = aws_ram_resource_share.app_subnets.arn
}

resource "aws_ram_principal_association" "data_team" {
  provider = aws.networking

  principal          = "333333333333" # Data team account ID
  resource_share_arn = aws_ram_resource_share.app_subnets.arn
}

# Create a separate share for database subnets (different access)
resource "aws_ram_resource_share" "db_subnets" {
  provider = aws.networking

  name                      = "db-subnets-share"
  allow_external_principals = false

  tags = {
    Name = "db-subnets-share"
  }
}

# Associate database subnets
resource "aws_ram_resource_association" "db_subnets" {
  provider = aws.networking
  count    = 3

  resource_arn       = aws_subnet.private_db[count.index].arn
  resource_share_arn = aws_ram_resource_share.db_subnets.arn
}

# Only share DB subnets with the data team
resource "aws_ram_principal_association" "db_data_team" {
  provider = aws.networking

  principal          = "333333333333"
  resource_share_arn = aws_ram_resource_share.db_subnets.arn
}
```

## Sharing with an Organizational Unit

You can share with an entire OU instead of individual accounts:

```hcl
# Share with an entire organizational unit
resource "aws_ram_principal_association" "production_ou" {
  provider = aws.networking

  # OU ARN from AWS Organizations
  principal          = "arn:aws:organizations::111111111111:ou/o-example/ou-abc123"
  resource_share_arn = aws_ram_resource_share.app_subnets.arn
}
```

## Using Shared Subnets in Participant Accounts

In the participant account, you can directly reference the shared subnets:

```hcl
# Provider for the app team account
provider "aws" {
  alias  = "app_team"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::222222222222:role/TerraformRole"
  }
}

# Look up the shared subnets
data "aws_subnets" "shared_app" {
  provider = aws.app_team

  filter {
    name   = "tag:Tier"
    values = ["private-app"]
  }

  filter {
    name   = "vpc-id"
    values = [aws_vpc.shared.id]
  }
}

# Launch an EC2 instance in the shared subnet
resource "aws_instance" "app" {
  provider = aws.app_team

  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnets.shared_app.ids[0]

  tags = { Name = "app-in-shared-subnet" }
}

# Create a security group in the shared VPC
resource "aws_security_group" "app" {
  provider = aws.app_team

  name   = "app-sg"
  vpc_id = aws_vpc.shared.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "app-sg" }
}
```

## Setting Up Network Infrastructure in the Owner Account

The owner account manages routing, NAT Gateways, and other network infrastructure:

```hcl
# Internet Gateway
resource "aws_internet_gateway" "main" {
  provider = aws.networking
  vpc_id   = aws_vpc.shared.id

  tags = { Name = "shared-igw" }
}

# NAT Gateway for private subnet internet access
resource "aws_eip" "nat" {
  provider = aws.networking
  domain   = "vpc"
}

resource "aws_nat_gateway" "main" {
  provider = aws.networking

  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = { Name = "shared-nat-gw" }
}

# Route table for private subnets
resource "aws_route_table" "private" {
  provider = aws.networking
  vpc_id   = aws_vpc.shared.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "shared-private-rt" }
}

# Associate private app subnets with the route table
resource "aws_route_table_association" "private_app" {
  provider = aws.networking
  count    = 3

  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Outputs

```hcl
output "shared_vpc_id" {
  description = "ID of the shared VPC"
  value       = aws_vpc.shared.id
}

output "shared_app_subnet_ids" {
  description = "IDs of shared application subnets"
  value       = aws_subnet.private_app[*].id
}

output "shared_db_subnet_ids" {
  description = "IDs of shared database subnets"
  value       = aws_subnet.private_db[*].id
}

output "app_share_arn" {
  description = "ARN of the app subnet resource share"
  value       = aws_ram_resource_share.app_subnets.arn
}
```

## Monitoring Shared Subnets

Monitor resources deployed across shared subnets using [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-shared-subnets-across-accounts-with-terraform/view) to maintain visibility into the health and performance of workloads running in your centralized network.

## Best Practices

Centralize network management in a dedicated networking account. Use separate resource shares with different access levels for different subnet tiers. Tag subnets clearly so participant accounts can identify them. The owner account retains control over routing, security, and network infrastructure. Participant accounts manage their own security groups and resources within shared subnets.

## Conclusion

Shared subnets across accounts with Terraform and AWS RAM simplify multi-account networking significantly. By centralizing VPC management while allowing other accounts to deploy resources, you reduce complexity, save IP address space, and maintain consistent network policies. Terraform makes it straightforward to define the sharing relationships, manage subnet configurations, and keep everything version controlled.
