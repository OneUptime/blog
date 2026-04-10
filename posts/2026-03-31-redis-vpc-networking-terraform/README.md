# How to Set Up Redis VPC Networking with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Terraform, VPC, AWS, Network

Description: Learn how to configure VPC networking for AWS ElastiCache Redis with Terraform, including private subnets, subnet groups, and VPC endpoint access patterns.

---

Running ElastiCache Redis in a VPC ensures your data never traverses the public internet. This guide covers creating the correct subnet configuration, subnet groups, and access patterns using Terraform.

## Architecture Overview

A proper Redis VPC setup includes:
- Redis deployed in private subnets (no internet gateway route)
- Application tier in private subnets with NAT gateway for egress
- Security group rules controlling inbound access on port 6379
- No public accessibility on the Redis cluster

## Step 1: Create Private Subnets for Redis

```hcl
resource "aws_subnet" "redis_private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "redis-private-${count.index + 1}"
    Tier = "cache"
  }
}
```

## Step 2: Create the ElastiCache Subnet Group

The subnet group tells ElastiCache which subnets it can use:

```hcl
resource "aws_elasticache_subnet_group" "redis" {
  name       = "redis-subnet-group"
  subnet_ids = aws_subnet.redis_private[*].id

  tags = {
    Name = "redis-subnet-group"
  }
}
```

## Step 3: Route Table for Private Subnets

Ensure Redis subnets have no route to an internet gateway:

```hcl
resource "aws_route_table" "redis_private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "redis-private-rt"
  }
}

resource "aws_route_table_association" "redis_private" {
  count          = length(aws_subnet.redis_private)
  subnet_id      = aws_subnet.redis_private[count.index].id
  route_table_id = aws_route_table.redis_private.id
}
```

Note: No `aws_route` resource pointing to an internet gateway - this keeps the subnets private.

## Step 4: Create the ElastiCache Cluster

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "app-redis"
  description                = "Application Redis cluster"
  node_type                  = "cache.t3.medium"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

## Step 5: Outputs for Application Configuration

```hcl
output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  value = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  value = 6379
}
```

## Verify Connectivity

From an EC2 instance in the application subnet:

```bash
# Test TCP connectivity
nc -zv <redis-primary-endpoint> 6379

# Test Redis connectivity (--tls required because transit encryption is enabled)
redis-cli -h <redis-primary-endpoint> -p 6379 --tls -a your-auth-token ping
```

Expected output:

```text
Connection to <endpoint> 6379 port [tcp/*] succeeded!
PONG
```

## Cross-VPC Access with VPC Peering

If your application runs in a different VPC:

```hcl
resource "aws_vpc_peering_connection" "app_to_redis" {
  vpc_id      = aws_vpc.app.id
  peer_vpc_id = aws_vpc.redis.id
  auto_accept = true
}

resource "aws_route" "app_to_redis" {
  route_table_id            = aws_route_table.app_private.id
  destination_cidr_block    = var.redis_vpc_cidr
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_redis.id
}

resource "aws_route" "redis_to_app" {
  route_table_id            = aws_route_table.redis_private.id
  destination_cidr_block    = var.app_vpc_cidr
  vpc_peering_connection_id = aws_vpc_peering_connection.app_to_redis.id
}
```

## Summary

VPC networking for Redis in Terraform centers on private subnets, a dedicated subnet group, and security group rules. Deploy Redis in subnets with no internet gateway route, keep application and cache tiers in separate subnet ranges for clarity, and use VPC peering or AWS PrivateLink when Redis needs to be shared across VPC boundaries.
