# How to Reference Resource Attributes in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Infrastructure as Code, DevOps, Resource Attributes

Description: Learn how to reference resource attributes in Terraform to build dependencies between resources, pass values across your configuration, and create dynamic infrastructure.

---

When you define a resource in Terraform, that resource exposes a set of attributes after it gets created. These attributes - things like an IP address, an ARN, a generated ID - are the glue that holds your infrastructure together. Knowing how to reference them correctly is fundamental to writing useful Terraform configurations.

In this post, we will walk through the syntax, patterns, and practical examples of referencing resource attributes in Terraform.

## The Basic Syntax

Every resource in Terraform follows this reference pattern:

```hcl
# Syntax: <resource_type>.<resource_name>.<attribute>
# Example: aws_instance.web.id
```

When you declare a resource like this:

```hcl
# Create an EC2 instance
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

Terraform creates the instance and then makes its attributes available for other parts of your configuration to consume. You can reference them like so:

```hcl
# Reference the instance ID in an output
output "instance_id" {
  value = aws_instance.web.id
}

# Reference the public IP
output "public_ip" {
  value = aws_instance.web.public_ip
}
```

## How Terraform Resolves References

Terraform builds a dependency graph based on these references. When resource B references an attribute of resource A, Terraform knows it needs to create A first. You never have to manually specify this ordering - the references handle it automatically.

```hcl
# Create a VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}

# Create a subnet that references the VPC
# Terraform automatically creates the VPC first
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # implicit dependency on the VPC
  cidr_block = "10.0.1.0/24"

  tags = {
    Name = "public-subnet"
  }
}
```

In the example above, `aws_subnet.public` depends on `aws_vpc.main` because it references `aws_vpc.main.id`. Terraform handles the creation order for you.

## Referencing Nested Attributes

Some resources have nested blocks or complex attribute structures. You access nested values using dot notation or bracket notation depending on the structure.

```hcl
# Create an EIP and associate it
resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
}

# Access nested attributes from a data source or resource
# For map-type attributes, use bracket notation
output "eip_allocation" {
  value = aws_eip.web.allocation_id
}
```

For attributes that return lists, you can index into them:

```hcl
# Reference the first security group ID from a list
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.web.id]
}

# Some attributes return lists - use index to grab specific elements
output "first_security_group" {
  value = aws_instance.web.vpc_security_group_ids[0]
}
```

## Referencing Resources Created with count

When you use `count` to create multiple instances of a resource, each one gets an index. You reference specific instances using bracket notation:

```hcl
# Create three EC2 instances
resource "aws_instance" "server" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "server-${count.index}"
  }
}

# Reference a specific instance by index
output "first_server_id" {
  value = aws_instance.server[0].id
}

# Reference all instance IDs using splat expression
output "all_server_ids" {
  value = aws_instance.server[*].id
}

# Reference all private IPs
output "all_private_ips" {
  value = aws_instance.server[*].private_ip
}
```

The splat expression (`[*]`) is particularly useful. It collects a specific attribute from every instance into a list.

## Referencing Resources Created with for_each

When you use `for_each`, you reference instances by their map key or set element:

```hcl
# Create instances using for_each
resource "aws_instance" "server" {
  for_each      = toset(["web", "api", "worker"])
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = each.key
  }
}

# Reference a specific instance by key
output "web_server_id" {
  value = aws_instance.server["web"].id
}

# Reference all instance IDs using a for expression
output "all_server_ids" {
  value = { for k, v in aws_instance.server : k => v.id }
}
```

## Computed vs Configured Attributes

There is an important distinction between attributes you set in configuration and attributes that Terraform computes after creation.

```hcl
resource "aws_instance" "web" {
  # These are configured attributes - you set them
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}

# After creation, Terraform computes additional attributes:
# - aws_instance.web.id (the instance ID assigned by AWS)
# - aws_instance.web.public_ip (the public IP assigned by AWS)
# - aws_instance.web.arn (the ARN)
# - aws_instance.web.private_dns (the private DNS name)
```

Computed attributes are only available after `terraform apply`. During `terraform plan`, they show as `(known after apply)`.

## Using Attributes in String Interpolation

You can embed resource attributes inside strings using the `${}` interpolation syntax:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Use interpolation to build strings with resource attributes
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "web.example.com"
  type    = "A"
  ttl     = 300
  records = [aws_instance.web.public_ip]
}

# Build a connection string using multiple resource attributes
output "connection_info" {
  value = "ssh ec2-user@${aws_instance.web.public_ip}"
}
```

## Cross-Resource Attribute Chains

In real configurations, you often chain attributes across several resources:

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Subnet references VPC
resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

# Security group references VPC
resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id
  name   = "web-sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Instance references subnet and security group
resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
}

# EIP references instance
resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
}
```

This chain creates a clear dependency graph: VPC -> Subnet + Security Group -> Instance -> EIP.

## Finding Available Attributes

The best way to discover which attributes a resource exposes is to check the Terraform provider documentation. Every resource page has an "Attributes Reference" or "Attributes Exported" section that lists every available attribute.

You can also use `terraform console` to explore attributes interactively:

```bash
# Start the Terraform console after applying
terraform console

# Then type resource references to see their values
> aws_instance.web.id
"i-0abc123def456789"

> aws_instance.web.public_ip
"54.123.45.67"
```

## Common Mistakes to Avoid

One frequent mistake is trying to reference an attribute that does not exist on the resource type. Always check the provider docs. Another common issue is circular references - where resource A references resource B and resource B references resource A. Terraform will catch this and throw an error.

```hcl
# This will NOT work - circular dependency
resource "aws_security_group" "a" {
  ingress {
    security_groups = [aws_security_group.b.id]  # references B
  }
}

resource "aws_security_group" "b" {
  ingress {
    security_groups = [aws_security_group.a.id]  # references A
  }
}

# Solution: use aws_security_group_rule as separate resources
```

## Wrapping Up

Referencing resource attributes is one of the most fundamental skills in Terraform. Once you understand the `resource_type.resource_name.attribute` pattern, you can build complex infrastructure where resources automatically connect to each other. Terraform handles the dependency ordering, and you get a clean, readable configuration that describes your entire infrastructure.

For related topics, check out [How to Reference Module Outputs in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-module-outputs/view) and [How to Reference Data Source Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-data-source-attributes/view).
