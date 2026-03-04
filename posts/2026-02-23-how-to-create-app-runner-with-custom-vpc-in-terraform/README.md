# How to Create App Runner with Custom VPC in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, App Runner, VPC, Networking, Containers

Description: Learn how to deploy AWS App Runner services with custom VPC connectivity using Terraform for secure access to private resources like databases and internal APIs.

---

AWS App Runner is a fully managed container service that makes it easy to deploy web applications and APIs from source code or container images. While App Runner handles the infrastructure automatically, many real-world applications need to communicate with private resources like RDS databases, ElastiCache clusters, or internal APIs within a VPC. Terraform makes it straightforward to configure App Runner with custom VPC connectivity.

This guide shows you how to create an App Runner service with VPC access using Terraform, including the networking setup, security groups, and service configuration.

## Why VPC Connectivity Matters

By default, App Runner services have outbound internet access but cannot reach resources inside your VPC. When your application needs to:

- Connect to an RDS database in a private subnet
- Access an ElastiCache Redis cluster
- Communicate with internal microservices
- Reach resources behind a VPC endpoint

You need to configure a VPC connector to give App Runner access to your private network.

## Setting Up the VPC

First, create the VPC infrastructure that App Runner will connect to:

```hcl
# VPC for the private resources
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "app-runner-vpc"
  }
}

# Private subnets for the VPC connector (at least two AZs recommended)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "app-runner-private-${count.index}"
  }
}

# Public subnets for NAT Gateway
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "app-runner-public-${count.index}"
  }
}

# Internet Gateway for public subnets
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "app-runner-igw"
  }
}

# NAT Gateway for outbound internet access from private subnets
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "app-runner-nat"
  }
}

# Route table for private subnets
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "app-runner-private-rt"
  }
}

# Associate private subnets with route table
resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

## Creating Security Groups

Define security groups for the VPC connector and the resources it needs to access:

```hcl
# Security group for the App Runner VPC connector
resource "aws_security_group" "app_runner_connector" {
  name_prefix = "app-runner-connector-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for App Runner VPC connector"

  # Allow all outbound traffic to VPC resources and internet
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-runner-connector-sg"
  }
}

# Security group for RDS database
resource "aws_security_group" "database" {
  name_prefix = "app-runner-db-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for RDS database accessed by App Runner"

  # Allow PostgreSQL access from App Runner connector
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner_connector.id]
    description     = "PostgreSQL access from App Runner"
  }

  tags = {
    Name = "app-runner-db-sg"
  }
}

# Security group for Redis cache
resource "aws_security_group" "redis" {
  name_prefix = "app-runner-redis-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for ElastiCache Redis accessed by App Runner"

  # Allow Redis access from App Runner connector
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner_connector.id]
    description     = "Redis access from App Runner"
  }

  tags = {
    Name = "app-runner-redis-sg"
  }
}
```

## Creating the VPC Connector

The VPC connector is the bridge between App Runner and your VPC:

```hcl
# App Runner VPC connector
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "app-runner-vpc-connector"

  # Subnets the connector will use to reach VPC resources
  subnets = aws_subnet.private[*].id

  # Security groups controlling connector traffic
  security_groups = [aws_security_group.app_runner_connector.id]

  tags = {
    Name = "app-runner-vpc-connector"
  }
}
```

## Creating the App Runner Service

Now create the App Runner service with the VPC connector attached:

```hcl
# App Runner service with VPC connectivity
resource "aws_apprunner_service" "api" {
  service_name = "my-api-service"

  source_configuration {
    # Deploy from ECR image
    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"

        # Runtime environment variables
        runtime_environment_variables = {
          DB_HOST       = aws_db_instance.main.address
          DB_PORT       = "5432"
          DB_NAME       = "myapp"
          REDIS_HOST    = aws_elasticache_cluster.main.cache_nodes[0].address
          REDIS_PORT    = "6379"
          NODE_ENV      = "production"
        }

        # Sensitive variables stored separately
        runtime_environment_secrets = {
          DB_PASSWORD = aws_secretsmanager_secret.db_password.arn
          API_KEY     = aws_secretsmanager_secret.api_key.arn
        }
      }
    }

    # IAM role for accessing ECR
    authentication_configuration {
      access_role_arn = aws_iam_role.app_runner_ecr.arn
    }

    # Automatically deploy new images
    auto_deployments_enabled = true
  }

  # Instance configuration
  instance_configuration {
    cpu               = "1024"   # 1 vCPU
    memory            = "2048"   # 2 GB
    instance_role_arn = aws_iam_role.app_runner_instance.arn
  }

  # Attach the VPC connector for private resource access
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }

    # Optional: configure ingress for private access
    ingress_configuration {
      is_publicly_accessible = true
    }
  }

  # Health check configuration
  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Auto scaling configuration
  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.main.arn

  tags = {
    Environment = "production"
  }
}

