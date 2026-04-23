# How to Handle Resources That Take a Long Time to Create in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Timeout, AWS, RDS, Infrastructure as Code, Best Practice

Description: Learn how to configure timeouts, use depends_on, and implement retry logic for OpenTofu resources that take a long time to provision.

## Introduction

Some AWS resources like RDS instances, EKS clusters, and Direct Connect attachments can take 15-60 minutes to provision. Without proper timeout and dependency configuration, OpenTofu may give up or miss dependencies it cannot infer from resource references. This guide covers patterns for handling slow resources.

## Setting Custom Timeouts

Some resource types support `timeouts` blocks to override defaults.

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.r6g.xlarge"
  allocated_storage = 100

  username = var.db_username
  password = var.db_password

  multi_az              = true
  db_subnet_group_name  = aws_db_subnet_group.main.name
  # Example only; use final_snapshot_identifier for production deletes
  skip_final_snapshot   = true

  # Extend timeouts for large/multi-AZ instances
  timeouts {
    create = "60m"  # default is 40m
    update = "80m"  # major upgrades can take longer
    delete = "60m"
  }

  tags = {
    ManagedBy = "opentofu"
  }
}
```

## EKS Cluster Timeouts

```hcl
resource "aws_eks_cluster" "main" {
  name     = "${var.app_name}-cluster"
  role_arn = aws_iam_role.eks.arn
  version  = "1.35"

  vpc_config {
    subnet_ids = var.private_subnet_ids
  }

  timeouts {
    create = "45m"
    delete = "30m"
    update = "90m"  # upgrades take longer
  }
}
```

## Using depends_on to Sequence Slow Resources

Some dependencies are not visible from resource references. Use `depends_on` to enforce ordering for those hidden dependencies.

```hcl
# EKS node IAM role policies must exist before the node group

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "main"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  # Wait for IAM permissions that the node group needs during creation and deletion
  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]

  timeouts {
    create = "90m"
    update = "90m"
    delete = "90m"
  }
}
```

## Polling with terraform_data

When you need a readiness check that the provider does not model, use `terraform_data` with a polling loop as a last-resort option.

```hcl
resource "terraform_data" "wait_for_endpoint" {
  triggers_replace = [
    aws_db_instance.main.endpoint,
  ]

  provisioner "local-exec" {
    command = <<-SCRIPT
      # Poll until the endpoint is accepting connections
      MAX_ATTEMPTS=30
      ATTEMPT=0
      until pg_isready -h ${aws_db_instance.main.address} -p 5432 -U ${var.db_username}; do
        ATTEMPT=$((ATTEMPT + 1))
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
          echo "Database did not become ready after $MAX_ATTEMPTS attempts"
          exit 1
        fi
        echo "Waiting for database... attempt $ATTEMPT/$MAX_ATTEMPTS"
        sleep 10
      done
      echo "Database is ready!"
    SCRIPT
  }
}

# Resources that need the DB to be fully ready wait on this terraform_data resource
resource "terraform_data" "run_migrations" {
  triggers_replace = [
    terraform_data.wait_for_endpoint.id,
  ]

  provisioner "local-exec" {
    command = "flyway -url=jdbc:postgresql://${aws_db_instance.main.endpoint}/${var.db_name} migrate"
  }
}
```

## Parallel Creation for Independence

When resources don't depend on each other, OpenTofu creates them in parallel by default. Structure your configuration to maximize parallelism.

```hcl
# These will be created in parallel since they're independent
resource "aws_db_instance" "main" { ... }
resource "aws_elasticache_replication_group" "cache" { ... }
resource "aws_opensearch_domain" "search" { ... }

# This waits for all three
resource "terraform_data" "all_datastores_ready" {
  depends_on = [
    aws_db_instance.main,
    aws_elasticache_replication_group.cache,
    aws_opensearch_domain.search,
  ]
}
```

## Summary

Handling slow resources in OpenTofu requires extending timeout blocks, using `depends_on` for hidden dependencies, and polling with `terraform_data` for resources without built-in readiness checks. Parallel independent resource creation reduces total wait time for complex stacks.
