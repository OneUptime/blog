# How to Import AWS EC2 Instances into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, EC2, Import, State Management

Description: Learn how to import existing AWS EC2 instances into OpenTofu state, write matching HCL configurations, and avoid configuration drift after import.

## Introduction

EC2 instances created outside of OpenTofu - through the console, CLI, or other tools - can be brought under management using `tofu import`. After import, OpenTofu tracks the instance and can apply configuration changes, but you must first define the instance in HCL and then reconcile any differences after import.

## Step 1: Find the Instance ID

```bash
# Find EC2 instance ID by tag or name

aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=my-app-server" \
  --query 'Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key==`Name`].Value|[0]]' \
  --output table

# Example output includes: i-0123456789abcdef0
```

## Step 2: Write the HCL Configuration

Before importing, write the `resource` block and make it match the existing instance configuration as closely as possible:

```hcl
# main.tf
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"  # Must match existing AMI
  instance_type = "t3.medium"               # Must match existing type
  subnet_id     = "subnet-0123456789abcdef0"

  vpc_security_group_ids = ["sg-0123456789abcdef0"]
  key_name               = "my-keypair"

  # Match existing root volume configuration
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "my-app-server"
    Environment = "prod"
  }
}
```

## Step 3: Import the Instance

```bash
# Initialize and then import
tofu init
tofu import aws_instance.app i-0123456789abcdef0
```

## Step 4: Reconcile State and HCL

After import, run plan to see if there are differences:

```bash
tofu plan
```

The plan will show any differences between your HCL and the actual instance configuration. Common differences to reconcile:

```bash
# Check actual instance attributes to fill in your HCL
aws ec2 describe-instances \
  --instance-ids i-0123456789abcdef0 \
  --query 'Reservations[0].Instances[0]' \
  --output json | jq '{
    instance_type: .InstanceType,
    ami: .ImageId,
    subnet_id: .SubnetId,
    security_groups: [.SecurityGroups[].GroupId],
    key_name: .KeyName,
    iam_instance_profile: (.IamInstanceProfile.Arn | if . then split("/")[-1] else null end)
  }'
```

## Step 5: Using the import Block (OpenTofu 1.6+, experimental)

The declarative `import` block is an alternative to the CLI command and can be version controlled:

```hcl
# Import block - reviewed during plan, executed during apply, can be version controlled
import {
  to = aws_instance.app
  id = "i-0123456789abcdef0"
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  subnet_id     = "subnet-0123456789abcdef0"
  tags          = { Name = "my-app-server" }
}
```

## Attributes to Ignore After Import

Some attributes are intentionally managed outside of OpenTofu, or you may not want changes to them to trigger updates:

```hcl
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"

  lifecycle {
    # Ignore changes to user_data if it is updated outside OpenTofu
    # Ignore changes to ami if your configuration resolves the latest AMI
    ignore_changes = [user_data, ami]
  }
}
```

## Conclusion

Importing EC2 instances requires defining the instance in HCL, then reconciling the configuration with the existing resource after import. The `import` block approach is declarative and version-controlled. After import, always run `tofu plan` and resolve any differences before making changes, to avoid accidental instance replacement.
