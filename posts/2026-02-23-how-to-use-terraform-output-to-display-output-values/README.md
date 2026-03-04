# How to Use terraform output to Display Output Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, terraform output, Outputs, DevOps, Infrastructure as Code

Description: Learn how to define and use terraform output values to export information about your infrastructure for scripts, other configurations, and team communication.

---

After Terraform creates your infrastructure, you often need to know specific details about what was created. What is the IP address of that server? What is the database connection string? What is the ARN of that IAM role? Terraform outputs let you extract and display this information, and the `terraform output` command is how you access it after the apply is done.

Outputs serve multiple purposes: they display information to the user running Terraform, they expose values for use by other Terraform configurations or scripts, and they provide a structured way to document what your infrastructure makes available.

## Defining Outputs

Outputs are defined in your Terraform configuration using `output` blocks. By convention, they go in an `outputs.tf` file:

```hcl
# outputs.tf

output "instance_id" {
  value       = aws_instance.web.id
  description = "The ID of the web server instance"
}

output "public_ip" {
  value       = aws_instance.web.public_ip
  description = "The public IP address of the web server"
}

output "database_endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "The connection endpoint for the database"
}
```

After running `terraform apply`, these outputs are displayed:

```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

database_endpoint = "mydb.abc123.us-east-1.rds.amazonaws.com:5432"
instance_id = "i-0abc123def456"
public_ip = "54.123.45.67"
```

## Using the terraform output Command

After an apply, you can retrieve output values at any time without re-applying:

```bash
# Show all outputs
terraform output

# Show a specific output
terraform output public_ip

# Show a specific output without quotes (raw value)
terraform output -raw public_ip
```

The `-raw` flag is particularly useful when piping output to other commands:

```bash
# SSH into the instance using its output IP
ssh ec2-user@$(terraform output -raw public_ip)

# Use the database endpoint in a connection command
psql -h $(terraform output -raw database_endpoint) -U admin -d mydb
```

## JSON Output

For programmatic access, get outputs in JSON format:

```bash
# Get all outputs as JSON
terraform output -json
```

Output:

```json
{
  "database_endpoint": {
    "sensitive": false,
    "type": "string",
    "value": "mydb.abc123.us-east-1.rds.amazonaws.com:5432"
  },
  "instance_id": {
    "sensitive": false,
    "type": "string",
    "value": "i-0abc123def456"
  },
  "public_ip": {
    "sensitive": false,
    "type": "string",
    "value": "54.123.45.67"
  }
}
```

Parse with `jq`:

```bash
# Extract a specific value with jq
terraform output -json | jq -r '.public_ip.value'

# Get all output values as a flat list
terraform output -json | jq -r 'to_entries[] | "\(.key)=\(.value.value)"'
```

## Output Types

Outputs can be any Terraform type: strings, numbers, booleans, lists, maps, and objects.

### String Output

```hcl
output "bucket_name" {
  value       = aws_s3_bucket.main.id
  description = "The name of the S3 bucket"
}
```

### Number Output

```hcl
output "instance_count" {
  value       = length(aws_instance.web)
  description = "The number of web server instances"
}
```

### List Output

```hcl
output "instance_ids" {
  value       = aws_instance.web[*].id
  description = "List of all web server instance IDs"
}

output "availability_zones" {
  value       = ["us-east-1a", "us-east-1b", "us-east-1c"]
  description = "Available AZs"
}
```

Accessing list outputs:

```bash
# Get the full list
terraform output instance_ids

# Get a specific element (using JSON output and jq)
terraform output -json instance_ids | jq '.[0]'
```

### Map Output

```hcl
output "instance_ips" {
  value = {
    for instance in aws_instance.web :
    instance.tags["Name"] => instance.public_ip
  }
  description = "Map of instance names to their public IPs"
}
```

```bash
# Get the map
terraform output instance_ips

# Get a specific key
terraform output -json instance_ips | jq '.["web-1"]'
```

### Complex Object Output

```hcl
output "server_info" {
  value = {
    id         = aws_instance.web.id
    public_ip  = aws_instance.web.public_ip
    private_ip = aws_instance.web.private_ip
    type       = aws_instance.web.instance_type
    az         = aws_instance.web.availability_zone
  }
  description = "Complete information about the web server"
}
```

## Sensitive Outputs

For outputs that contain secrets (passwords, tokens, private keys), mark them as sensitive:

```hcl
output "database_password" {
  value       = aws_db_instance.main.password
  description = "The database master password"
  sensitive   = true
}
```

Sensitive outputs are hidden in the terminal:

```text
Outputs:

database_password = <sensitive>
public_ip = "54.123.45.67"
```

