# How to Build a Three-Tier Architecture with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Architecture, Infrastructure as Code, AWS, Networking

Description: Build a production-ready three-tier architecture on AWS with Terraform including VPC, load balancers, application servers, and database layers.

---

A three-tier architecture separates your application into three distinct layers: a presentation tier (web/load balancer), an application tier (business logic), and a data tier (database). This separation improves security, scalability, and maintainability. Terraform is an excellent tool for deploying this pattern because it lets you define the entire stack as code and reproduce it consistently across environments.

This guide walks through building a complete three-tier architecture on AWS using Terraform. By the end, you will have a working setup with a VPC, public and private subnets, an Application Load Balancer, EC2 instances for the application layer, and an RDS database.

## Architecture Overview

```text
Internet
    |
[ALB - Public Subnet]       <- Presentation Tier
    |
[EC2 Instances - Private Subnet]  <- Application Tier
    |
[RDS Database - Private Subnet]   <- Data Tier
```

The three tiers:
1. **Presentation tier** - Application Load Balancer in public subnets, receives internet traffic
2. **Application tier** - EC2 instances in private subnets, accessible only through the ALB
3. **Data tier** - RDS instance in isolated private subnets, accessible only from the application tier

## Project Structure

```text
three-tier/
  main.tf          # Root module
  variables.tf     # Input variables
  outputs.tf       # Output values
  providers.tf     # Provider configuration
  vpc.tf           # VPC and networking
  alb.tf           # Application Load Balancer
  app.tf           # Application tier (EC2)
  database.tf      # Data tier (RDS)
  security.tf      # Security groups
```

## Step 1: Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Step 2: Variables

```hcl
# variables.tf
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "three-tier-app"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "app_instance_type" {
  type    = string
  default = "t3.small"
}

variable "app_instance_count" {
  type    = number
  default = 2
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "db_name" {
  type    = string
  default = "appdb"
}

variable "db_username" {
  type    = string
  default = "dbadmin"
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Step 3: VPC and Networking

The network is the foundation. We need public subnets for the ALB, private subnets for the application servers, and isolated subnets for the database.

```hcl
# vpc.tf

# Fetch available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway for public subnets
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public subnets (for ALB)
resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
    Tier = "presentation"
  }
}

# Private subnets (for application servers)
resource "aws_subnet" "private_app" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-app-${count.index + 1}"
    Tier = "application"
  }
}

# Isolated subnets (for database)
resource "aws_subnet" "private_db" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-db-${count.index + 1}"
    Tier = "data"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

# NAT Gateway (allows private subnets to reach the internet for updates)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project_name}-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table (with NAT gateway for outbound internet)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

# Associate private app subnets with private route table
resource "aws_route_table_association" "private_app" {
  count = 2

  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private.id
}

# Database subnets have no internet route - completely isolated
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-database-rt"
  }
}

resource "aws_route_table_association" "private_db" {
  count = 2

  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.database.id
}
```

## Step 4: Security Groups

Security groups enforce the tier boundaries. Each tier can only communicate with its adjacent tier.

```hcl
# security.tf

