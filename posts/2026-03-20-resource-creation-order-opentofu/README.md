# How to Understand Resource Creation Order in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Dependencies, Creation Order, Infrastructure as Code, DevOps

Description: A guide to understanding how OpenTofu determines the order in which resources are created, modified, and destroyed.

## Introduction

OpenTofu automatically determines the order to create, update, and destroy resources based on the dependencies between them. Understanding this dependency graph helps you write correct configurations and debug ordering issues.

## Implicit Dependencies

```hcl
# OpenTofu automatically infers creation order from references

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  # Created first (no dependencies)
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # References vpc → depends on vpc
  cidr_block = "10.0.1.0/24"
  # Created after aws_vpc.main
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id  # References subnet → depends on subnet
  # Created after aws_subnet.public (and therefore after aws_vpc.main)
}
```

## Explicit Dependencies with depends_on

```hcl
resource "aws_iam_role_policy_attachment" "lambda" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "app" {
  function_name = "my-function"
  role          = aws_iam_role.lambda.arn
  # ...

  # Explicitly wait for policy attachment even though it's not referenced
  depends_on = [aws_iam_role_policy_attachment.lambda]
}
```

## Parallel Creation

```hcl
# Resources without dependencies between them can be created in parallel

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  # No dependency on public_b
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  # No dependency on public_a
}

# Both subnets are created in parallel after aws_vpc.main is ready

```

## Dependency Graph Visualization

```bash
# Visualize the dependency graph
tofu graph | dot -Tsvg > graph.svg

# Or install graphviz and view
tofu graph | dot -Tpng > graph.png
open graph.png

# The graph shows nodes (resources) and edges (dependencies)
```

## Destruction Order

```hcl
# OpenTofu destroys resources in reverse dependency order

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  subnet_id     = aws_subnet.public.id
  ami           = var.ami_id
  instance_type = "t3.micro"
}

# Destruction order:
# 1. aws_instance.web (depends on subnet)
# 2. aws_subnet.public (depends on vpc)
# 3. aws_vpc.main (no dependencies)
```

## create_before_destroy Changes Order

```hcl
resource "aws_lb_target_group" "app" {
  name     = "app-tg-${var.version}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  lifecycle {
    create_before_destroy = true
    # New target group created BEFORE old one is destroyed
    # Can support zero-downtime replacement when both target groups can coexist
  }
}
```

## Module Dependencies

```hcl
module "vpc" {
  source = "./modules/vpc"
  # Has no dependencies in this example
}

module "eks" {
  source = "./modules/eks"
  vpc_id = module.vpc.vpc_id  # Uses an output from vpc module
  # Resources that use vpc_id wait for that output
}

module "app" {
  source          = "./modules/app"
  cluster_name    = module.eks.cluster_name
  # Resources that use cluster_name wait for that output
}
```

## Debugging Creation Order

```bash
# Run plan to see proposed changes
tofu plan

# Enable detailed logging to see dependency resolution
TF_LOG=DEBUG tofu plan 2>&1 | grep -i "depend\|order\|wait"

# Use -parallelism to control concurrent operations
tofu apply -parallelism=10  # Default is 10

# Limit parallelism for debugging
tofu apply -parallelism=1  # Strictly sequential, easier to debug
```

## Data Sources in the Graph

```hcl
data "aws_availability_zones" "available" {
  state = "available"
  # Read during refresh/plan phase
}

resource "aws_subnet" "public" {
  count             = length(data.aws_availability_zones.available.names)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  # Data source must be read before this resource can be planned
}
```

## Handling Circular Dependencies

```hcl
# PROBLEM: Circular dependency (will fail)
# resource "aws_security_group" "a" {
#   ingress {
#     security_groups = [aws_security_group.b.id]  # a depends on b
#   }
# }
# resource "aws_security_group" "b" {
#   ingress {
#     security_groups = [aws_security_group.a.id]  # b depends on a
#   }
# }

# SOLUTION: Create groups first, add ingress rules separately
resource "aws_security_group" "a" {
  name = "sg-a"
}

resource "aws_security_group" "b" {
  name = "sg-b"
}

resource "aws_vpc_security_group_ingress_rule" "a_allows_b" {
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  security_group_id            = aws_security_group.a.id
  referenced_security_group_id = aws_security_group.b.id
}

resource "aws_vpc_security_group_ingress_rule" "b_allows_a" {
  from_port                    = 8080
  to_port                      = 8080
  ip_protocol                  = "tcp"
  security_group_id            = aws_security_group.b.id
  referenced_security_group_id = aws_security_group.a.id
}
```

## Conclusion

OpenTofu builds a dependency graph from resource references and `depends_on` declarations, then processes resources in topological order. Resources without interdependencies are created in parallel, subject to the `-parallelism` limit. Understanding this ordering helps you design configurations that avoid circular dependencies, use explicit `depends_on` when implicit dependencies aren't captured by references, and debug unexpected creation or destruction sequences. Use `tofu graph` to visualize the dependency graph when troubleshooting.
