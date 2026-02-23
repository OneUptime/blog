# How to Use Sentinel for Database Security Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Database, Security, Policy as Code, AWS, Azure, GCP, Compliance

Description: Enforce database security standards automatically with Sentinel policies for RDS, Azure SQL, Cloud SQL, and other managed database services in Terraform.

---

Databases hold your most valuable data, and a single misconfiguration can expose customer records, financial data, or credentials to the internet. Manual reviews catch some of these mistakes, but they are not reliable at scale. A tired reviewer at 4 PM on a Friday might approve an RDS instance that is publicly accessible without noticing.

Sentinel lets you codify your database security requirements into policies that run automatically on every Terraform plan. If someone tries to create an unencrypted database or one that is open to the public internet, the policy blocks the deployment before any damage is done.

This post covers practical Sentinel policies for the most common database security requirements across AWS RDS, Azure SQL, and Google Cloud SQL.

## The Core Database Security Checks

Before writing policies, let us establish what "secure database configuration" means in practice. Most organizations enforce some combination of these rules:

- Databases must not be publicly accessible
- Storage encryption must be enabled
- Encryption in transit (SSL/TLS) must be enforced
- Automated backups must be configured with sufficient retention
- Deletion protection must be enabled for production databases
- Database instances must be deployed in private subnets
- Multi-AZ deployment is required for production workloads

Each of these translates directly into a Sentinel policy.

## Policy 1: Block Publicly Accessible RDS Instances

This is the single most important database security policy. A publicly accessible RDS instance combined with weak credentials is one of the most common causes of data breaches.

```python
# deny-public-rds.sentinel
# Prevent RDS instances from being publicly accessible

import "tfplan/v2" as tfplan

# Find all RDS instances being created or updated
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

# Check that none are publicly accessible
violations = []
for rds_instances as address, instance {
    publicly_accessible = instance.change.after.publicly_accessible else false
    if publicly_accessible is true {
        append(violations, address)
    }
}

if length(violations) > 0 {
    print("RDS instances must not be publicly accessible:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

The same logic applies to Aurora clusters:

```python
# deny-public-aurora.sentinel
# Prevent Aurora clusters from being publicly accessible

import "tfplan/v2" as tfplan

# Find Aurora cluster instances
aurora_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_rds_cluster_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for aurora_instances as address, instance {
    if instance.change.after.publicly_accessible else false {
        append(violations, address)
    }
}