To view a sensitive output:

```bash
# View the sensitive value (use -raw or -json)
terraform output -raw database_password

# Or in JSON format
terraform output -json database_password
```

The value is accessible programmatically; it is just hidden from casual display to prevent shoulder-surfing or accidental exposure in logs.

## Using Outputs in Scripts

Outputs are commonly used to feed values into other tools:

### Shell Scripts

```bash
#!/bin/bash
# deploy.sh - Deploy application to Terraform-managed infrastructure

# Get infrastructure details from Terraform outputs
SERVER_IP=$(terraform output -raw public_ip)
DB_HOST=$(terraform output -raw database_endpoint)
BUCKET=$(terraform output -raw bucket_name)

echo "Deploying to ${SERVER_IP}..."
echo "Database: ${DB_HOST}"
echo "Assets bucket: ${BUCKET}"

# Use the values
scp -r ./app ec2-user@${SERVER_IP}:/opt/app/
ssh ec2-user@${SERVER_IP} "cd /opt/app && DB_HOST=${DB_HOST} ./start.sh"
```

### Ansible Integration

```bash
# Generate Ansible inventory from Terraform outputs
echo "[web]" > inventory.ini
terraform output -json instance_ips | jq -r 'to_entries[] | .value' >> inventory.ini

# Run Ansible with the generated inventory
ansible-playbook -i inventory.ini playbook.yml
```

### Docker

```bash
# Pass Terraform outputs as Docker environment variables
docker run -d \
  -e DB_HOST=$(terraform output -raw database_endpoint) \
  -e BUCKET=$(terraform output -raw bucket_name) \
  myapp:latest
```

## Outputs Between Modules

One of the most important uses of outputs is sharing data between Terraform modules:

### Child Module Outputs

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "List of private subnet IDs"
}
```

### Consuming Module Outputs

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}

module "app" {
  source     = "./modules/app"
  vpc_id     = module.vpc.vpc_id      # Using the VPC module's output
  subnet_ids = module.vpc.subnet_ids   # Using the VPC module's output
}
```

### Root Module Outputs from Child Modules

To expose a child module's output at the root level:

```hcl
# Root outputs.tf
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID from the networking module"
}
```

## Outputs with Remote State

Outputs become even more powerful with remote state data sources. One Terraform configuration can read another configuration's outputs:

```hcl
# In the networking project
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```hcl
# In the application project, read the networking project's outputs
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
  # ...
}
```

This pattern lets you split infrastructure into manageable, independently-deployable configurations while still sharing data between them.

## Conditional Outputs

You can make outputs conditional:

```hcl
output "load_balancer_dns" {
  value       = var.enable_load_balancer ? aws_lb.main[0].dns_name : null
  description = "DNS name of the load balancer (if enabled)"
}
```

## Output Preconditions

Starting with Terraform 1.2, you can add preconditions to outputs:

```hcl
output "api_endpoint" {
  value       = "https://${aws_instance.api.public_ip}:8080"
  description = "The API endpoint URL"

  precondition {
    condition     = aws_instance.api.public_ip != ""
    error_message = "The API instance does not have a public IP assigned."
  }
}
```

This validates that the output value makes sense before displaying it.

## Refreshing Outputs

If the underlying resource attributes have changed (e.g., an EC2 instance got a new public IP after a reboot), you need to refresh the state:

```bash
# Refresh state to get current values
terraform refresh

# Then check the updated outputs
terraform output
```

Or use `terraform apply -refresh-only` for a safer approach:

```bash
# Refresh-only apply (updates state without changing resources)
terraform apply -refresh-only
```

## Best Practices

1. **Always include descriptions** - Future you (and your teammates) will thank you
2. **Mark sensitive outputs** - Prevent accidental exposure of secrets
3. **Use meaningful names** - `public_ip` is better than `output1`
4. **Output everything downstream systems need** - If another tool or team needs a value, output it
5. **Document outputs in your README** - List what outputs are available and what they contain
6. **Use typed outputs** - While Terraform infers types, being explicit helps documentation

```hcl
# Good output with all best practices
output "api_url" {
  value       = "https://${aws_lb.api.dns_name}"
  description = "The URL for the API load balancer. Use this to configure client applications."
  sensitive   = false
}
```

## Conclusion

`terraform output` is the bridge between Terraform and everything else in your workflow. It connects your infrastructure code to deployment scripts, monitoring configurations, other Terraform projects, and your team's documentation. Well-defined outputs make your Terraform configurations self-documenting and easy to integrate with. Define them thoughtfully, describe them clearly, and mark sensitive values appropriately.
