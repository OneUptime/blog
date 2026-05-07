# How to Configure IPv6 for AWS RDS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, RDS, Database, Dual-Stack, VPC

Description: Enable dual-stack mode on AWS RDS instances to support IPv6 database connections, configure subnet groups with IPv6, and connect to RDS over IPv6 from applications.

## Introduction

AWS RDS supports IPv6 connections through dual-stack DB instances for supported engine versions and Regions. When enabled, clients use the same DB endpoint, which can resolve to both A and AAAA records. Applications can connect to RDS over IPv6, which is useful when database clients are in IPv6-only subnets or when you want to reduce IPv4 dependency for database connections.

## Enable Dual-Stack on RDS Instance

```bash
# Create RDS instance with dual-stack mode

aws rds create-db-instance \
    --db-instance-identifier mydb \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password MyPassword123! \
    --db-subnet-group-name ipv6-subnet-group \
    --vpc-security-group-ids sg-12345678 \
    --network-type DUAL \
    --allocated-storage 20

# Enable dual-stack on existing instance
aws rds modify-db-instance \
    --db-instance-identifier mydb \
    --network-type DUAL \
    --apply-immediately

# Get the DB endpoint hostname and network type
aws rds describe-db-instances \
    --db-instance-identifier mydb \
    --query "DBInstances[0].{Endpoint:Endpoint.Address, NetworkType:NetworkType}"
```

## Create RDS Subnet Group with IPv6

```bash
# Each subnet in the RDS subnet group must have an associated IPv6 CIDR block
aws rds create-db-subnet-group \
    --db-subnet-group-name ipv6-subnet-group \
    --db-subnet-group-description "Subnet group with IPv6 support" \
    --subnet-ids \
        subnet-ipv6-private-a \
        subnet-ipv6-private-b \
        subnet-ipv6-private-c
```

## Terraform RDS with IPv6

```hcl
# rds_ipv6.tf

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = [
    aws_subnet.private_a.id,  # Each subnet must have an associated IPv6 CIDR block
    aws_subnet.private_b.id,
    aws_subnet.private_c.id,
  ]

  tags = { Name = "main-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "mydb"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = "myapp"
  username = "admin"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Enable dual-stack (IPv4 + IPv6) mode
  network_type = "DUAL"

  multi_az            = true
  skip_final_snapshot = true

  tags = { Name = "postgres-dual-stack" }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  vpc_id = aws_vpc.main.id
  name   = "rds-sg"

  # Allow PostgreSQL from app servers (IPv4)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  # Allow PostgreSQL over IPv6 from VPC
  ingress {
    from_port        = 5432
    to_port          = 5432
    protocol         = "tcp"
    ipv6_cidr_blocks = [aws_vpc.main.ipv6_cidr_block]
    description      = "PostgreSQL over IPv6 from VPC"
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "rds_dual_stack_hostname" {
  description = "Use this hostname for both IPv4 and IPv6 connections"
  value       = aws_db_instance.postgres.address
  # DNS resolves to both A and AAAA records when network_type = DUAL
}
```

## Connect to RDS over IPv6

```python
import psycopg2
import socket

# Use the standard RDS instance endpoint hostname
rds_endpoint = "mydb.xyz.us-east-1.rds.amazonaws.com"

# Resolve the endpoint's IPv6 address
addrs = socket.getaddrinfo(rds_endpoint, 5432, socket.AF_INET6, socket.SOCK_STREAM)
print(f"IPv6 address: {addrs[0][4][0]}")

# Connect using the endpoint hostname; the client stack selects IPv4 or IPv6
conn = psycopg2.connect(
    host=rds_endpoint,
    port=5432,
    dbname="myapp",
    user="admin",
    password="MyPassword123!"
)

cursor = conn.cursor()
cursor.execute("SELECT version()")
print(cursor.fetchone())
conn.close()
```

## Verify IPv6 RDS Connectivity

```bash
# Get the RDS endpoint
ENDPOINT="mydb.xyz.us-east-1.rds.amazonaws.com"

# Check if AAAA record exists
dig "$ENDPOINT" AAAA

# Test TCP connection over IPv6
nc -6 -z -v "$ENDPOINT" 5432

# Resolve one IPv6 address and force psql to use it for a one-off test
IPV6_ADDR=$(dig +short "$ENDPOINT" AAAA | head -n 1)
psql "host=${ENDPOINT} hostaddr=${IPV6_ADDR} port=5432 user=admin dbname=myapp sslmode=require"
```

## Conclusion

RDS dual-stack mode (`network_type = "DUAL"`) lets supported RDS engine versions accept both IPv4 and IPv6 connections by using the same endpoint DNS name. That DNS name can resolve to both A and AAAA records, allowing applications to connect over whichever protocol the client stack selects. RDS subnet groups must include subnets with associated IPv6 CIDR blocks. Security groups must have explicit IPv6 rules allowing database port access. Applications can continue using the DB endpoint hostname, while client OS address selection and driver configuration determine whether IPv4 or IPv6 is used.