if length(violations) > 0 {
    print("Aurora instances must not be publicly accessible:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 2: Require Encryption at Rest

Every database should have storage encryption enabled. This is non-negotiable for any environment handling sensitive data.

```python
# require-rds-encryption.sentinel
# Enforce encryption at rest for all RDS instances

import "tfplan/v2" as tfplan

# Get all RDS instances and Aurora clusters
rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

aurora_clusters = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_rds_cluster" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []

# Check RDS instances
for rds_instances as address, instance {
    encrypted = instance.change.after.storage_encrypted else false
    if encrypted is not true {
        append(violations, address + " - storage_encrypted must be true")
    }
}

# Check Aurora clusters
for aurora_clusters as address, cluster {
    encrypted = cluster.change.after.storage_encrypted else false
    if encrypted is not true {
        append(violations, address + " - storage_encrypted must be true")
    }
}

if length(violations) > 0 {
    print("Database encryption violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 3: Enforce Backup Retention

Backups are your safety net. This policy ensures automated backups are enabled with a minimum retention period:

```python
# require-rds-backups.sentinel
# Enforce minimum backup retention for RDS instances

import "tfplan/v2" as tfplan

# Minimum number of days to retain backups
min_backup_retention = 7

rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for rds_instances as address, instance {
    retention = instance.change.after.backup_retention_period else 0
    if retention < min_backup_retention {
        append(violations, address +
            " - backup_retention_period is " + string(retention) +
            ", minimum is " + string(min_backup_retention))
    }
}

if length(violations) > 0 {
    print("Backup retention violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 4: Require Deletion Protection for Production

Accidental database deletion is a nightmare scenario. This policy ensures deletion protection is enabled for databases tagged as production:

```python
# require-deletion-protection.sentinel
# Require deletion protection on production databases

import "tfplan/v2" as tfplan

rds_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_db_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []
for rds_instances as address, instance {
    tags = instance.change.after.tags else {}
    environment = tags["environment"] else "unknown"

    # Only enforce for production databases
    if environment is "production" or environment is "prod" {
        deletion_protection = instance.change.after.deletion_protection else false
        if deletion_protection is not true {
            append(violations, address +
                " - production databases must have deletion_protection enabled")
        }
    }
}

if length(violations) > 0 {
    print("Deletion protection violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 5: Azure SQL Security Requirements

If you are using Azure, the resource types are different but the security principles are the same:

```python
# azure-sql-security.sentinel
# Enforce security settings on Azure SQL databases

import "tfplan/v2" as tfplan

# Check Azure SQL servers
sql_servers = filter tfplan.resource_changes as _, rc {
    rc.type is "azurerm_mssql_server" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []

for sql_servers as address, server {
    # Require minimum TLS version 1.2
    tls_version = server.change.after.minimum_tls_version else "Disabled"
    if tls_version is not "1.2" {
        append(violations, address +
            " - minimum_tls_version must be 1.2, got: " + tls_version)
    }

    # Require Azure AD authentication
    azuread_admin = server.change.after.azuread_administrator else null
    if azuread_admin is null {
        append(violations, address +
            " - Azure AD administrator must be configured")
    }

    # Block public network access
    public_access = server.change.after.public_network_access_enabled else true
    if public_access is true {
        append(violations, address +
            " - public_network_access_enabled must be false")
    }
}

if length(violations) > 0 {
    print("Azure SQL security violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Policy 6: Google Cloud SQL Security

For GCP Cloud SQL instances, enforce similar security standards:

```python
# gcp-cloudsql-security.sentinel
# Enforce security settings on Google Cloud SQL instances

import "tfplan/v2" as tfplan

cloudsql_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "google_sql_database_instance" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or
     rc.change.actions contains "update")
}

violations = []

for cloudsql_instances as address, instance {
    settings = instance.change.after.settings else []

    if length(settings) > 0 {
        setting = settings[0]

        # Check that IP configuration does not allow public access
        ip_config = setting.ip_configuration else []
        if length(ip_config) > 0 {
            ipv4_enabled = ip_config[0].ipv4_enabled else true
            if ipv4_enabled is true {
                # Only flag if there is no private network configured
                private_network = ip_config[0].private_network else ""
                if private_network is "" {
                    append(violations, address +
                        " - must use private IP (configure private_network)")
                }
            }

            # Require SSL
            require_ssl = ip_config[0].require_ssl else false
            if require_ssl is not true {
                append(violations, address +
                    " - require_ssl must be true")
            }
        }

        # Check backup configuration
        backup_config = setting.backup_configuration else []
        if length(backup_config) is 0 {
            append(violations, address + " - backup must be configured")
        } else {
            enabled = backup_config[0].enabled else false
            if enabled is not true {
                append(violations, address + " - backup must be enabled")
            }
        }
    }
}

if length(violations) > 0 {
    print("Cloud SQL security violations:")
    for violations as v {
        print("  - " + v)
    }
}

main = rule {
    length(violations) is 0
}
```

## Combining Policies in a Policy Set

Organize your database security policies into a dedicated policy set:

```hcl
# sentinel.hcl - Database security policy set

policy "deny-public-rds" {
    source            = "./deny-public-rds.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "require-rds-encryption" {
    source            = "./require-rds-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "require-rds-backups" {
    source            = "./require-rds-backups.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "require-deletion-protection" {
    source            = "./require-deletion-protection.sentinel"
    enforcement_level = "soft-mandatory"
}
```

## Testing Your Database Policies

Write test cases with realistic mock data:

```python
# testdata/public-rds.sentinel
# Mock data simulating a publicly accessible RDS instance

resource_changes = {
    "aws_db_instance.main": {
        "type": "aws_db_instance",
        "mode": "managed",
        "change": {
            "actions": ["create"],
            "after": {
                "publicly_accessible": true,
                "storage_encrypted": false,
                "instance_class": "db.t3.micro",
                "tags": {
                    "environment": "production",
                },
            },
        },
    },
}
```

Run the tests:

```bash
# Test all database security policies
sentinel test -verbose
```

## Conclusion

Database security policies in Sentinel give you a reliable, automated safety net against misconfigurations. Every database that gets created or modified through Terraform goes through these checks, and the ones that do not meet your standards get blocked before they ever reach your cloud environment. Start with the basics - no public access and encryption at rest - and build from there as your security requirements evolve.

For more Sentinel policy patterns, check out our guide on [Sentinel for IAM policy governance](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-for-iam-policy-governance/view).
