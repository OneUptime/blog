# How to Create Linode Databases with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Linode, Managed Database, PostgreSQL, Infrastructure as Code

Description: Learn how to create Linode managed database clusters with OpenTofu, including MySQL, PostgreSQL, and MongoDB configurations.

Linode Managed Databases provide fully managed PostgreSQL and MySQL clusters with automatic backups, failover, and maintenance. OpenTofu lets you define these clusters and their access controls as code.

## Creating a PostgreSQL Cluster

```hcl
resource "linode_database_postgresql_v2" "main" {
  label      = "production-postgres"
  engine_id  = "postgresql/16"
  region     = "us-east"
  type       = "g6-nanode-1"
  cluster_size = 1  # 1 for standalone, 2 or 3 for HA

  # Restrict access to specific IP addresses
  allow_list = ["203.0.113.0/24", "10.0.0.0/16"]

  updates = {
    day_of_week = 6           # 1=Monday, 7=Sunday
    duration    = 1           # Hours
    frequency   = "weekly"
    hour_of_day = 2
  }
}

output "db_host" {
  value     = linode_database_postgresql_v2.main.host_primary
  sensitive = true
}

output "db_port" {
  value = linode_database_postgresql_v2.main.port
}

output "db_password" {
  value     = linode_database_postgresql_v2.main.root_password
  sensitive = true
}
```

## Creating a MySQL Cluster

```hcl
resource "linode_database_mysql_v2" "main" {
  label        = "production-mysql"
  engine_id    = "mysql/8"
  region       = "us-east"
  type         = "g6-standard-1"
  cluster_size = 3  # 3-node HA cluster

  allow_list = ["10.0.0.0/8"]

  updates = {
    day_of_week = 7  # 1=Monday, 7=Sunday
    duration    = 2
    frequency   = "weekly"
    hour_of_day = 3
  }
}

output "mysql_host"     { value = linode_database_mysql_v2.main.host_primary; sensitive = true }
output "mysql_password" { value = linode_database_mysql_v2.main.root_password; sensitive = true }
```

## High Availability PostgreSQL

```hcl
resource "linode_database_postgresql_v2" "ha" {
  label        = "ha-postgres"
  engine_id    = "postgresql/16"
  region       = "us-east"
  type         = "g6-standard-2"
  cluster_size = 3  # Primary + 2 replicas

  allow_list = ["10.0.0.0/8"]
}

output "ha_primary" {
  value     = linode_database_postgresql_v2.ha.host_primary
  sensitive = true
}

output "ha_standby" {
  value     = linode_database_postgresql_v2.ha.host_standby
  sensitive = true
}
```

## Finding Available Engine IDs

Use the Linode CLI to discover available engine versions:

```bash
linode-cli databases engines list
```

## Updating the Allow List

Update `allow_list` to add or remove allowed IP ranges:

```hcl
resource "linode_database_postgresql_v2" "main" {
  allow_list = [
    "203.0.113.0/24",   # Office network
    "10.0.0.0/16",      # Application VPC
    "198.51.100.5/32",  # Bastion host
  ]
  # ...
}
```

## Conclusion

Linode Managed Databases reduce the operational burden of running database infrastructure. Create clusters with the appropriate `cluster_size` for your HA requirements, restrict access with `allow_list`, and schedule maintenance windows during low-traffic periods. Store the host and password outputs as sensitive values and inject them into your applications at runtime.
