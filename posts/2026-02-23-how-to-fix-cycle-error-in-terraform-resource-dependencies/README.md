# How to Fix Cycle Error in Terraform Resource Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Dependencies, Resource Graph, Infrastructure as Code

Description: How to identify and break circular dependency cycles in Terraform that prevent planning and applying your infrastructure changes.

---

You run `terraform plan` and get:

```
Error: Cycle: aws_security_group.app, aws_security_group.db,
aws_security_group_rule.app_to_db, aws_security_group_rule.db_to_app
```

Or a simpler version:

```
Error: Cycle: module.a, module.b
```

A cycle error means Terraform found a circular dependency in your resource graph. Resource A depends on Resource B, which depends on Resource A. Terraform cannot figure out which one to create first, so it gives up.

This is one of the trickier Terraform errors because the cycle is not always obvious from looking at the code. Let us go through how to find cycles, understand why they happen, and break them.

## Understanding Terraform's Dependency Graph

Terraform builds a directed acyclic graph (DAG) of all your resources. The "acyclic" part means there should be no loops. When you reference one resource from another, Terraform creates an edge in the graph:

```hcl
# This creates a dependency: subnet depends on VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  vpc_id = aws_vpc.main.id  # Terraform knows to create VPC first
}
```

A cycle happens when these dependencies form a loop.

## Visualizing the Dependency Graph

Before fixing the cycle, understand it. Terraform has a built-in tool for this:

```bash
# Generate the dependency graph
terraform graph | dot -Tpng > graph.png

# If you do not have graphviz installed
# On macOS
brew install graphviz

# On Ubuntu
sudo apt-get install graphviz

# Or just output the text format
terraform graph
```

Look for arrows that form a loop. That is your cycle.

## Common Cycle Pattern 1: Security Group Cross-References

This is the most frequent cause of cycles. Two security groups that reference each other:

```hcl
# CREATES A CYCLE
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]  # References db SG
  }
}

resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]  # References app SG - CYCLE!
  }
}
```

App SG references DB SG, and DB SG references App SG. Cycle.

**Fix**: Use separate `aws_security_group_rule` resources instead of inline rules:

```hcl
# Create the security groups without inline rules
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id
}

resource "aws_security_group" "db" {
  name   = "db-sg"
  vpc_id = aws_vpc.main.id
}

# Add rules as separate resources - no cycle!
resource "aws_security_group_rule" "app_from_db" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.db.id
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}
```

By separating the rules from the security groups, the dependency chain becomes: App SG and DB SG are created first (no dependencies on each other), then the rules reference both.

## Common Cycle Pattern 2: IAM Role and Policy

```hcl
# CREATES A CYCLE
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  # Inline policy that references the instance profile
  inline_policy {
    name = "self-describe"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [{
        Effect   = "Allow"
        Action   = "iam:GetInstanceProfile"
        Resource = aws_iam_instance_profile.app.arn  # References profile
      }]
    })
  }
}

resource "aws_iam_instance_profile" "app" {
  name = "app-profile"
  role = aws_iam_role.app.name  # References role - CYCLE!
}
```

**Fix**: Use a separate policy attachment:

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "app-profile"
  role = aws_iam_role.app.name
}

# Attach the policy separately - no cycle
resource "aws_iam_role_policy" "self_describe" {
  name = "self-describe"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "iam:GetInstanceProfile"
      Resource = aws_iam_instance_profile.app.arn
    }]
  })
}
```

## Common Cycle Pattern 3: Module Cross-References

```hcl
# CREATES A CYCLE
module "app" {
  source     = "./modules/app"
  db_address = module.database.address  # Depends on database module
}

module "database" {
  source         = "./modules/database"
  app_sg_id      = module.app.security_group_id  # Depends on app module - CYCLE!
}
```

**Fix**: Extract the shared dependency into a separate module or resource:

```hcl
# Create shared resources at the root level
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = var.vpc_id
}

module "app" {
  source            = "./modules/app"
  db_address        = module.database.address
  security_group_id = aws_security_group.app.id  # Pass it in
}

module "database" {
  source    = "./modules/database"
  app_sg_id = aws_security_group.app.id  # No module dependency - no cycle
}
```

## Common Cycle Pattern 4: depends_on Creates Hidden Cycle

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  depends_on = [aws_db_instance.main]
}

resource "aws_db_instance" "main" {
  # ...
  vpc_security_group_ids = [aws_security_group.db.id]
}

resource "aws_security_group" "db" {
  # ...
  ingress {
    security_groups = [aws_instance.app.vpc_security_group_ids[0]]  # Cycle via depends_on
  }
}
```

**Fix**: Remove the unnecessary `depends_on` or restructure the dependencies:

```hcl
resource "aws_security_group" "app" {
  name = "app-sg"
}

resource "aws_security_group" "db" {
  name = "db-sg"
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}

resource "aws_instance" "app" {
  ami                    = "ami-0123456789abcdef0"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.app.id]
}

resource "aws_db_instance" "main" {
  vpc_security_group_ids = [aws_security_group.db.id]
  # ...
}
```

## Debugging Cycle Errors

When the error message is not clear, use these techniques:

```bash
# Get a detailed graph output
terraform graph -draw-cycles 2>&1

# The -draw-cycles flag highlights the cycles in the graph output
terraform graph -draw-cycles | dot -Tpng > cycles.png
```

You can also use `terraform graph` with type filters:

```bash
# Show only resource dependencies
terraform graph -type=plan
```

## General Strategy for Breaking Cycles

1. **Identify the cycle** from the error message or graph visualization
2. **Find the inline reference** that creates the cycle - it is usually an attribute embedded in a resource block
3. **Extract the reference** into a separate resource (like `aws_security_group_rule` instead of inline `ingress` blocks)
4. **Use intermediate resources** or variables to break the dependency chain
5. **Avoid `depends_on`** when implicit dependencies (through attribute references) are sufficient

The key insight is that cycles almost always come from putting too much into a single resource definition. When you separate concerns into distinct resources, the dependency graph becomes a proper DAG and the cycle disappears.