# Auto scaling configuration
resource "aws_apprunner_auto_scaling_configuration_version" "main" {
  auto_scaling_configuration_name = "api-autoscaling"
  max_concurrency                 = 100
  max_size                        = 10
  min_size                        = 2

  tags = {
    Name = "api-autoscaling"
  }
}
```

## IAM Roles for App Runner

Create the necessary IAM roles:

```hcl
# IAM role for App Runner to access ECR
resource "aws_iam_role" "app_runner_ecr" {
  name = "app-runner-ecr-access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_ecr" {
  role       = aws_iam_role.app_runner_ecr.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# IAM role for App Runner instance (runtime permissions)
resource "aws_iam_role" "app_runner_instance" {
  name = "app-runner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

# Allow instance role to read secrets
resource "aws_iam_role_policy" "app_runner_secrets" {
  name = "app-runner-secrets-access"
  role = aws_iam_role.app_runner_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn,
          aws_secretsmanager_secret.api_key.arn
        ]
      }
    ]
  })
}
```

## Creating the Private Resources

Set up the database and cache that the App Runner service will access:

```hcl
# RDS subnet group
resource "aws_db_subnet_group" "main" {
  name       = "app-runner-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

# RDS PostgreSQL instance
resource "aws_db_instance" "main" {
  identifier             = "app-runner-db"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.medium"
  allocated_storage      = 20
  db_name                = "myapp"
  username               = "admin"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  skip_final_snapshot    = true
}

# ElastiCache subnet group
resource "aws_elasticache_subnet_group" "main" {
  name       = "app-runner-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

# ElastiCache Redis cluster
resource "aws_elasticache_cluster" "main" {
  cluster_id           = "app-runner-cache"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
}
```

## Outputs

```hcl
output "app_runner_service_url" {
  description = "URL of the App Runner service"
  value       = aws_apprunner_service.api.service_url
}

output "vpc_connector_arn" {
  description = "ARN of the VPC connector"
  value       = aws_apprunner_vpc_connector.main.arn
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.address
}
```

## Monitoring with OneUptime

Once your App Runner service is running with VPC connectivity, monitoring becomes crucial. Network connectivity issues between App Runner and your VPC resources can cause subtle failures. OneUptime provides endpoint monitoring for your App Runner service URL and can alert you when health checks fail or response times degrade. Visit [OneUptime](https://oneuptime.com) to set up comprehensive monitoring.

## Conclusion

AWS App Runner with custom VPC connectivity gives you the simplicity of a managed container service with the ability to securely access private resources. By configuring the VPC connector in Terraform, you maintain a clear picture of the networking setup, security group rules, and resource dependencies. The combination of App Runner's auto-scaling, automatic deployments, and VPC access makes it a compelling option for web applications and APIs that need private resource connectivity without the complexity of managing ECS clusters or Kubernetes.

For related container deployment patterns, see [How to Create Cloud Run with Custom Domain in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloud-run-with-custom-domain-in-terraform/view) and [How to Handle Container Networking with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-container-networking-with-terraform/view).
