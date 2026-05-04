# How to Create Alibaba Cloud RDS Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, RDS, Managed Database, Infrastructure as Code

Description: Learn how to create Alibaba Cloud RDS (Relational Database Service) instances with OpenTofu for managed MySQL and PostgreSQL databases.

Alibaba Cloud RDS provides managed relational database instances with automatic backups, failover, and monitoring. OpenTofu lets you create RDS instances, accounts, databases, and whitelist rules as code.

## Creating a MySQL RDS Instance

```hcl
resource "alicloud_db_instance" "mysql" {
  engine               = "MySQL"
  engine_version       = "8.0"
  instance_type        = "rds.mysql.s2.large"  # 2 vCPU, 4 GB
  instance_storage     = 20   # GB
  instance_name        = "production-mysql"
  vswitch_id           = alicloud_vswitch.private_a.id
  security_ips         = ["10.0.11.0/24"]  # Allow from private VSwitch

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "rds_connection_string" {
  value     = alicloud_db_instance.mysql.connection_string
  sensitive = true
}
```

## Creating a PostgreSQL RDS Instance

```hcl
resource "alicloud_db_instance" "postgres" {
  engine           = "PostgreSQL"
  engine_version   = "15.0"
  instance_type    = "pg.n2.2xlarge.2"
  instance_storage = 50
  instance_name    = "production-postgres"
  vswitch_id       = alicloud_vswitch.private_a.id
  security_ips     = ["10.0.0.0/8"]

  db_time_zone = "UTC"
}
```

## Creating a Database and Account

```hcl
resource "alicloud_db_database" "app" {
  instance_id   = alicloud_db_instance.mysql.id
  name          = "appdb"
  character_set = "utf8mb4"
}

resource "alicloud_rds_account" "app" {
  db_instance_id   = alicloud_db_instance.mysql.id
  account_name     = "appuser"
  account_password = var.db_password
  account_type     = "Normal"  # Normal or Super
}

resource "alicloud_db_account_privilege" "app" {
  instance_id  = alicloud_db_instance.mysql.id
  account_name = alicloud_rds_account.app.account_name
  privilege    = "ReadWrite"
  db_names     = [alicloud_db_database.app.name]
}
```

## High Availability Instance

```hcl
resource "alicloud_db_instance" "ha_mysql" {
  engine           = "MySQL"
  engine_version   = "8.0"
  instance_type    = "rds.mysql.c1.large"
  instance_storage = 50
  instance_name    = "ha-production-mysql"
  vswitch_id       = alicloud_vswitch.private_a.id
  security_ips     = ["10.0.0.0/8"]

  # Enable high availability with a standby instance
  instance_charge_type = "Postpaid"
  zone_id              = data.alicloud_zones.available.zones[0].id
  zone_id_slave_a      = data.alicloud_zones.available.zones[1].id  # Standby in zone B
}
```

## Read-Only Replica

```hcl
resource "alicloud_db_read_write_splitting_connection" "main" {
  instance_id       = alicloud_db_instance.mysql.id
  connection_prefix = "prod-rws"
  distribution_type = "Standard"
}
```

## Conclusion

Alibaba Cloud RDS in OpenTofu uses `alicloud_db_instance` for the instance, `alicloud_db_database` for individual databases, `alicloud_rds_account` for user accounts, and `alicloud_db_account_privilege` to grant database access. Enable HA by specifying a slave zone, restrict access with `security_ips`, and store connection credentials as sensitive outputs.
