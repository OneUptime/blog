# How to Choose Between Checks and Postconditions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Validation

Description: Learn when to use check blocks versus postconditions in OpenTofu, and how to combine all three validation mechanisms for comprehensive infrastructure safety.

## Introduction

OpenTofu provides three validation mechanisms: variable validation, preconditions/postconditions, and check blocks. Understanding when to use each - and specifically when check blocks are more appropriate than postconditions - helps you build the right safety net for your infrastructure.

## The Three Validation Mechanisms

| Mechanism | Timing | On Failure | References |
|---|---|---|---|
| Variable validation | Before plan | Errors, blocks plan | The variable, other variables, locals, data sources |
| Precondition | Before resource created | Errors, blocks plan | Inputs and data sources |
| Postcondition | After resource created | Errors, blocks apply | `self` (the resource's computed attributes) |
| Check block | After all resources applied | Warns only | Any resource, scoped data sources |

## When to Use Postconditions

Use postconditions when:
- Failure should **block** dependent resources from being created
- You need to verify a **specific resource's** computed attributes after creation
- A failed condition indicates the resource is in an **unusable state**

```hcl
resource "aws_lb" "app" {
  name = "acme-app"

  lifecycle {
    postcondition {
      # If this fails, no dependent resources can use the DNS name
      condition     = self.dns_name != ""
      error_message = "Load balancer was not assigned a DNS name."
    }
  }
}
```

```hcl
resource "aws_eks_cluster" "main" {
  name    = "production"
  version = var.kubernetes_version

  lifecycle {
    postcondition {
      # Cluster in FAILED state should block all node groups from being created
      condition     = self.status == "ACTIVE"
      error_message = "EKS cluster did not reach ACTIVE status: ${self.status}"
    }
  }
}
```

## When to Use Check Blocks

Use check blocks when:
- Failure should **warn** but not stop deployment
- You want **continuous validation** that runs on every plan/apply
- The assertion queries **external systems** (HTTP endpoints, DNS)
- The condition represents a **desirable** state but not a hard requirement
- You want **compliance reporting** without blocking

```hcl
check "api_reachable" {
  data "http" "health" {
    url = "https://api.acme-corp.com/health"
  }

  assert {
    # Warn if API is down, but don't block infrastructure updates
    condition     = data.http.health.status_code == 200
    error_message = "API health check failed: status ${data.http.health.status_code}"
  }
}
```

```hcl
check "naming_compliance" {
  # Non-blocking audit of naming conventions
  assert {
    condition     = startswith(aws_s3_bucket.data.bucket, "acme-")
    error_message = "Bucket '${aws_s3_bucket.data.bucket}' should start with 'acme-' per naming convention."
  }
}
```

## Decision Guide

```text
Did the resource provision correctly?
  → Postcondition (blocking)

Will downstream resources fail if this is wrong?
  → Postcondition (blocking)

Is this a compliance/audit check?
  → Check block (warning)

Does validation require querying an external system?
  → Check block with scoped data source (warning)

Should deployment proceed even if this check fails?
  → Check block (warning)

Is this an input validation before provisioning?
  → Variable validation or precondition (blocking)
```

## Combining All Three Mechanisms

```hcl
# Variable validation: catch invalid inputs early

variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-db"
  instance_class = var.db_instance_class

  lifecycle {
    # Precondition: validate inputs before provisioning
    precondition {
      condition     = var.environment == "production" ? var.db_instance_class != "db.t3.micro" : true
      error_message = "Production databases must not use db.t3.micro."
    }

    # Postcondition: verify the provisioned resource
    postcondition {
      condition     = self.status == "available"
      error_message = "Database is not available: ${self.status}"
    }
  }
}

# Check block: continuous monitoring
check "db_performance" {
  assert {
    condition     = aws_db_instance.main.allocated_storage >= 100
    error_message = "Database storage below 100 GB - consider increasing before it fills."
  }
}
```

## Real-World Example: Complete Validation Strategy

```hcl
# 1. Validate inputs before any resources
variable "min_replica_count" {
  type = number
  validation {
    condition     = var.min_replica_count >= 1
    error_message = "min_replica_count must be at least 1."
  }
}

# 2. Block provisioning if preconditions fail
resource "aws_autoscaling_group" "app" {
  min_size         = var.min_replica_count
  max_size         = var.max_replica_count

  lifecycle {
    precondition {
      condition     = var.min_replica_count <= var.max_replica_count
      error_message = "min_replica_count must be <= max_replica_count."
    }

    # 3. Verify the provisioned resource
    postcondition {
      condition     = self.desired_capacity >= self.min_size
      error_message = "ASG desired capacity is below minimum."
    }
  }
}

# 4. Continuous compliance warning
check "ha_compliance" {
  assert {
    condition     = aws_autoscaling_group.app.min_size >= 2
    error_message = "Minimum 2 replicas recommended for HA. Currently: ${aws_autoscaling_group.app.min_size}"
  }
}
```

## Conclusion

The key distinction is consequence: postconditions block, check blocks warn. Use postconditions for invariants that must be true for the resource to be usable and for downstream resources to succeed. Use check blocks for continuous compliance monitoring, external system health checks, and advisory policies that should alert without stopping deployments. Combine all three mechanisms - variable validation (earliest), preconditions (before provisioning), postconditions (after provisioning), and check blocks (ongoing) - for comprehensive infrastructure safety at every stage.
