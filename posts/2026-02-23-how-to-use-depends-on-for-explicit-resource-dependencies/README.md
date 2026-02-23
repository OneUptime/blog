# How to Use depends_on for Explicit Resource Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Dependencies, depends_on, Infrastructure as Code

Description: Learn when and how to use the Terraform depends_on meta-argument to declare explicit resource dependencies that Terraform cannot infer from references, with real-world examples and common pitfalls.

---

Terraform automatically detects dependencies between resources by analyzing references in your configuration. When resource A references an attribute of resource B, Terraform knows to create B first. But some dependencies are invisible to Terraform's reference analysis. The `depends_on` meta-argument lets you declare these hidden dependencies explicitly.

This post focuses on when `depends_on` is actually needed, how to use it correctly, and the common situations where implicit dependencies are not enough.

## When Terraform Gets Dependencies Right Automatically

Before reaching for `depends_on`, understand that most dependencies are handled automatically:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Terraform sees the reference to aws_vpc.main.id
# and creates the VPC first
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # Implicit dependency
  cidr_block = "10.0.1.0/24"
}

# Terraform sees the reference to aws_subnet.public.id
# and creates the subnet first
resource "aws_instance" "web" {
  subnet_id = aws_subnet.public.id  # Implicit dependency
  ami       = var.ami_id
  instance_type = "t3.micro"
}
```

The dependency chain VPC -> Subnet -> Instance is fully inferred. No `depends_on` needed.

## When depends_on Is Needed

### 1. IAM Policy Dependencies

This is the most common case. When a resource needs an IAM permission to function, but the permission is attached through a separate resource:

```hcl
resource "aws_iam_role" "lambda" {
  name = "${var.project}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_s3.arn
}

resource "aws_lambda_function" "processor" {
  function_name = "${var.project}-processor"
  role          = aws_iam_role.lambda.arn  # References the role, not the policy attachment
  runtime       = "python3.11"
  handler       = "handler.main"
  filename      = "lambda.zip"

  # Terraform sees the reference to the role ARN, but it does NOT see
  # the dependency on the policy attachment. Without depends_on,
  # the Lambda might be created before the policy is attached,
  # causing permission errors on first invocation.
  depends_on = [aws_iam_role_policy_attachment.lambda_s3]
}
```

The Lambda function references `aws_iam_role.lambda.arn`, so Terraform creates the role first. But the policy attachment is a separate resource that the Lambda does not reference. Without `depends_on`, the Lambda could be invoked before the S3 permission is in place.

### 2. Resource Provisioning Dependencies

When one resource creates infrastructure that another resource needs but does not reference:

```hcl
# VPN gateway must be attached before routes can use it
resource "aws_vpn_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_vpn_gateway_attachment" "main" {
  vpc_id         = aws_vpc.main.id
  vpn_gateway_id = aws_vpn_gateway.main.id
}

resource "aws_route" "vpn" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = var.on_premises_cidr
  gateway_id             = aws_vpn_gateway.main.id

  # The route references the gateway ID, but it needs the
  # gateway to be attached to the VPC first
  depends_on = [aws_vpn_gateway_attachment.main]
}
```

### 3. Provider Configuration Dependencies

When a resource's provider depends on another resource existing:

```hcl
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

# The Kubernetes provider depends on the EKS cluster existing
provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}

# Kubernetes resources need the cluster to be fully ready
resource "kubernetes_namespace" "app" {
  metadata {
    name = "app"
  }

  depends_on = [aws_eks_cluster.main]
}
```

### 4. Side-Effect Dependencies

When resource A creates a side effect that resource B depends on:

```hcl
# This null_resource runs a script that seeds the database
resource "null_resource" "db_setup" {
  provisioner "local-exec" {
    command = "python scripts/seed_db.py --host ${aws_db_instance.main.endpoint}"
  }

  triggers = {
    db_endpoint = aws_db_instance.main.endpoint
  }
}