# ALB Security Group - accepts HTTP/HTTPS from the internet
resource "aws_security_group" "alb" {
  name   = "${var.project_name}-alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Application Security Group - accepts traffic only from ALB
resource "aws_security_group" "app" {
  name   = "${var.project_name}-app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}

# Database Security Group - accepts traffic only from application tier
resource "aws_security_group" "db" {
  name   = "${var.project_name}-db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "MySQL from app tier"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # No egress needed for the database
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}
```

## Step 5: Application Load Balancer (Presentation Tier)

The ALB sits in the public subnets and distributes traffic to the application instances.

```hcl
# alb.tf

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "app" {
  name     = "${var.project_name}-app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 3
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-app-tg"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

## Step 6: Application Tier (EC2 Instances)

The application servers run in private subnets. They receive traffic only from the ALB and connect to the database.

```hcl
# app.tf

# Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Launch template for the application instances
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-app-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.app_instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host     = aws_db_instance.main.address
    db_name     = var.db_name
    db_username = var.db_username
    db_password = var.db_password
  }))

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name        = "${var.project_name}-app"
      Environment = var.environment
      Tier        = "application"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "${var.project_name}-app-asg"
  desired_capacity    = var.app_instance_count
  max_size            = var.app_instance_count * 2
  min_size            = var.app_instance_count
  target_group_arns   = [aws_lb_target_group.app.arn]
  vpc_zone_identifier = aws_subnet.private_app[*].id

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-app"
    propagate_at_launch = true
  }
}

# Auto Scaling Policy - scale based on CPU
resource "aws_autoscaling_policy" "cpu" {
  name                   = "${var.project_name}-cpu-policy"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

Create a simple user data script:

```bash
#!/bin/bash
# user_data.sh - Bootstrap the application server

# Update system packages
yum update -y

# Install web server and application dependencies
yum install -y httpd php php-mysqlnd

# Configure the application
cat > /var/www/html/index.php << 'APPEOF'
<?php
$db_host = getenv('DB_HOST');
echo "<h1>Three-Tier App</h1>";
echo "<p>Server: " . gethostname() . "</p>";
echo "<p>Database: " . $db_host . "</p>";
?>
APPEOF

# Create a health check endpoint
cat > /var/www/html/health << 'HEALTHEOF'
OK
HEALTHEOF

# Set database connection as environment variable
echo "export DB_HOST=${db_host}" >> /etc/environment
echo "export DB_NAME=${db_name}" >> /etc/environment

# Start and enable Apache
systemctl start httpd
systemctl enable httpd
```

## Step 7: Data Tier (RDS Database)

The database runs in isolated subnets with no direct internet access.

```hcl
# database.tf

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = aws_subnet.private_db[*].id

  tags = {
    Name = "${var.project_name}-db-subnet"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-db"

  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-db-final"

  tags = {
    Name        = "${var.project_name}-db"
    Environment = var.environment
    Tier        = "data"
  }
}
```

## Step 8: Outputs

```hcl
# outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "The URL of the application"
  value       = "http://${aws_lb.main.dns_name}"
}

output "db_endpoint" {
  description = "The endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_name" {
  description = "The name of the database"
  value       = aws_db_instance.main.db_name
}

output "app_security_group_id" {
  description = "Security group ID for the application tier"
  value       = aws_security_group.app.id
}
```

## Deploying the Architecture

```bash
# Initialize Terraform
terraform init

# Create a terraform.tfvars file
cat > terraform.tfvars << EOF
project_name      = "myapp"
environment       = "production"
aws_region        = "us-east-1"
app_instance_count = 2
db_password       = "YourSecureP@ssw0rd!"
EOF

# Preview the changes
terraform plan

# Deploy
terraform apply
```

After deployment, access the application at the ALB DNS name shown in the outputs.

## Security Considerations

This architecture follows several security best practices:

1. **Network isolation** - Each tier is in its own subnet with specific routing rules.
2. **Security group chaining** - The database only accepts connections from the application security group, not from IP ranges.
3. **No public IPs on app/data tiers** - Only the ALB has a public-facing presence.
4. **Encrypted storage** - RDS storage is encrypted at rest.
5. **Multi-AZ database** - The database is deployed across availability zones for high availability.

For production, you should also add:

- HTTPS on the ALB with an ACM certificate
- WAF (Web Application Firewall) in front of the ALB
- VPC Flow Logs for network monitoring
- CloudWatch alarms for each tier
- Secrets Manager for database credentials instead of variables

## Scaling the Architecture

The three-tier architecture scales at each layer:

- **Presentation tier** - The ALB automatically scales to handle traffic.
- **Application tier** - The Auto Scaling Group adds/removes instances based on CPU utilization.
- **Data tier** - RDS can be scaled vertically (larger instance class) or horizontally (read replicas).

```hcl
# Add a read replica for the database
resource "aws_db_instance" "read_replica" {
  identifier          = "${var.project_name}-db-replica"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.db_instance_class
  publicly_accessible = false

  tags = {
    Name = "${var.project_name}-db-replica"
  }
}
```

## Conclusion

A three-tier architecture with Terraform gives you a clean separation of concerns, security through network isolation, and the ability to scale each layer independently. The entire stack is defined as code, which means you can version it, review changes, and reproduce it across environments with confidence. Start with this foundation and add monitoring, HTTPS, and additional security measures as your application requires them.
