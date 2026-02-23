# How to Use Variables of Type Tuple in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Tuples, HCL, Infrastructure as Code

Description: Learn how to use tuple-type variables in Terraform for fixed-length sequences with different element types, including syntax, use cases, and comparison with lists.

---

Tuples are one of Terraform's structural types, sitting alongside objects in the type system. A tuple is a fixed-length sequence where each element can have a different type. Think of it as a list where the first element is always a string, the second is always a number, and the third is always a boolean - each position has its own type constraint.

While tuples are less commonly used than lists or objects, they fill a specific niche. This post explains when and how to use them.

## Declaring Tuple Variables

A tuple type specifies the type of each element by position:

```hcl
# variables.tf

# A tuple with three elements: string, number, boolean
variable "instance_spec" {
  description = "Instance specification: [type, count, monitoring]"
  type        = tuple([string, number, bool])
  default     = ["t3.medium", 2, true]
}

# A tuple with two elements: string, list of strings
variable "deployment_config" {
  description = "Deployment config: [region, availability_zones]"
  type        = tuple([string, list(string)])
  default     = ["us-east-1", ["us-east-1a", "us-east-1b"]]
}
```

The key difference from a list is that each position has its own type. A `list(string)` requires all elements to be strings. A `tuple([string, number, bool])` requires exactly three elements: a string, then a number, then a boolean.

## Accessing Tuple Elements

You access tuple elements by index, just like a list:

```hcl
variable "instance_spec" {
  type    = tuple([string, number, bool])
  default = ["t3.medium", 2, true]
}

locals {
  instance_type  = var.instance_spec[0]  # "t3.medium"
  instance_count = var.instance_spec[1]  # 2
  monitoring     = var.instance_spec[2]  # true
}

resource "aws_instance" "app" {
  count         = local.instance_count
  instance_type = local.instance_type
  monitoring    = local.monitoring
  ami           = var.ami_id

  tags = {
    Name = "app-${count.index + 1}"
  }
}
```

## Providing Tuple Values

### In terraform.tfvars

```hcl
# terraform.tfvars

instance_spec     = ["t3.large", 4, true]
deployment_config = ["us-west-2", ["us-west-2a", "us-west-2b", "us-west-2c"]]
```

### On the Command Line

```bash
terraform apply -var='instance_spec=["t3.large", 4, true]'
```

### In JSON

```json
{
  "instance_spec": ["t3.large", 4, true],
  "deployment_config": ["us-west-2", ["us-west-2a", "us-west-2b"]]
}
```

## Tuples vs Lists

Here is a direct comparison to help you choose:

| Feature | List | Tuple |
|---------|------|-------|
| Element types | All same type | Each position has its own type |
| Length | Variable | Fixed |
| Type declaration | `list(string)` | `tuple([string, number])` |
| Use case | Collection of similar items | Fixed structure with mixed types |

```hcl
# List: all elements must be strings, any length
variable "names" {
  type    = list(string)
  default = ["alice", "bob", "charlie"]
}

# Tuple: exactly 3 elements, specific types per position
variable "user_record" {
  type    = tuple([string, number, bool])
  default = ["alice", 30, true]
}
```

## Tuples vs Objects

Tuples and objects are both structural types, but they differ in how you access elements:

```hcl
# Object: access by name
variable "instance_object" {
  type = object({
    type       = string
    count      = number
    monitoring = bool
  })
  default = {
    type       = "t3.medium"
    count      = 2
    monitoring = true
  }
}

# Access: var.instance_object.type

# Tuple: access by position
variable "instance_tuple" {
  type    = tuple([string, number, bool])
  default = ["t3.medium", 2, true]
}

# Access: var.instance_tuple[0]
```

Objects are almost always more readable because named attributes are self-documenting. Tuples require you to remember what each position means.

## When to Use Tuples

Tuples are most useful in these scenarios:

### Scenario 1: Return Values from Functions

Some Terraform functions return tuples. Understanding the type helps you work with them.

```hcl
locals {
  # regex returns a tuple of capture groups
  parts = regex("^([a-z]+)-([0-9]+)$", "app-42")
  # parts[0] = "app", parts[1] = "42"

  app_name = local.parts[0]
  app_id   = local.parts[1]
}
```

