# How to Use Output depends_on in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Output, Dependencies, Modules, Infrastructure as Code

Description: Learn how to use the depends_on argument in Terraform outputs to create explicit dependencies that ensure resources are fully provisioned before output values are consumed.

---

Terraform outputs can have a `depends_on` argument, and it solves a problem that is not immediately obvious. Normally, Terraform figures out dependencies automatically by following references in your code. But there are situations where an output value is technically available before a related resource has finished its work - and if another module consumes that output too early, things break. The `depends_on` on outputs lets you add explicit ordering to prevent these timing issues.

This post explains when you need `depends_on` on outputs, how it works, and the specific scenarios where it matters.

## The Problem

Consider a VPC module that creates a VPC, subnets, and route tables. The VPC ID is available as soon as the VPC resource is created, but the route tables and their associations might still be in progress:

```hcl
# modules/vpc/main.tf

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
}

resource "aws_subnet" "public" {
  count  = length(var.public_subnet_cidrs)
  vpc_id = aws_vpc.main.id
  # ...
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}
```

The problem: another module might use `public_subnet_ids` to create an instance before the route table associations are complete. The subnet exists, but it does not have routing yet. The instance launches into a subnet that cannot reach the internet.

## The Solution: depends_on

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
  depends_on = [
    aws_route_table_association.public,
    aws_route.internet,
  ]
}

output "public_subnet_ids" {
  description = "IDs of public subnets with routing configured"
  value       = aws_subnet.public[*].id
  depends_on = [
    aws_route_table_association.public,
    aws_route.internet,
  ]
}
```

Now, any module or resource that consumes these outputs will wait until the route table associations and routes are fully created before proceeding.

## How It Works

When you add `depends_on` to an output, Terraform treats it as an explicit dependency. Any resource in the consuming configuration that references the output will not be created, updated, or destroyed until all the resources listed in `depends_on` have completed their operations.

The key thing to understand is that `depends_on` on outputs does not change the output value itself. It changes the timing of when consumers can use that value.

```text
Without depends_on:
  VPC created -> subnet ID available -> consumer starts immediately
  (routes may not be ready)

With depends_on:
  VPC created -> subnet ID available -> routes created -> consumer starts
  (routes are guaranteed to be ready)
```

## Common Scenarios

### Scenario 1: Network Readiness

The VPC/subnet example above is the most common case. You want to guarantee that networking is fully configured before resources try to use it.

```hcl
# modules/vpc/outputs.tf

output "private_subnet_ids" {
  description = "Private subnet IDs with NAT gateway routing configured"
  value       = aws_subnet.private[*].id
  depends_on = [
    # Ensure NAT gateways are ready before anyone
    # puts resources in private subnets
    aws_route.private_nat,
    aws_route_table_association.private,
    aws_nat_gateway.main,
  ]
}
```

### Scenario 2: IAM Policy Propagation

IAM policies in AWS can take a few seconds to propagate. If a module outputs a role ARN and another module immediately tries to use that role, it might fail:

```hcl
# modules/iam/outputs.tf

output "lambda_role_arn" {
  description = "IAM role ARN for the Lambda function"
  value       = aws_iam_role.lambda.arn
  depends_on = [
    # Wait for policy attachments to complete
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc,
    aws_iam_role_policy.lambda_custom,
  ]
}
```

### Scenario 3: Security Group Rules

A security group might be created quickly, but its rules take additional API calls:

```hcl
# modules/security/outputs.tf

output "app_security_group_id" {
  description = "Security group ID with all ingress and egress rules configured"
  value       = aws_security_group.app.id
  depends_on = [
    aws_security_group_rule.app_ingress,
    aws_security_group_rule.app_egress,
    aws_security_group_rule.app_internal,
  ]
}
```

### Scenario 4: Database Configuration

A database might be "available" but still setting up parameter groups or option groups:

```hcl
# modules/database/outputs.tf

