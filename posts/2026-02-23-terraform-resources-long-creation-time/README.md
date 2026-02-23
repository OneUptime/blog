# How to Handle Resources That Take Long to Create in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Timeouts, Resource Management, Infrastructure as Code, Performance

Description: Learn strategies for handling long-running resource creation in Terraform, including custom timeouts, retry logic, and structuring configurations to work around slow provisioning.

---

Some cloud resources take a long time to create. An RDS instance can take 10-20 minutes. A CloudFront distribution might need 15-30 minutes. An EKS cluster can take 15 minutes or more. Terraform needs to wait for these resources to become available before moving on to dependent resources, and the default timeout might not be enough. This guide covers how to configure timeouts, structure your workflow around slow resources, and avoid common pitfalls.

## Default Timeouts and How to Change Them

Most Terraform providers define default timeouts for create, update, and delete operations. When a resource exceeds its timeout, Terraform marks the operation as failed even if the resource is still provisioning in the background.

### The timeouts Block

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-database"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r5.2xlarge"
  allocated_storage = 500

  # Custom timeouts for long-running operations
  timeouts {
    create = "60m"   # Allow up to 60 minutes for creation
    update = "90m"   # Allow up to 90 minutes for updates
    delete = "60m"   # Allow up to 60 minutes for deletion
  }
}
```

### Common Resources That Need Extended Timeouts

```hcl
# RDS instances - especially large or encrypted ones
resource "aws_db_instance" "main" {
  identifier     = "production"
  engine         = "postgres"
  instance_class = "db.r5.4xlarge"

  timeouts {
    create = "60m"
    update = "90m"
    delete = "60m"
  }
}

# EKS clusters
resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.eks.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }

  timeouts {
    create = "30m"
    update = "60m"
    delete = "30m"
  }
}

# CloudFront distributions
resource "aws_cloudfront_distribution" "cdn" {
  # ... distribution config

  timeouts {
    create = "45m"
    update = "45m"
    delete = "30m"
  }
}

# ElastiCache clusters
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "production-redis"
  engine               = "redis"
  node_type            = "cache.r5.large"
  num_cache_nodes      = 1

  timeouts {
    create = "40m"
    update = "40m"
    delete = "30m"
  }
}

# Elasticsearch / OpenSearch domains
resource "aws_opensearch_domain" "logs" {
  domain_name    = "production-logs"
  engine_version = "OpenSearch_2.11"

  timeouts {
    create = "60m"
    update = "120m"  # Blue/green deployments can be very slow
    delete = "60m"
  }
}
```

## Timeout Format

Terraform accepts several time formats:

```hcl
timeouts {
  create = "60m"      # 60 minutes
  create = "1h"       # 1 hour
  create = "1h30m"    # 1 hour 30 minutes
  create = "5400s"    # 5400 seconds
}
```

## Structuring Configurations for Slow Resources

### Create Slow Resources First

Structure your dependency graph so slow resources start creating as early as possible:

```hcl
# These can all start creating in parallel
resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "postgres"
  instance_class = "db.r5.large"
  # No dependency on other resources - starts immediately
}

resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.eks.arn
  vpc_config {
    subnet_ids = var.subnet_ids
  }
  # Also starts immediately (after IAM role)
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id      = "production-redis"
  engine          = "redis"
  node_type       = "cache.r5.large"
  num_cache_nodes = 1
  # Also starts immediately
}

# Faster resources that depend on the slow ones
resource "aws_db_subnet_group" "main" {
  # This is fast - finishes while DB is still creating
  name       = "main"
  subnet_ids = var.private_subnet_ids
}
```

### Use Targeted Applies for Bootstrapping

For initial setup, create slow resources first in a targeted apply:

```bash
# Step 1: Create the slow resources (runs in parallel with each other)
terraform apply \
  -target=aws_db_instance.main \
  -target=aws_eks_cluster.main \
  -target=aws_elasticache_cluster.redis

# Step 2: Create everything else
terraform apply
```

### Separate Slow Resources into Different State Files

For very slow resources that rarely change, consider putting them in their own Terraform configuration:

```
# infrastructure/
#   foundation/     # Slow resources that rarely change
#     main.tf       # VPC, RDS, EKS, ElastiCache
#   application/    # Fast resources that change often
#     main.tf       # ECS services, Lambda functions, etc.
```

This way, you only wait for the slow resources when you actually need to modify them.

## Handling Timeout Errors

When a timeout occurs, Terraform shows an error like:

```
Error: error waiting for RDS DB Instance (production-database) creation: timeout while waiting for state to become 'available'
```

### The Resource Might Still Be Creating

A timeout error does not mean the resource failed. It might still be provisioning in the background. Check the cloud provider console.

```bash
# Check the resource status in AWS
aws rds describe-db-instances --db-instance-identifier production-database \
  --query 'DBInstances[0].DBInstanceStatus'

