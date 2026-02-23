# How to Understand Resource Addressing in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Resource Addressing, State Management, Infrastructure as Code, Modules

Description: Learn how Terraform resource addressing works, including module paths, count and for_each indexes, and how to reference resources in commands and configurations.

---

Every resource in Terraform has an address - a string that uniquely identifies it within your configuration and state. You use resource addresses when running commands like `terraform state show`, `terraform import`, `terraform apply -target`, and `terraform apply -replace`. Understanding the addressing scheme is essential for state management, debugging, and targeted operations.

This guide breaks down the resource addressing syntax, covers all the variations you will encounter, and shows practical examples for each.

## Basic Resource Address

The simplest resource address has two parts: the resource type and the local name.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

The address of this resource is `aws_instance.web`.

```bash
# Reference this resource in CLI commands
terraform state show aws_instance.web
terraform apply -replace="aws_instance.web"
```

## Data Source Addresses

Data sources use the `data.` prefix:

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
}
```

Address: `data.aws_ami.ubuntu`

```bash
terraform state show data.aws_ami.ubuntu
```

## Resources with count

When a resource uses `count`, each instance gets a numeric index starting at 0:

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

The addresses are:
- `aws_instance.web[0]`
- `aws_instance.web[1]`
- `aws_instance.web[2]`

```bash
# Reference specific instances
terraform state show 'aws_instance.web[0]'
terraform apply -replace='aws_instance.web[1]'

# The whole resource (all instances)
terraform state show aws_instance.web
```

Note the quoting: square brackets need to be protected from shell interpretation.

## Resources with for_each

When using `for_each`, instances are keyed by the map key or set element:

```hcl
resource "aws_instance" "web" {
  for_each = {
    us-east-1 = "ami-0abc123"
    us-west-2 = "ami-0def456"
    eu-west-1 = "ami-0ghi789"
  }

  ami           = each.value
  instance_type = "t3.micro"
}
```

The addresses are:
- `aws_instance.web["us-east-1"]`
- `aws_instance.web["us-west-2"]`
- `aws_instance.web["eu-west-1"]`

```bash
# Reference specific instances - note the quoting
terraform state show 'aws_instance.web["us-east-1"]'
terraform apply -replace='aws_instance.web["eu-west-1"]'
```

## Module Addresses

Resources inside modules include the module path:

```hcl
module "web_server" {
  source        = "./modules/web-server"
  instance_type = "t3.micro"
}
```

If the module creates an `aws_instance.main`, its full address is:

`module.web_server.aws_instance.main`

```bash
terraform state show module.web_server.aws_instance.main
terraform apply -target=module.web_server.aws_instance.main
```

### Nested Modules

Modules can contain other modules, creating longer paths:

```hcl
module "app" {
  source = "./modules/app"
}

# Inside modules/app/main.tf:
module "database" {
  source = "../database"
}

# Inside modules/database/main.tf:
resource "aws_db_instance" "main" {
  # ...
}
```

The address is: `module.app.module.database.aws_db_instance.main`

### Modules with count

```hcl
module "web_server" {
  count  = 3
  source = "./modules/web-server"
}
```

Addresses:
- `module.web_server[0].aws_instance.main`
- `module.web_server[1].aws_instance.main`
- `module.web_server[2].aws_instance.main`

### Modules with for_each

```hcl
module "web_server" {
  for_each = toset(["prod", "staging", "dev"])
  source   = "./modules/web-server"
}
```

Addresses:
- `module.web_server["prod"].aws_instance.main`
- `module.web_server["staging"].aws_instance.main`
- `module.web_server["dev"].aws_instance.main`

## Address Components Summary

A full resource address follows this pattern:

```
[module.MODULE_NAME[INDEX].]...[module.MODULE_NAME[INDEX].]RESOURCE_TYPE.RESOURCE_NAME[INDEX]
```

Where:
- `module.MODULE_NAME` - optional, can be repeated for nested modules
- `[INDEX]` - optional, either `[N]` for count or `["KEY"]` for for_each
- `RESOURCE_TYPE` - the provider resource type (e.g., `aws_instance`)
- `RESOURCE_NAME` - the local name you gave the resource

## Using Addresses in Configuration

Within your Terraform configuration, you reference resources using their addresses (without quoting):

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  # Reference another resource by its address
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

# Reference a data source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
}

resource "aws_instance" "web" {
  # Reference data source attributes
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id
}
```

