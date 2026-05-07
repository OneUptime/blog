# How to Avoid Circular Dependencies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Dependencies, Best Practice, Troubleshooting, Infrastructure as Code

Description: Learn how to identify, diagnose, and fix circular dependencies in OpenTofu configurations.

## Introduction

A circular dependency occurs when Resource A depends on Resource B, and Resource B depends on Resource A. OpenTofu cannot determine a valid dependency order and will fail with a cycle error. Understanding how to restructure configurations to eliminate cycles is a practical skill for infrastructure engineers.

## How Circular Dependencies Occur

The most common pattern is mutual security group references.

```hcl
# This creates a cycle: sg_a → sg_b → sg_a

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.load_balancer.id]  # depends on lb_sg
  }
}

resource "aws_security_group" "load_balancer" {
  name   = "lb-sg"
  vpc_id = aws_vpc.main.id

  egress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]  # depends on app_sg → CYCLE
  }
}
```

## Diagnosing the Cycle

```bash
# OpenTofu will show the cycle when you run plan
tofu plan

# Error output will include an "Error: Cycle" line

# If GraphViz is installed, render the graph and highlight cyclic edges
tofu graph -draw-cycles | dot -Tsvg > graph.svg
```

## Fix: Use Separate Security Group Rules

Break the cycle by separating security group creation from rule attachment using dedicated rule resources.

```hcl
# Create security groups without inline rules
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id
  # No inline ingress/egress rules
}

resource "aws_security_group" "load_balancer" {
  name   = "lb-sg"
  vpc_id = aws_vpc.main.id
  # No inline ingress/egress rules
}

# Add rules separately - no cycle because both SGs exist first
resource "aws_vpc_security_group_ingress_rule" "app_from_lb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.load_balancer.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "lb_to_app" {
  security_group_id            = aws_security_group.load_balancer.id
  referenced_security_group_id = aws_security_group.app.id
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
}
```

## Another Common Cycle: Module Outputs

Cycles can occur between modules when they reference each other's outputs.

```hcl
# BAD: Module A uses module B's output, Module B uses Module A's output
module "app" {
  source         = "./modules/app"
  security_group = module.network.app_security_group_id
}

module "network" {
  source        = "./modules/network"
  app_subnet_id = module.app.subnet_id  # CYCLE
}

# FIX: Restructure so one module doesn't depend on the other
module "network" {
  source = "./modules/network"
  # network has no dependency on app module
}

module "app" {
  source         = "./modules/app"
  subnet_id      = module.network.private_subnet_id
  security_group = module.network.app_security_group_id
}
```

## Avoiding depends_on Cycles

Explicit `depends_on` can also create cycles.

```hcl
# BAD: Explicit cycle via depends_on
resource "terraform_data" "a" {
  input      = "a"
  depends_on = [terraform_data.b]
}

resource "terraform_data" "b" {
  input      = "b"
  depends_on = [terraform_data.a]  # CYCLE
}

# FIX: Remove the unnecessary depends_on and use an expression reference
# when one resource actually needs another resource's value
resource "terraform_data" "a" {
  input = "a"
}

resource "terraform_data" "b" {
  input = terraform_data.a.output  # implicit dependency
}
```

## Summary

Circular dependencies in OpenTofu are resolved by restructuring how resources reference each other. The most common fix is separating resource creation from relationship configuration - create security groups first, then add rules separately with dedicated rule resources. For module cycles, ensure data flows in one direction (network module → app module, never the reverse). Use `tofu graph` to visualize dependencies when diagnosing complex cycles. Avoid adding `depends_on` to resources that already have implicit dependencies through attribute references.
