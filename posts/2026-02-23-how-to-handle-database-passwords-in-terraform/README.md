# How to Handle Database Passwords in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Database, Passwords, Security, IaC, DevOps

Description: A practical guide to securely managing database passwords in Terraform, covering password generation, secret store integration, rotation strategies, and patterns for RDS, Azure SQL, and Cloud SQL.

---

Database passwords are one of the most common secrets that Terraform needs to manage. Every time you create an RDS instance, Azure SQL database, or Cloud SQL instance, you need to provide an administrator password. Getting this right means balancing security, convenience, and operational reliability. This guide covers the patterns that work well in practice.

## The Wrong Way: Hardcoded Passwords

Let us start with what not to do:

```hcl
# NEVER do this
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"
  password       = "SuperSecret123!"  # Hardcoded - terrible idea
}
```

This puts the password in your source code, state file, version control history, and plan output. If anyone has access to any of these, they have your database password.

## Pattern 1: Generate and Store

Generate a random password with Terraform and store it in a secret manager:

```hcl
# Generate a strong random password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"

  # Avoid characters that cause issues in connection strings
  # The override_special parameter limits which special characters are used
}

# Create the database with the generated password
resource "aws_db_instance" "main" {
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  db_name              = "myapp"
  username             = "admin"
  password             = random_password.database.result
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = false

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
}

# Store the password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "production/database/credentials"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id

  secret_string = jsonencode({
    username = "admin"
    password = random_password.database.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = "myapp"
    engine   = "postgres"
  })
}
```

**Pros**: Simple, everything managed in one place, applications can read from Secrets Manager.
**Cons**: Password is in the Terraform state file, initial password is set at creation time.

## Pattern 2: Pre-Create in Secret Manager

Create the password in the secret manager before Terraform runs, then reference it:

```bash
# Create the secret outside of Terraform (manually or via a separate process)
aws secretsmanager create-secret \
  --name "production/database/password" \
  --secret-string "$(openssl rand -base64 32)"
```

```hcl
# Read the pre-created secret
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  db_name        = "myapp"
  username       = "admin"
  password       = data.aws_secretsmanager_secret_version.db_password.secret_string

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
}
```

**Pros**: Password never appears in Terraform configurations, separation of concerns.
**Cons**: Requires a separate process to create secrets, password still in state after apply.

## Pattern 3: Ignore Password After Creation

Create the database with an initial password, then ignore future changes so password rotation happens outside of Terraform:

```hcl
resource "random_password" "initial_db_password" {
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  db_name        = "myapp"
  username       = "admin"
  password       = random_password.initial_db_password.result

  lifecycle {
    ignore_changes = [password]  # Terraform ignores password after initial creation
  }
}
```

Now you can rotate the password outside of Terraform without causing drift:

```bash
# Rotate the password via AWS CLI
NEW_PASSWORD=$(openssl rand -base64 32)

# Update the RDS password
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately

# Update the secret in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id production/database/password \
  --secret-string "$NEW_PASSWORD"
```

**Pros**: Clean separation between initial provisioning and ongoing management, easy rotation.
**Cons**: Terraform does not track the current password.

## Pattern 4: Automatic Rotation with Secrets Manager

AWS Secrets Manager can automatically rotate RDS passwords:

```hcl
# Create the RDS instance
resource "aws_db_instance" "main" {
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "db.t3.medium"
  db_name                 = "myapp"
  username                = "admin"
  password                = random_password.database.result
  manage_master_user_password = true  # AWS manages the password in Secrets Manager

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  lifecycle {
    ignore_changes = [password]
  }
}

# AWS automatically creates a secret and rotates it
# Access the secret ARN from the RDS instance
output "master_password_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn
}
```

For older RDS versions without `manage_master_user_password`:

```hcl
# Set up automatic rotation
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_password.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Cloud-Specific Patterns

### Azure SQL

```hcl
resource "random_password" "sql_admin" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_mssql_server" "main" {
  name                         = "sql-myapp-prod"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql_admin.result
}

# Store in Key Vault
resource "azurerm_key_vault_secret" "sql_password" {
  name         = "sql-admin-password"
  value        = random_password.sql_admin.result
  key_vault_id = azurerm_key_vault.main.id
}
```

### Google Cloud SQL

```hcl
resource "random_password" "sql_admin" {
  length  = 32
  special = false  # Cloud SQL passwords should not have special characters
}

resource "google_sql_database_instance" "main" {
  name             = "myapp-prod"
  database_version = "POSTGRES_15"
  region           = "us-east1"

  settings {
    tier = "db-custom-2-8192"
  }
}

resource "google_sql_user" "admin" {
  name     = "admin"
  instance = google_sql_database_instance.main.name
  password = random_password.sql_admin.result
}

# Store in Secret Manager
resource "google_secret_manager_secret" "sql_password" {
  secret_id = "sql-admin-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sql_password" {
  secret      = google_secret_manager_secret.sql_password.id
  secret_data = random_password.sql_admin.result
}
```

## Application Access Patterns

Once the database is created, applications need to access the credentials. Here are common patterns:

### ECS with Secrets Manager

```hcl
resource "aws_ecs_task_definition" "app" {
  family = "myapp"

  container_definitions = jsonencode([{
    name  = "app"
    image = "my-app:latest"
    secrets = [
      {
        name      = "DB_PASSWORD"
        valueFrom = "${aws_secretsmanager_secret.db_password.arn}:password::"
      },
      {
        name      = "DB_USERNAME"
        valueFrom = "${aws_secretsmanager_secret.db_password.arn}:username::"
      }
    ]
  }])

  execution_role_arn = aws_iam_role.ecs_execution.arn
}
```

### Kubernetes Secret from Terraform

```hcl
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "production"
  }

  data = {
    username = "admin"
    password = random_password.database.result
    host     = aws_db_instance.main.address
    port     = tostring(aws_db_instance.main.port)
  }

  type = "Opaque"
}
```

## Password Requirements and Gotchas

Different database engines have different password requirements:

```hcl
# PostgreSQL (RDS) - most characters allowed, max 128 chars
resource "random_password" "postgres" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# MySQL (RDS) - cannot contain /, @, ", or spaces
resource "random_password" "mysql" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}<>:?"
}

# SQL Server - needs complexity (upper, lower, number, special)
resource "random_password" "mssql" {
  length           = 32
  special          = true
  upper            = true
  lower            = true
  numeric          = true
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
  override_special = "!#$%&*-_=+"
}

# Cloud SQL PostgreSQL - no special characters recommended
resource "random_password" "cloudsql" {
  length  = 32
  special = false
}
```

## Monitoring Your Databases

After setting up database credentials securely, make sure the databases themselves are healthy. [OneUptime](https://oneuptime.com) can monitor your database endpoints, alerting you when connection issues or performance degradation occurs.

## Conclusion

The best pattern for database passwords in Terraform depends on your operational maturity. Start with "generate and store" for simplicity, move to "ignore after creation" when you need rotation, and adopt automatic rotation for production workloads. Regardless of the pattern, always store passwords in a secret manager and encrypt your Terraform state.

For related security topics, see our guides on [handling API keys in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-api-keys-in-terraform/view) and [handling sensitive variables securely](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-sensitive-variables-in-terraform-securely/view).