# The application depends on the database being seeded
resource "aws_ecs_service" "app" {
  name            = "${var.project}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  depends_on = [null_resource.db_setup]
}
```

## Syntax and Usage

`depends_on` takes a list of resource references (without attribute access):

```hcl
resource "aws_instance" "app" {
  # ...

  # Single dependency
  depends_on = [aws_iam_instance_profile.app]
}

resource "aws_ecs_service" "app" {
  # ...

  # Multiple dependencies
  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution,
    aws_iam_role_policy_attachment.ecs_task,
    aws_lb_listener.https,
  ]
}
```

## depends_on on Modules

You can use `depends_on` on module blocks:

```hcl
module "networking" {
  source = "./modules/networking"

  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

module "application" {
  source = "./modules/application"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  # Ensure all networking resources are fully created
  depends_on = [module.networking]
}
```

When `depends_on` is used on a module, Terraform waits for everything in the dependency to be fully applied before starting anything in the dependent module.

## depends_on on Data Sources

Data sources also support `depends_on`:

```hcl
resource "aws_iam_policy" "app" {
  name   = "${var.project}-app-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.data.arn}/*"
    }]
  })
}

# The data source queries the policy after it is created
data "aws_iam_policy" "app" {
  name = aws_iam_policy.app.name

  depends_on = [aws_iam_policy.app]
}
```

## Common Pitfalls

### Overusing depends_on

```hcl
# Do NOT add depends_on when the reference already creates the dependency
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id

  # UNNECESSARY - the vpc_id reference already creates the dependency
  depends_on = [aws_vpc.main]
}
```

Adding unnecessary `depends_on` makes the configuration harder to read and can slow down applies by serializing resources that could be created in parallel.

### depends_on Creates Full Resource Dependencies

When you add `depends_on`, Terraform treats it as a dependency on the entire resource, not just its creation. This means:

```hcl
resource "aws_instance" "app" {
  # ...
  depends_on = [aws_iam_role_policy.app]
}
```

If the IAM policy changes, Terraform will wait for it to be updated before making any changes to the instance. This is usually what you want, but be aware of it.

### Circular Dependency Risk

`depends_on` can create circular dependencies if you are not careful:

```hcl
# This creates a cycle and Terraform will error
resource "aws_security_group" "a" {
  depends_on = [aws_security_group.b]
}

resource "aws_security_group" "b" {
  depends_on = [aws_security_group.a]
}
```

Terraform detects cycles and shows an error. If you run into this, restructure the resources to break the cycle.

## Alternatives to depends_on

Sometimes you can restructure your configuration to use implicit dependencies instead:

```hcl
# Instead of depends_on, reference the policy attachment's ID
# in a way that creates an implicit dependency
resource "aws_lambda_function" "processor" {
  function_name = "${var.project}-processor"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "handler.main"
  filename      = "lambda.zip"

  # Use a tag that references the policy attachment
  # This creates an implicit dependency without depends_on
  tags = {
    PolicyVersion = aws_iam_role_policy_attachment.lambda_s3.id
  }
}
```

This is a workaround, not always appropriate, but it shows that implicit dependencies are preferred when possible.

## Summary

Use `depends_on` only when Terraform cannot infer the dependency from references. The most common cases are IAM policy attachments that must exist before a resource is used, resources that need another resource to be fully provisioned first, and side-effect dependencies from provisioners or external scripts. Always prefer implicit dependencies through references when possible, and avoid adding `depends_on` to resources that already reference their dependency. Overusing `depends_on` makes your configuration harder to understand and can unnecessarily serialize resource creation.

For more on Terraform dependencies, see our posts on [resource dependencies](https://oneuptime.com/blog/post/2026-01-23-terraform-resource-dependencies/view) and [depends_on ordering](https://oneuptime.com/blog/post/2026-02-09-terraform-depends-on-ordering/view).
