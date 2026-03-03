# How to Use terraform state show to Inspect a Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI Commands, Debugging, Infrastructure as Code

Description: Complete guide to using terraform state show to inspect individual resources in Terraform state, including output format, practical debugging scenarios, and scripting techniques.

---

While `terraform state list` tells you what resources exist, `terraform state show` tells you everything about a specific resource. It displays all the attributes Terraform has recorded for a resource instance, making it invaluable for debugging, verifying configurations, and understanding the current state of your infrastructure.

## Basic Usage

Pass a resource address to see its details:

```bash
# Show all attributes of a specific resource
terraform state show aws_instance.web
```

Output:

```hcl
# aws_instance.web:
resource "aws_instance" "web" {
    ami                                  = "ami-0c55b159cbfafe1f0"
    arn                                  = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456789"
    associate_public_ip_address          = true
    availability_zone                    = "us-east-1a"
    cpu_core_count                       = 1
    cpu_threads_per_core                 = 1
    disable_api_stop                     = false
    disable_api_termination              = false
    ebs_optimized                        = false
    get_password_data                    = false
    hibernation                          = false
    id                                   = "i-0abc123def456789"
    instance_initiated_shutdown_behavior = "stop"
    instance_state                       = "running"
    instance_type                        = "t2.micro"
    ipv6_address_count                   = 0
    ipv6_addresses                       = []
    monitoring                           = false
    primary_network_interface_id         = "eni-0abc123"
    private_dns                          = "ip-10-0-1-50.ec2.internal"
    private_ip                           = "10.0.1.50"
    public_dns                           = "ec2-54-123-45-67.compute-1.amazonaws.com"
    public_ip                            = "54.123.45.67"
    secondary_private_ips                = []
    security_groups                      = []
    source_dest_check                    = true
    subnet_id                            = "subnet-0abc123"
    tags                                 = {
        "Environment" = "production"
        "Name"        = "web-server"
    }
    tags_all                             = {
        "Environment" = "production"
        "Name"        = "web-server"
    }
    tenancy                              = "default"
    vpc_security_group_ids               = [
        "sg-0abc123",
    ]

    root_block_device {
        delete_on_termination = true
        device_name           = "/dev/xvda"
        encrypted             = true
        iops                  = 100
        throughput            = 0
        volume_id             = "vol-0abc123"
        volume_size           = 20
        volume_type           = "gp2"
    }
}
```

The output uses HCL format, showing every attribute Terraform tracks for that resource.

## Showing Indexed Resources

For resources created with `count`:

```bash
# Show a specific count-based instance
terraform state show 'aws_instance.worker[0]'
terraform state show 'aws_instance.worker[1]'
```

For resources created with `for_each`:

```bash
# Show a specific for_each instance
terraform state show 'aws_s3_bucket.data["logs"]'
terraform state show 'aws_s3_bucket.data["backups"]'
```

The quoting is important. Use single quotes around the address to prevent shell interpretation of brackets and double quotes.

## Showing Module Resources

For resources inside modules:

```bash
# Show a resource inside a module
terraform state show module.networking.aws_vpc.main

# Nested module
terraform state show module.app.module.database.aws_db_instance.main
```

## Showing Data Sources

Data sources use the `data.` prefix:

```bash
# Show a data source
terraform state show data.aws_ami.ubuntu

# Output:
# data.aws_ami.ubuntu:
# data "aws_ami" "ubuntu" {
#     architecture          = "x86_64"
#     arn                   = "arn:aws:ec2:us-east-1::image/ami-0c55b159cbfafe1f0"
#     ...
# }
```

## Practical Debugging Scenarios

### Verifying Resource Configuration

After an apply, verify that a resource was created with the expected configuration:

```bash
# Check that the instance has the right type and AMI
terraform state show aws_instance.web | grep -E "instance_type|ami"

# Output:
#     ami                  = "ami-0c55b159cbfafe1f0"
#     instance_type        = "t2.micro"
```

### Finding Resource IDs

Need the AWS resource ID for the console or CLI?

```bash
# Get the instance ID
terraform state show aws_instance.web | grep "id "

# Get the VPC ID
terraform state show aws_vpc.main | grep "id "

# Get the security group ID
terraform state show aws_security_group.web | grep "id "
```

### Checking Security Group Rules

```bash
# View all attributes of a security group
terraform state show aws_security_group.web

# Look for specific ingress rules
terraform state show aws_security_group.web | grep -A5 "ingress"
```