### Referencing count Instances

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Reference all instances (returns a list)
output "all_ips" {
  value = aws_instance.web[*].public_ip
}

# Reference a specific instance
output "first_ip" {
  value = aws_instance.web[0].public_ip
}
```

### Referencing for_each Instances

```hcl
resource "aws_instance" "web" {
  for_each      = toset(["web1", "web2"])
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# Reference a specific instance
output "web1_ip" {
  value = aws_instance.web["web1"].public_ip
}

# Reference all instances (returns a map)
output "all_ips" {
  value = { for k, v in aws_instance.web : k => v.public_ip }
}
```

### Referencing Module Outputs

```hcl
module "web_server" {
  source = "./modules/web-server"
}

# Reference module output
output "web_ip" {
  value = module.web_server.public_ip
}

# Module with count
module "web_server" {
  count  = 3
  source = "./modules/web-server"
}

output "all_ips" {
  value = module.web_server[*].public_ip
}
```

## Using Addresses in CLI Commands

### terraform state Commands

```bash
# List all resources
terraform state list

# Show a specific resource
terraform state show aws_instance.web

# Show a module resource
terraform state show module.web_server.aws_instance.main

# Show a counted resource
terraform state show 'aws_instance.web[0]'

# Move a resource (rename)
terraform state mv aws_instance.old aws_instance.new

# Remove a resource from state
terraform state rm aws_instance.temp
```

### terraform import

```bash
# Import with a simple address
terraform import aws_instance.web i-0abc123

# Import into a module
terraform import module.web_server.aws_instance.main i-0abc123

# Import a specific count index
terraform import 'aws_instance.web[2]' i-0abc123

# Import a specific for_each key
terraform import 'aws_instance.web["us-east-1"]' i-0abc123
```

### terraform apply -target

```bash
# Target a specific resource
terraform apply -target=aws_instance.web

# Target a module
terraform apply -target=module.web_server

# Target a specific instance
terraform apply -target='aws_instance.web[0]'
```

## Address Wildcards and Patterns

Some commands support partial addresses to match multiple resources:

```bash
# terraform state list supports filtering
terraform state list aws_instance
# Lists all aws_instance resources

terraform state list module.web_server
# Lists all resources in the module
```

However, most commands require exact addresses. You cannot use glob patterns like `aws_instance.web[*]` in CLI commands.

## Troubleshooting Address Issues

### Finding the Correct Address

```bash
# List all resources to find the right address
terraform state list

# Use grep to filter (if you have many resources)
terraform state list | grep "web"
```

### Quoting Rules

```bash
# For indexed resources in bash, use single quotes
terraform state show 'aws_instance.web[0]'
terraform state show 'aws_instance.web["prod"]'

# Or escape the brackets
terraform state show aws_instance.web\[0\]

# In PowerShell, use backtick escaping
terraform state show aws_instance.web`[0`]
```

## Conclusion

Resource addressing is the fundamental way you refer to resources throughout Terraform. From simple `type.name` addresses to complex module paths with nested indexes, the addressing scheme is consistent and predictable. Knowing how to construct addresses lets you run targeted operations, manage state, import resources, and debug issues effectively. When in doubt, `terraform state list` shows you the exact addresses of everything Terraform is tracking.

For practical applications of resource addressing, see our guide on [how to target specific resources with terraform apply -target](https://oneuptime.com/blog/post/2026-02-23-terraform-apply-target-specific-resources/view).
