# How to Handle Terraform for Legacy Application Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Legacy Migration, Modernization, Infrastructure as Code, DevOps

Description: Learn how to use Terraform to migrate legacy applications to modern cloud infrastructure, covering assessment, parallel environments, incremental migration, and cutover strategies.

---

Migrating legacy applications to modern cloud infrastructure is one of the most common and challenging uses of Terraform. Legacy applications often have undocumented dependencies, non-standard configurations, and years of accumulated technical debt. Terraform provides a structured way to define the target infrastructure and manage the migration systematically.

In this guide, we will cover how to use Terraform to plan and execute legacy application migrations.

## Assessment and Discovery

Start by documenting the legacy application's infrastructure requirements:

```yaml
# migration/legacy-assessment.yaml
# Legacy application infrastructure assessment

application:
  name: "Order Processing System"
  age: "12 years"
  technology: "Java 8 on WebLogic"
  current_hosting: "On-premises data center"

infrastructure_requirements:
  compute:
    cpu_cores: 8
    memory_gb: 32
    instances: 4
    os: "Red Hat Enterprise Linux 7"

  storage:
    data_volume_gb: 500
    backup_volume_gb: 200
    iops_required: 3000

  database:
    type: "Oracle 12c"
    size_gb: 2000
    connections: 200

  networking:
    ports: [8080, 8443, 1521]
    protocols: ["TCP"]
    external_dependencies:
      - "LDAP server (10.0.1.50:389)"
      - "SMTP server (10.0.1.60:25)"
      - "File server (NFS mount /data/shared)"

  compliance:
    - "PCI-DSS compliant"
    - "Must maintain audit logs for 7 years"
```

## Building the Target Infrastructure

Create the cloud infrastructure that will host the migrated application:

```hcl
# migration/target-infrastructure/main.tf
# Target cloud infrastructure for legacy application

module "networking" {
  source = "../../modules/networking"

  vpc_cidr    = "10.100.0.0/16"
  environment = "migration"

  # Match legacy network topology where possible
  private_subnets = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
  public_subnets  = ["10.100.101.0/24", "10.100.102.0/24"]
}

# Compute instances matching legacy specifications
resource "aws_instance" "app_server" {
  count = 4

  ami           = data.aws_ami.rhel.id
  instance_type = "m6i.2xlarge"  # 8 vCPU, 32 GB (matches legacy)
  subnet_id     = module.networking.private_subnet_ids[count.index % 3]

  root_block_device {
    volume_type = "gp3"
    volume_size = 100
    encrypted   = true
  }

  # Data volume matching legacy storage
  ebs_block_device {
    device_name = "/dev/sdf"
    volume_type = "gp3"
    volume_size = 500
    iops        = 3000
    encrypted   = true
  }

  tags = {
    Name        = "legacy-app-${count.index + 1}"
    Migration   = "order-processing"
    Environment = "migration"
  }
}

# Database - migrating from Oracle to PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = "order-processing-migration"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.2xlarge"

  allocated_storage     = 2000
  max_allocated_storage = 4000
  storage_type          = "gp3"
  iops                  = 3000
  storage_encrypted     = true

  multi_az = true

  tags = {
    Migration = "order-processing"
    Source    = "Oracle 12c"
  }
}

# VPN connection to on-premises for migration period
resource "aws_vpn_gateway" "migration" {
  vpc_id = module.networking.vpc_id

  tags = {
    Name      = "migration-vpn"
    Migration = "order-processing"
  }
}
```

## Parallel Environment Strategy

Run legacy and modern environments in parallel during migration:

```hcl
# migration/parallel/main.tf
# Parallel environment for gradual migration

# Load balancer that can route to both environments
resource "aws_lb" "migration" {
  name               = "migration-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.networking.public_subnet_ids
}

# Legacy target group (pointing to on-premises via VPN)
resource "aws_lb_target_group" "legacy" {
  name        = "legacy-targets"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = module.networking.vpc_id

  health_check {
    path     = "/health"
    port     = 8080
    protocol = "HTTP"
  }
}

# Modern target group
resource "aws_lb_target_group" "modern" {
  name        = "modern-targets"
  port        = 8080
  protocol    = "HTTP"
  target_type = "instance"
  vpc_id      = module.networking.vpc_id

  health_check {
    path     = "/health"
    port     = 8080
    protocol = "HTTP"
  }
}

# Weighted routing for gradual cutover
resource "aws_lb_listener_rule" "migration" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.legacy.arn
        weight = var.legacy_traffic_weight  # Start at 100
      }
      target_group {
        arn    = aws_lb_target_group.modern.arn
        weight = var.modern_traffic_weight  # Start at 0
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Database Migration with DMS

Use AWS DMS for database migration managed through Terraform:

```hcl
# migration/database/dms.tf
# Database Migration Service for Oracle to PostgreSQL

resource "aws_dms_replication_instance" "migration" {
  replication_instance_id    = "order-processing-migration"
  replication_instance_class = "dms.r5.2xlarge"
  allocated_storage          = 200
  multi_az                   = true

  vpc_security_group_ids = [aws_security_group.dms.id]
  replication_subnet_group_id = aws_dms_replication_subnet_group.migration.id
}

resource "aws_dms_endpoint" "source_oracle" {
  endpoint_id   = "source-oracle"
  endpoint_type = "source"
  engine_name   = "oracle"
  server_name   = var.oracle_server
  port          = 1521
  database_name = var.oracle_database
  username      = var.oracle_username
  password      = var.oracle_password
}

resource "aws_dms_endpoint" "target_postgres" {
  endpoint_id   = "target-postgres"
  endpoint_type = "target"
  engine_name   = "postgres"
  server_name   = aws_db_instance.main.address
  port          = 5432
  database_name = "order_processing"
  username      = var.postgres_username
  password      = var.postgres_password
}

resource "aws_dms_replication_task" "migration" {
  replication_task_id      = "order-processing-full-load"
  migration_type           = "full-load-and-cdc"
  replication_instance_arn = aws_dms_replication_instance.migration.replication_instance_arn
  source_endpoint_arn      = aws_dms_endpoint.source_oracle.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.target_postgres.endpoint_arn

  table_mappings = jsonencode({
    rules = [{
      rule-type = "selection"
      rule-id   = "1"
      rule-name = "all-tables"
      rule-action = "include"
      object-locator = {
        schema-name = "ORDER_SCHEMA"
        table-name  = "%"
      }
    }]
  })
}
```

## Best Practices

Never do a big-bang migration. Always run parallel environments and migrate traffic gradually.

Validate data integrity at every step. Compare data between legacy and modern systems continuously during migration.

Keep the rollback path open. Until the modern environment is proven stable, maintain the ability to route traffic back to the legacy system.

Document everything. Legacy systems often have undocumented behaviors. Capture what you learn during migration.

Plan for a longer timeline than you think you need. Legacy migrations always take longer than estimated.

## Conclusion

Using Terraform for legacy application migration provides structure and repeatability to what is inherently a complex process. By defining the target infrastructure as code, building parallel environments, and using gradual traffic shifting, you can migrate legacy applications safely while maintaining service availability throughout the process.