### Verifying Tags

```bash
# Check what tags are applied to a resource
terraform state show aws_instance.web | grep -A10 "tags "
```

### Checking Network Configuration

```bash
# Verify subnet and VPC associations
terraform state show aws_instance.web | grep -E "subnet_id|vpc_security_group_ids|private_ip|public_ip"
```

## Comparing Expected vs. Actual

Use `terraform state show` alongside `terraform plan` to understand drift:

```bash
# First, see what Terraform has recorded
terraform state show aws_instance.web

# Then, see what changes Terraform wants to make
terraform plan -target=aws_instance.web
```

If the plan shows changes, the state show output represents the old values, and the plan shows what will change.

## Scripting with terraform state show

### Extract Specific Attributes

```bash
# Get just the public IP of an instance
terraform state show -no-color aws_instance.web | grep "public_ip" | awk '{print $NF}' | tr -d '"'

# Get the ARN
terraform state show -no-color aws_instance.web | grep "arn " | awk '{print $NF}' | tr -d '"'
```

### Generate an Inventory

```bash
#!/bin/bash
# inventory.sh - Generate an inventory of all instances

echo "Instance Inventory"
echo "=================="

for instance in $(terraform state list aws_instance); do
  # Extract key attributes
  name=$(terraform state show -no-color "$instance" | grep 'tags_all' -A20 | grep '"Name"' | awk -F'"' '{print $4}')
  ip=$(terraform state show -no-color "$instance" | grep "private_ip " | head -1 | awk '{print $NF}' | tr -d '"')
  type=$(terraform state show -no-color "$instance" | grep "instance_type " | awk '{print $NF}' | tr -d '"')
  state=$(terraform state show -no-color "$instance" | grep "instance_state " | awk '{print $NF}' | tr -d '"')

  echo "$instance: name=$name ip=$ip type=$type state=$state"
done
```

### Compare Resources

```bash
# Compare two instances
diff <(terraform state show aws_instance.web) <(terraform state show aws_instance.worker[0])
```

## JSON Output

For structured processing, use `terraform show -json` and filter with jq:

```bash
# Get the full state as JSON
terraform show -json | jq '.values.root_module.resources[] | select(.address == "aws_instance.web")'

# Extract specific attributes from JSON
terraform show -json | jq -r '.values.root_module.resources[] | select(.type == "aws_instance") | "\(.address): \(.values.instance_type) \(.values.private_ip)"'
```

Note: `terraform show -json` shows the entire state, while `terraform state show` is for individual resources. For scripting with specific resources, the JSON approach with jq is often cleaner.

## Sensitive Values

Some attributes are marked as sensitive by the provider. In the output, these appear as `(sensitive value)`:

```bash
terraform state show aws_db_instance.main

# Output includes:
#     password = (sensitive value)
```

To see the actual sensitive value, use `terraform state pull` and parse the raw JSON:

```bash
# Get the raw state and extract the sensitive value
terraform state pull | jq '.resources[] | select(.type == "aws_db_instance") | .instances[].attributes.password'
```

This is intentional - `terraform state show` protects sensitive values in its display, but the raw state still contains them.

## Common Errors

### Resource Not Found

```text
No instance found for the given address!
```

This means the address does not exist in state. Double-check with `terraform state list`:

```bash
# Find the correct address
terraform state list | grep instance

# Then use the exact address from the output
terraform state show aws_instance.web
```

### Wrong Quoting

```bash
# This fails because of shell interpretation
terraform state show aws_s3_bucket.data["logs"]

# This works - single quotes protect the special characters
terraform state show 'aws_s3_bucket.data["logs"]'
```

## terraform state show vs terraform show

These are different commands:

- `terraform state show <address>` - Shows one specific resource from state
- `terraform show` - Shows the entire state or a plan file in human-readable format
- `terraform show -json` - Shows the entire state or plan as JSON

Use `state show` when you want to inspect a single resource. Use `show` when you want the big picture.

## Summary

The `terraform state show` command is your go-to tool for inspecting individual resources in Terraform state. It reveals every attribute Terraform tracks, from basic configuration to computed values like ARNs and IDs. Use it for debugging, verification, inventory generation, and understanding your infrastructure's current state. For listing all resources first, start with [terraform state list](https://oneuptime.com/blog/post/2026-02-23-terraform-state-list-command/view). For modifying resources in state, see [terraform state mv](https://oneuptime.com/blog/post/2026-02-23-terraform-state-mv-command/view).
