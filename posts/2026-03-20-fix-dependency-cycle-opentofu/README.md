# How to Fix Dependency Cycle Errors in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Dependency Cycles, Graph, Error, Infrastructure as Code

Description: Learn how to identify and resolve circular dependency errors in OpenTofu by understanding the dependency graph and restructuring resource references.

## Introduction

OpenTofu builds a directed acyclic graph (DAG) of your resources before applying changes. If two resources reference each other in a cycle (A depends on B, B depends on A), OpenTofu cannot determine which to create first and reports a cycle error.

## Error Message

```hcl
Error: Cycle: aws_security_group.app, aws_security_group.db
  OpenTofu detected a configuration dependency cycle among the following resources:
  - aws_security_group.app
  - aws_security_group.db
```

## Visualizing the Cycle

Use `tofu graph` to visualize the dependency graph and locate the cycle:

```bash
# Generate the dependency graph and highlight cycle edges

tofu graph -draw-cycles | dot -Tsvg -o graph.svg

# Or inspect the DOT output in the terminal
tofu graph -draw-cycles | grep -A 5 "security_group"
```

## Common Causes

### Cause 1: Circular Security Group References

This is the most common cycle - two security groups each referencing the other in ingress rules:

```hcl
# WRONG - creates a cycle
resource "aws_security_group" "app" {
  name = "app-sg"
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]  # References db
  }
}

resource "aws_security_group" "db" {
  name = "db-sg"
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]  # References app - CYCLE!
  }
}
```

### Fix: Use aws_vpc_security_group_ingress_rule Separately

```hcl
# Create the security groups without inline rules
resource "aws_security_group" "app" {
  name        = "app-sg"
  description = "Application security group"
  vpc_id      = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  name        = "db-sg"
  description = "Database security group"
  vpc_id      = aws_vpc.main.id
}

# Add the cross-references as separate rule resources
resource "aws_vpc_security_group_ingress_rule" "app_from_db" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.db.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
}
```

## Cause 2: Module Circular Imports

```hcl
# Module A calls Module B, Module B calls Module A - not allowed
# Fix: extract shared resources into a third module
module "shared" { source = "./modules/shared" }
module "module_a" {
  source     = "./modules/module_a"
  shared_id  = module.shared.id
}
module "module_b" {
  source     = "./modules/module_b"
  shared_id  = module.shared.id
}
```

## Cause 3: Unnecessary depends_on

```hcl
# WRONG - explicit depends_on creating a cycle
resource "aws_iam_role" "app" {
  name = "app-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  depends_on = [aws_iam_role_policy.app]  # Policy already depends on role
}

resource "aws_iam_role_policy" "app" {
  name = "app-policy"
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:ListAllMyBuckets"]
      Resource = "*"
    }]
  })
}
```

```hcl
# CORRECT - remove the unnecessary depends_on
resource "aws_iam_role" "app" {
  name = "app-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "app" {
  name = "app-policy"
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:ListAllMyBuckets"]
      Resource = "*"
    }]
  })
}
```

## Conclusion

Dependency cycles are solved by breaking the circular reference. For security groups, use separate `aws_vpc_security_group_ingress_rule` or `aws_vpc_security_group_egress_rule` resources instead of inline rules. For modules, extract shared resources into a third module that both modules depend on. Remove unnecessary `depends_on` that creates artificial cycles.