### Scenario 2: Compact Configuration Pairs

When you have a small, fixed set of related values and do not need named access:

```hcl
variable "port_mappings" {
  description = "List of [host_port, container_port] pairs"
  type        = list(tuple([number, number]))
  default = [
    [8080, 80],
    [8443, 443],
    [9090, 9090],
  ]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "nginx:latest"
      portMappings = [
        for mapping in var.port_mappings : {
          hostPort      = mapping[0]
          containerPort = mapping[1]
          protocol      = "tcp"
        }
      ]
    }
  ])
}
```

### Scenario 3: Grid or Matrix Data

```hcl
variable "subnet_config" {
  description = "Subnet configurations: [cidr, az, public]"
  type        = list(tuple([string, string, bool]))
  default = [
    ["10.0.1.0/24", "us-east-1a", true],
    ["10.0.2.0/24", "us-east-1b", true],
    ["10.0.10.0/24", "us-east-1a", false],
    ["10.0.11.0/24", "us-east-1b", false],
  ]
}

resource "aws_subnet" "all" {
  count = length(var.subnet_config)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.subnet_config[count.index][0]
  availability_zone       = var.subnet_config[count.index][1]
  map_public_ip_on_launch = var.subnet_config[count.index][2]

  tags = {
    Name = var.subnet_config[count.index][2] ? "public-${count.index}" : "private-${count.index}"
    Tier = var.subnet_config[count.index][2] ? "public" : "private"
  }
}
```

Though honestly, this is more readable with a list of objects:

```hcl
variable "subnet_config_better" {
  type = list(object({
    cidr   = string
    az     = string
    public = bool
  }))
  default = [
    { cidr = "10.0.1.0/24",  az = "us-east-1a", public = true },
    { cidr = "10.0.2.0/24",  az = "us-east-1b", public = true },
    { cidr = "10.0.10.0/24", az = "us-east-1a", public = false },
    { cidr = "10.0.11.0/24", az = "us-east-1b", public = false },
  ]
}
```

## Working with setproduct and Tuples

The `setproduct` function returns a list of tuples:

```hcl
variable "environments" {
  type    = list(string)
  default = ["dev", "staging", "prod"]
}

variable "services" {
  type    = list(string)
  default = ["api", "web"]
}

locals {
  # setproduct returns list of tuples
  env_service_pairs = setproduct(var.environments, var.services)
  # Result: [["dev","api"], ["dev","web"], ["staging","api"], ...]

  # Convert to a map for for_each
  env_service_map = {
    for pair in local.env_service_pairs :
    "${pair[0]}-${pair[1]}" => {
      environment = pair[0]
      service     = pair[1]
    }
  }
}
```

## Validation for Tuples

```hcl
variable "instance_spec" {
  type = tuple([string, number, bool])

  validation {
    condition     = can(regex("^t3\\.", var.instance_spec[0]))
    error_message = "Instance type must be in the t3 family."
  }

  validation {
    condition     = var.instance_spec[1] >= 1 && var.instance_spec[1] <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}
```

## Best Practices

1. **Prefer objects over tuples for public module interfaces.** Named attributes are self-documenting. `var.config.instance_type` is clearer than `var.config[0]`.

2. **Use tuples for internal data transformations.** When processing data within locals, tuples from functions like `setproduct` or `regex` are natural and fine.

3. **Document tuple position meanings.** If you use a tuple variable, make the description very clear about what each position represents.

4. **Keep tuples short.** A tuple with more than 3-4 elements becomes hard to read. Consider an object instead.

## Wrapping Up

Tuples in Terraform are fixed-length sequences where each position has its own type. They are less common than lists and objects in everyday use, but they show up naturally with certain functions and are useful for compact representations of structured data. For most public-facing variables, objects are a better choice because named attributes make your code self-documenting. But when you encounter tuples in function return values or need a quick positional structure, knowing how they work will save you time.

For other variable types, see our posts on [list variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-list-in-terraform/view) and [object variables](https://oneuptime.com/blog/post/2026-02-23-how-to-use-variables-of-type-object-in-terraform/view).
