# How to Fix Error Launching Source Instance InvalidAMIID

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, Troubleshooting, Infrastructure as Code

Description: Resolve the InvalidAMIID.NotFound and InvalidAMIID.Malformed errors when launching EC2 instances with Terraform, including cross-region and marketplace AMI issues.

---

When you try to launch an EC2 instance with Terraform and get hit with an `InvalidAMIID` error, it means AWS cannot find the Amazon Machine Image you specified. This is a blocking error since the instance cannot be created without a valid AMI. The good news is there are only a handful of reasons this happens, and they are all straightforward to fix.

## What the Error Looks Like

```
Error: error launching source instance: InvalidAMIID.NotFound:
The image id 'ami-0abc123def456789' does not exist
    status code: 400, request id: abc123-def456

Error: error launching source instance: InvalidAMIID.Malformed:
Invalid id: "ami-wrong-format"
    status code: 400, request id: abc123-def456
```

There are two variants: `NotFound` means the AMI ID format is correct but the image does not exist, and `Malformed` means the ID itself is in the wrong format.

## Common Causes and Fixes

### 1. AMI Does Not Exist in the Target Region

This is the number one cause. AMIs are region-specific. An AMI that exists in `us-east-1` does not exist in `us-west-2`. If you copy an AMI ID from the AWS console while looking at one region and then use it in a Terraform configuration targeting a different region, you will get this error.

```hcl
provider "aws" {
  region = "us-west-2"  # But the AMI only exists in us-east-1
}

resource "aws_instance" "web" {
  ami           = "ami-0abc123def456789"  # This AMI is in us-east-1
  instance_type = "t3.micro"
}
```

**Fix:** Use the correct AMI ID for your target region. Each region has its own AMI IDs, even for the same operating system image. You can look up the correct AMI using the AWS CLI:

```bash
# Find the latest Amazon Linux 2023 AMI in your target region
aws ec2 describe-images \
  --region us-west-2 \
  --owners amazon \
  --filters "Name=name,Values=al2023-ami-2023*-x86_64" \
  --query "sort_by(Images, &CreationDate)[-1].ImageId" \
  --output text
```

Or better yet, use a data source in Terraform to dynamically find the AMI:

```hcl
# Dynamically look up the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
}
```

This approach automatically finds the right AMI for whatever region your provider is configured to use.

### 2. AMI Has Been Deregistered

AMIs can be deregistered (deleted) by their owner. If you are referencing a specific AMI ID that was available when you first wrote your configuration but has since been deregistered, you will get the NotFound error.

This is especially common with:
- AWS Marketplace AMIs that get updated
- Community AMIs that are maintained by third parties
- Custom AMIs that a team member deleted

**Fix:** Find the replacement AMI. If it was an AWS-provided AMI, use the data source approach shown above. If it was a custom AMI, check with whoever manages your AMI pipeline.

```bash
# Check if an AMI exists
aws ec2 describe-images --image-ids ami-0abc123def456789

# If it returns empty, the AMI has been deregistered
```

### 3. Malformed AMI ID

AMI IDs follow a specific format: `ami-` followed by a hex string. Anything else will result in a Malformed error.

```hcl
# WRONG formats
ami = "i-0abc123def456789"     # This is an instance ID, not an AMI
ami = "0abc123def456789"        # Missing the ami- prefix
ami = "ami-ZZZZ"               # Contains non-hex characters
ami = ""                        # Empty string

# CORRECT format
ami = "ami-0abc123def456789"
```

If you are using a variable, make sure it is being set correctly:

```hcl
variable "ami_id" {
  type = string
  validation {
    condition     = can(regex("^ami-[a-f0-9]+$", var.ami_id))
    error_message = "The AMI ID must start with 'ami-' followed by hexadecimal characters."
  }
}
```

### 4. AMI Permissions Issue

Some AMIs are private and only shared with specific AWS accounts. If you try to use an AMI that has not been shared with your account, you get NotFound rather than an access denied error:

```bash
# Check if you have access to the AMI
aws ec2 describe-images --image-ids ami-0abc123def456789

# If you get an empty result but someone else can see it,
# it is a permissions issue
```

**Fix:** Ask the AMI owner to share it with your account, or use a public AMI.

```bash
# The AMI owner can share it with your account
aws ec2 modify-image-attribute \
  --image-id ami-0abc123def456789 \
  --launch-permission "Add=[{UserId=123456789012}]"
```

### 5. Using an AMI from AWS Marketplace Without Subscribing

AWS Marketplace AMIs require you to subscribe before you can launch instances with them. If you try to use one without subscribing, you might get an InvalidAMIID or a subscription-related error.

**Fix:** Go to the AWS Marketplace listing for the AMI and click "Subscribe." Then use the AMI ID from the subscription:

```hcl
# After subscribing to the marketplace product
resource "aws_instance" "marketplace" {
  ami           = "ami-marketplace-id-here"
  instance_type = "t3.micro"
}
```

### 6. Incorrect Variable Interpolation

Sometimes the AMI ID is constructed dynamically and the interpolation goes wrong:

```hcl
# WRONG - variable not resolved properly
locals {
  ami_map = {
    us-east-1 = "ami-0abc123"
    us-west-2 = "ami-0def456"
  }
}

resource "aws_instance" "web" {
  # If var.region does not match any key, this returns null
  ami           = lookup(local.ami_map, var.region, "")
  instance_type = "t3.micro"
}
```

**Fix:** Add proper error handling:

```hcl
resource "aws_instance" "web" {
  ami           = lookup(local.ami_map, var.region, null)
  instance_type = "t3.micro"

  lifecycle {
    precondition {
      condition     = contains(keys(local.ami_map), var.region)
      error_message = "No AMI configured for region ${var.region}"
    }
  }
}
```

## Best Practices for AMI Management

### Use Data Sources Instead of Hardcoded IDs

Data sources are the best way to avoid this error entirely:

```hcl
# For Ubuntu
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

# For Windows Server
data "aws_ami" "windows" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }
}
```

### Use SSM Parameter Store for AMI Lookups

AWS publishes the latest AMI IDs to SSM Parameter Store:

```hcl
# Get the latest Amazon Linux 2023 AMI from SSM
data "aws_ssm_parameter" "amazon_linux" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
}

resource "aws_instance" "web" {
  ami           = data.aws_ssm_parameter.amazon_linux.value
  instance_type = "t3.micro"
}
```

### Pin AMI Versions in Production

While data sources are great for development, you might want to pin specific AMI versions in production to avoid unexpected changes:

```hcl
# Use a variable that gets updated through your CI/CD pipeline
variable "production_ami" {
  type    = string
  default = "ami-0abc123def456789"
}
```

## Monitoring and Alerting

Set up monitoring with [OneUptime](https://oneuptime.com) to get alerted when your EC2 instances fail to launch or when AMIs you depend on are about to be deprecated. This gives you time to update your configurations before they break.

## Conclusion

The `InvalidAMIID` error is almost always caused by using an AMI from the wrong region or referencing an AMI that has been deregistered. The best prevention is to use Terraform data sources or SSM parameters to dynamically look up AMI IDs rather than hardcoding them. This way, your configurations will always find the right AMI for the target region and never reference a stale ID.
