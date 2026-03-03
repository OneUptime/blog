# How to Fix Error Creating Security Group InvalidGroup Duplicate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, Security Groups, Troubleshooting

Description: Fix the InvalidGroup.Duplicate error when creating security groups with Terraform, caused by naming conflicts and state drift in AWS VPC configurations.

---

The `InvalidGroup.Duplicate` error occurs when Terraform tries to create a security group with a name that already exists in the same VPC. AWS requires that security group names be unique within a VPC, so if a group with that name already exists, the API rejects the request. This article explains why it happens and the different ways to resolve it.

## What the Error Looks Like

```text
Error: error creating Security Group (my-security-group):
InvalidGroup.Duplicate: The security group 'my-security-group'
already exists for VPC 'vpc-0abc123def456789'
    status code: 400, request id: abc123-def456
```

## Why This Happens

There are several scenarios that lead to this error:

### 1. The Security Group Was Created Outside of Terraform

Someone created a security group manually through the AWS console, CLI, or another tool with the same name that your Terraform configuration is trying to use. Terraform does not know about it because it is not in the state file.

### 2. Terraform State Is Out of Sync

The security group was previously created by Terraform, but the state got corrupted, was manually edited, or was lost. Terraform thinks the group does not exist and tries to create it again.

### 3. A Previous Apply Failed Partway Through

Terraform started creating the security group, the API call succeeded, but then something went wrong before the state could be saved. On the next run, Terraform tries to create it again.

### 4. Name Collision Across Modules or Workspaces

Multiple Terraform configurations or modules are trying to create security groups with the same name in the same VPC.

## Fix 1: Import the Existing Security Group

If the security group already exists and you want Terraform to manage it, import it into your state:

```bash
# First, find the security group ID
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=my-security-group" \
  --query "SecurityGroups[*].{ID:GroupId,Name:GroupName,VPC:VpcId}" \
  --output table

# Import it into your Terraform state
terraform import aws_security_group.my_sg sg-0abc123def456789
```

After importing, run `terraform plan` to see if there are any differences between the existing security group and your configuration. Adjust your configuration to match the existing group if needed.

## Fix 2: Delete the Existing Security Group

If the existing security group is no longer needed (maybe it was created accidentally), you can delete it and let Terraform create a new one:

```bash
# Check if anything is using the security group first
aws ec2 describe-network-interfaces \
  --filters "Name=group-id,Values=sg-0abc123def456789" \
  --query "NetworkInterfaces[*].{ID:NetworkInterfaceId,Description:Description}"

# If nothing is using it, delete it
aws ec2 delete-security-group --group-id sg-0abc123def456789
```

Then run `terraform apply` again.

## Fix 3: Use a Unique Name

If you need both security groups to coexist, change the name in your Terraform configuration:

```hcl
resource "aws_security_group" "my_sg" {
  name        = "my-security-group-v2"  # Changed name
  description = "My security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Fix 4: Use name_prefix Instead of name

To avoid naming collisions entirely, use `name_prefix` which lets Terraform generate a unique name:

```hcl
resource "aws_security_group" "my_sg" {
  name_prefix = "my-security-group-"
  description = "My security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

With `name_prefix`, Terraform appends a random suffix to the name, making it unique. The `create_before_destroy` lifecycle rule ensures that when the security group needs to be replaced, the new one is created before the old one is deleted, preventing downtime.

## Fix 5: Recover from a Partial Apply

If the error happened because a previous `terraform apply` failed partway through, you need to get the state back in sync. There are two approaches:

**Approach A: Import the orphaned resource.**

```bash
# Find the security group that was created
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=my-security-group" \
  --output json

# Import it
terraform import aws_security_group.my_sg sg-0abc123def456789
```

**Approach B: Remove it from AWS and let Terraform recreate it.**

```bash
# Delete the orphaned security group
aws ec2 delete-security-group --group-id sg-0abc123def456789

# Run apply again
terraform apply
```

## Preventing Duplicate Security Groups

### Use Consistent Naming Conventions

Establish a naming convention that includes the environment, project, and purpose:

```hcl
locals {
  sg_name = "${var.project}-${var.environment}-${var.purpose}"
}

resource "aws_security_group" "my_sg" {
  name        = local.sg_name  # e.g., "myapp-production-web"
  description = "Security group for ${var.purpose} in ${var.environment}"
  vpc_id      = var.vpc_id
}
```

### Use Tags for Identification

Tags help you identify who created a resource and why:

```hcl
resource "aws_security_group" "my_sg" {
  name        = "my-security-group"
  description = "My security group"
  vpc_id      = var.vpc_id

  tags = {
    Name        = "my-security-group"
    ManagedBy   = "terraform"
    Project     = var.project
    Environment = var.environment
  }
}
```

### Use Remote State

Store your Terraform state in a remote backend like S3 to prevent state loss:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "security-groups/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### Avoid Hardcoded Names Across Modules

If multiple modules need to reference the same security group, pass the security group ID as a variable rather than recreating it:

```hcl
# Root module creates the security group
module "security" {
  source = "./modules/security"
}

# Other modules reference it by ID
module "web_server" {
  source            = "./modules/web-server"
  security_group_id = module.security.web_sg_id
}

module "api_server" {
  source            = "./modules/api-server"
  security_group_id = module.security.web_sg_id
}
```

## Dealing with the Default Security Group

Every VPC has a default security group that you cannot delete or create. If you are trying to manage it with Terraform, use `aws_default_security_group` instead:

```hcl
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # Define rules or leave empty to restrict all traffic
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }
}
```

## Monitoring Security Group Changes

Track security group modifications with [OneUptime](https://oneuptime.com) to get alerted when unexpected changes occur. This helps catch manual changes that could cause conflicts with your Terraform configurations.

## Conclusion

The `InvalidGroup.Duplicate` error means a security group with the same name already exists in the VPC. The fix depends on why it exists: import it if you want Terraform to manage it, delete it if it is no longer needed, or change the name to avoid the collision. Using `name_prefix` instead of `name` is a practical way to prevent this error from happening in the first place.
