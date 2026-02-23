# How to Define Output Values in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Outputs, Modules, Infrastructure as Code, DevOps

Description: Learn how to define output values in Terraform to expose resource attributes, share data between modules, and display useful information after applying configurations.

---

Output values in Terraform serve three purposes: they display information in the terminal after `terraform apply`, they share data between modules, and they make values available for external tools and scripts. Outputs are the other half of Terraform's interface system - variables are inputs, outputs are what comes back.

This post covers how to declare outputs, what you can output, and the patterns that make outputs genuinely useful in real projects.

## Basic Output Syntax

An output block has a name and a value:

```hcl
# outputs.tf

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "instance_public_ip" {
  description = "Public IP address of the web server"
  value       = aws_instance.web.public_ip
}

output "load_balancer_dns" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.app.dns_name
}
```

After running `terraform apply`, these values are printed:

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

instance_public_ip = "54.123.45.67"
load_balancer_dns = "app-lb-123456789.us-east-1.elb.amazonaws.com"
vpc_id = "vpc-0abc123def456789"
```

## Output Block Arguments

The output block supports several arguments:

```hcl
output "database_endpoint" {
  # Description is optional but highly recommended
  description = "The connection endpoint for the RDS instance"

  # Value is required - the actual data to output
  value = aws_db_instance.main.endpoint

  # Sensitive hides the value in CLI output
  sensitive = false

  # depends_on for explicit dependency ordering
  depends_on = [aws_db_instance.main]

  # Precondition for validation (Terraform 1.2+)
  precondition {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database is not in available state."
  }
}
```

## What You Can Output

You can output virtually any value in Terraform.

### Resource Attributes

```hcl
output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.data.arn
}

output "rds_endpoint" {
  description = "RDS connection endpoint"
  value       = aws_db_instance.main.endpoint
}
```

### Computed Values

```hcl
output "app_url" {
  description = "Full application URL"
  value       = "https://${aws_lb.app.dns_name}"
}

output "ssh_command" {
  description = "SSH command to connect to the bastion"
  value       = "ssh -i key.pem ec2-user@${aws_instance.bastion.public_ip}"
}
```

### Lists of Attributes

```hcl
# Output from count-based resources
output "instance_ids" {
  description = "IDs of all created instances"
  value       = aws_instance.app[*].id
}

output "instance_private_ips" {
  description = "Private IPs of all created instances"
  value       = aws_instance.app[*].private_ip
}
```

### Maps and Objects

```hcl
# Output a structured object
output "vpc_details" {
  description = "VPC configuration details"
  value = {
    id         = aws_vpc.main.id
    cidr_block = aws_vpc.main.cidr_block
    arn        = aws_vpc.main.arn
  }
}

# Output from for_each resources
output "subnet_ids" {
  description = "Map of subnet names to IDs"
  value = {
    for name, subnet in aws_subnet.main :
    name => subnet.id
  }
}
```

### Conditional Values

```hcl
output "bastion_ip" {
  description = "Bastion host public IP (null if bastion not created)"
  value       = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}

output "cdn_domain" {
  description = "CloudFront domain name (null if CDN not enabled)"
  value       = var.enable_cdn ? aws_cloudfront_distribution.main[0].domain_name : null
}
```

### Data Source Outputs

```hcl
output "current_region" {
  description = "Current AWS region"
  value       = data.aws_region.current.name
}

output "account_id" {
  description = "Current AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}
```

### Complex For Expressions

```hcl
output "instance_details" {
  description = "Detailed information about each instance"
  value = {
    for instance in aws_instance.app :
    instance.tags["Name"] => {
      id         = instance.id
      az         = instance.availability_zone
      private_ip = instance.private_ip
      public_ip  = instance.public_ip
      type       = instance.instance_type
    }
  }
}
```

## File Organization

The convention is to put outputs in a file called `outputs.tf`:

```
project/
  main.tf          # Resources
  variables.tf     # Input variables
  outputs.tf       # Output values
  providers.tf     # Provider configuration
  versions.tf      # Terraform and provider versions
```

For larger projects, you can colocate outputs with related resources:

```
project/
  network.tf       # Network resources
  network_outputs.tf  # Network outputs
  compute.tf       # Compute resources
  compute_outputs.tf  # Compute outputs
```

## Outputs in Modules

Outputs are how modules expose their results to the calling configuration. This is one of their most important uses.

```hcl
# modules/vpc/outputs.tf

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT gateways"
  value       = aws_eip.nat[*].public_ip
}
```

The calling configuration accesses these via `module.<name>.<output_name>`:

```hcl
# main.tf

module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
  azs    = ["us-east-1a", "us-east-1b"]
}

# Use module outputs
resource "aws_instance" "app" {
  subnet_id = module.vpc.public_subnet_ids[0]
  # ...
}
```

## Reading Outputs from the Command Line

After applying, you can query outputs:

```bash
# Show all outputs
terraform output

# Show a specific output
terraform output vpc_id

# Get raw value (no quotes around strings)
terraform output -raw vpc_id

# Get JSON format
terraform output -json

# Get a specific output as JSON
terraform output -json subnet_ids
```

## A Complete Example

Here is a full configuration with well-structured outputs:

```hcl
# main.tf

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${count.index + 1}"
  }
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public[count.index % length(aws_subnet.public)].id

  tags = {
    Name = "${var.project}-app-${count.index + 1}"
  }
}
```

```hcl
# outputs.tf

# Network outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

# Compute outputs
output "instance_ids" {
  description = "IDs of all app instances"
  value       = aws_instance.app[*].id
}

output "instance_public_ips" {
  description = "Public IPs of all app instances"
  value       = aws_instance.app[*].public_ip
}

# Convenience outputs
output "summary" {
  description = "Deployment summary"
  value = {
    vpc_id          = aws_vpc.main.id
    instance_count  = length(aws_instance.app)
    public_ips      = aws_instance.app[*].public_ip
    subnet_count    = length(aws_subnet.public)
    region          = var.region
  }
}
```

## Best Practices

1. **Always include descriptions.** Future you (and your teammates) will appreciate knowing what each output represents.

2. **Output everything useful from modules.** It is better to output too much than too little. Callers might need any attribute of the resources you create.

3. **Use consistent naming.** Follow a pattern like `resource_type_attribute` - for example, `vpc_id`, `subnet_ids`, `instance_public_ips`.

4. **Group related outputs.** Either by file organization or by using object outputs that group related values.

5. **Mark sensitive outputs.** If an output contains credentials or other secrets, add `sensitive = true`.

## Wrapping Up

Output values complete Terraform's input/output system. They display results in the terminal, pass data between modules, and expose values for external consumption. Thoughtful outputs make your configurations and modules more useful, observable, and composable. The small effort of defining outputs pays off every time someone needs to know a VPC ID, connect to a database, or pipe Terraform's results into another tool.

For more on specific output features, see our posts on [sensitive outputs](https://oneuptime.com/blog/post/2026-02-23-how-to-mark-outputs-as-sensitive-in-terraform/view) and [output descriptions](https://oneuptime.com/blog/post/2026-02-23-how-to-add-output-descriptions-in-terraform/view).