output "endpoint" {
  description = "Database endpoint ready for connections"
  value       = aws_db_instance.main.endpoint
  depends_on = [
    aws_db_parameter_group.main,
    aws_db_option_group.main,
    aws_db_instance.main,
  ]
}
```

### Scenario 5: Kubernetes Cluster Readiness

An EKS cluster endpoint is available before the cluster is fully ready:

```hcl
# modules/eks/outputs.tf

output "cluster_endpoint" {
  description = "EKS cluster API endpoint, ready for kubectl operations"
  value       = aws_eks_cluster.main.endpoint
  depends_on = [
    # Wait for node groups to be active
    aws_eks_node_group.main,
    # Wait for core add-ons
    aws_eks_addon.vpc_cni,
    aws_eks_addon.coredns,
    aws_eks_addon.kube_proxy,
  ]
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
  depends_on = [
    aws_eks_node_group.main,
  ]
}
```

## Full Module Example

Here is a complete networking module demonstrating proper use of `depends_on` on outputs:

```hcl
# modules/networking/main.tf

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name}-igw" }
}

resource "aws_subnet" "public" {
  count             = length(var.public_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "${var.name}-public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = length(var.private_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "${var.name}-private-${count.index}" }
}

resource "aws_eip" "nat" {
  count  = length(var.public_cidrs)
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = length(var.public_cidrs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name}-public-rt" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = length(var.private_cidrs)
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name}-private-rt-${count.index}" }
}

resource "aws_route" "private_nat" {
  count                  = length(var.private_cidrs)
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_cidrs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

```hcl
# modules/networking/outputs.tf

output "vpc_id" {
  description = "ID of the VPC with all networking components ready"
  value       = aws_vpc.main.id
  depends_on = [
    aws_route_table_association.public,
    aws_route_table_association.private,
    aws_route.public_internet,
    aws_route.private_nat,
  ]
}

output "public_subnet_ids" {
  description = "IDs of public subnets with internet gateway routing"
  value       = aws_subnet.public[*].id
  depends_on = [
    aws_route_table_association.public,
    aws_route.public_internet,
  ]
}

output "private_subnet_ids" {
  description = "IDs of private subnets with NAT gateway routing"
  value       = aws_subnet.private[*].id
  depends_on = [
    aws_route_table_association.private,
    aws_route.private_nat,
    aws_nat_gateway.main,
  ]
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT gateways for IP allowlisting"
  value       = aws_eip.nat[*].public_ip
}
```

## When NOT to Use depends_on on Outputs

Do not add `depends_on` when Terraform can figure out the dependency automatically:

```hcl
# Unnecessary - Terraform already knows this depends on the VPC resource
output "vpc_id" {
  value      = aws_vpc.main.id
  depends_on = [aws_vpc.main]  # Not needed
}
```

Only use `depends_on` when there is a dependency that Terraform cannot infer from references - typically when a resource needs to exist but is not directly referenced in the output's value expression.

## Best Practices

1. **Use sparingly.** Overusing `depends_on` creates unnecessary serialization and slows down applies.

2. **Document why.** Add a comment explaining why the dependency is needed.

3. **Be specific.** List only the resources that actually need to complete, not everything in the module.

4. **Test removal.** If you are not sure whether a `depends_on` is needed, try removing it and see if the configuration still works. Sometimes Terraform's implicit dependencies are sufficient.

## Wrapping Up

The `depends_on` argument on outputs is a targeted tool for handling timing issues between modules. It ensures that all related resources are fully provisioned before other modules start consuming the output value. The most common cases involve networking (routes and associations), IAM (policy propagation), and complex resources that have multiple sub-resources. Use it when Terraform's automatic dependency tracking is not enough, but do not reach for it as a first resort - implicit dependencies handle the majority of cases correctly.

For more on Terraform outputs, see our posts on [defining output values](https://oneuptime.com/blog/post/2026-02-23-how-to-define-output-values-in-terraform/view) and [exporting outputs from modules](https://oneuptime.com/blog/post/2026-02-23-how-to-export-outputs-from-modules-in-terraform/view).