# If it shows "creating" or "available", the resource exists
```

### Recovering from Timeout Errors

If the resource was created successfully but Terraform timed out:

```bash
# Option 1: Import the resource into state
terraform import aws_db_instance.main production-database

# Option 2: Increase the timeout and apply again
# Update your .tf file with a longer timeout, then:
terraform apply
# Terraform will detect the existing resource and update state
```

### If the Resource Actually Failed

If the resource failed to create (not just timed out), you may need to clean up:

```bash
# Remove from state
terraform state rm aws_db_instance.main

# Clean up in AWS if partially created
aws rds delete-db-instance --db-instance-identifier production-database --skip-final-snapshot
```

## Parallelism Settings

Terraform creates resources in parallel by default (up to 10 at a time). For configurations with many slow resources, this is usually fine. But if you are hitting API rate limits:

```bash
# Reduce parallelism to avoid rate limiting
terraform apply -parallelism=5

# Increase parallelism for lots of independent resources
terraform apply -parallelism=20
```

Lower parallelism means fewer concurrent API calls but potentially longer total execution time.

## Working with Provider Waiters

Many Terraform providers use "waiters" that poll the cloud API until a resource reaches a desired state. You cannot configure the polling interval directly, but understanding the behavior helps with debugging.

The typical pattern is:
1. Terraform sends the create API call
2. The provider starts polling (every 30-60 seconds typically)
3. Each poll checks if the resource is in the target state
4. If the state is reached, Terraform proceeds
5. If the timeout is exceeded, Terraform returns an error

```hcl
# The timeouts block controls how long the waiter runs
resource "aws_rds_cluster" "main" {
  cluster_identifier = "production"
  engine             = "aurora-postgresql"
  master_username    = "admin"
  master_password    = var.db_password

  timeouts {
    # The waiter will poll for up to 60 minutes
    create = "60m"
  }
}
```

## Using null_resource for Custom Waiting

For resources that need custom wait logic:

```hcl
resource "aws_db_instance" "main" {
  identifier     = "production"
  engine         = "postgres"
  instance_class = "db.r5.large"
}

# Wait for the database to be fully ready (not just "available")
resource "null_resource" "db_ready" {
  depends_on = [aws_db_instance.main]

  provisioner "local-exec" {
    command = <<-EOT
      # Wait for the database to accept connections
      for i in $(seq 1 30); do
        if pg_isready -h ${aws_db_instance.main.address} -p 5432; then
          echo "Database is ready"
          exit 0
        fi
        echo "Waiting for database... attempt $i"
        sleep 10
      done
      echo "Database did not become ready in time"
      exit 1
    EOT
  }
}

# Resources that need the DB to be fully ready
resource "null_resource" "run_migrations" {
  depends_on = [null_resource.db_ready]

  provisioner "local-exec" {
    command = "./run-migrations.sh"
  }
}
```

## CI/CD Considerations

In CI/CD pipelines, long-running Terraform applies can cause problems:

```yaml
# GitHub Actions example with extended timeout
jobs:
  terraform:
    runs-on: ubuntu-latest
    timeout-minutes: 120  # Extend job timeout for slow resources
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Apply
        run: terraform apply -auto-approve
        timeout-minutes: 90  # Step-level timeout
```

For Jenkins:

```groovy
pipeline {
    options {
        timeout(time: 2, unit: 'HOURS')
    }
    stages {
        stage('Terraform Apply') {
            steps {
                sh 'terraform apply -auto-approve'
            }
        }
    }
}
```

## Conclusion

Long-running resource creation is an unavoidable part of cloud infrastructure. The main tools for handling it in Terraform are custom timeouts, strategic configuration structure, and targeted applies. Set generous timeouts for resources like RDS instances, EKS clusters, and CloudFront distributions. Structure your configuration so slow resources start creating as early as possible in the dependency graph. Consider separating rarely-changed slow resources into their own state files. And when timeouts do occur, remember that the resource might still be creating successfully - check the cloud provider console before panicking.

For another common timing challenge, see our guide on [how to handle eventual consistency issues with Terraform resources](https://oneuptime.com/blog/post/2026-02-23-terraform-eventual-consistency-issues/view).
