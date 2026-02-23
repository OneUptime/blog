# How to Migrate from CloudFormation to Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CloudFormation, AWS, Migration, Infrastructure as Code

Description: Learn how to migrate your AWS CloudFormation stacks to Terraform with step-by-step instructions covering state import, configuration mapping, and validation.

---

AWS CloudFormation and Terraform both manage infrastructure as code, but many teams choose to migrate from CloudFormation to Terraform for multi-cloud support, a richer ecosystem, and more flexible state management. This migration requires careful planning because you need to transfer resource ownership without recreating or disrupting existing infrastructure. This guide walks you through the complete migration process.

## Why Migrate from CloudFormation to Terraform

Teams migrate for several reasons. Terraform supports multiple cloud providers, enabling a unified workflow for multi-cloud environments. The Terraform module registry provides thousands of reusable modules. HCL is often considered more readable than CloudFormation's JSON or YAML. Terraform's plan command gives a clear preview of changes before applying. Additionally, Terraform's state management and import capabilities have matured significantly.

## Understanding the Migration Challenge

CloudFormation stacks own the resources they create. If you simply delete a stack, it deletes all its resources. The migration must transfer resource management from CloudFormation to Terraform without deleting anything. This involves three main steps: writing equivalent Terraform configuration, importing existing resources into Terraform state, and then carefully removing the resources from CloudFormation without destroying them.

## Step 1: Inventory Your CloudFormation Stacks

Start by listing all stacks and their resources:

```bash
# List all CloudFormation stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[].[StackName,CreationTime]' \
  --output table

# List resources in a specific stack
aws cloudformation list-stack-resources \
  --stack-name my-app-stack \
  --query 'StackResourceSummaries[].[LogicalResourceId,ResourceType,PhysicalResourceId]' \
  --output table

# Export the full template for reference
aws cloudformation get-template \
  --stack-name my-app-stack \
  --query 'TemplateBody' \
  --output text > cf-template.yaml
```

## Step 2: Map CloudFormation Resources to Terraform

Create a mapping between CloudFormation resource types and Terraform resource types:

```
CloudFormation                          Terraform
--------------                          ---------
AWS::EC2::Instance                  ->  aws_instance
AWS::EC2::VPC                       ->  aws_vpc
AWS::EC2::Subnet                    ->  aws_subnet
AWS::EC2::SecurityGroup             ->  aws_security_group
AWS::S3::Bucket                     ->  aws_s3_bucket
AWS::RDS::DBInstance                ->  aws_db_instance
AWS::Lambda::Function               ->  aws_lambda_function
AWS::IAM::Role                      ->  aws_iam_role
AWS::ElasticLoadBalancingV2::LoadBalancer -> aws_lb
```

## Step 3: Write Terraform Configuration

Convert your CloudFormation template to Terraform configuration. Here is an example conversion:

CloudFormation YAML:

```yaml
Resources:
  WebVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: web-vpc

  WebSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref WebVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: us-east-1a
      Tags:
        - Key: Name
          Value: web-subnet

  WebInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.medium
      ImageId: ami-0abcdef1234567890
      SubnetId: !Ref WebSubnet
```

Equivalent Terraform:

```hcl
# Terraform equivalent of the CloudFormation stack
resource "aws_vpc" "web" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "web-vpc"
  }
}

resource "aws_subnet" "web" {
  vpc_id            = aws_vpc.web.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "web-subnet"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.web.id
}
```

## Step 4: Import Resources into Terraform

Use import blocks to bring the existing resources under Terraform management:

```hcl
# imports.tf
# Get the physical resource IDs from CloudFormation
import {
  to = aws_vpc.web
  id = "vpc-0abc123def456"  # Physical ID from CloudFormation
}

import {
  to = aws_subnet.web
  id = "subnet-0abc123def456"
}

import {
  to = aws_instance.web
  id = "i-0abc123def456789a"
}
```

Find the physical resource IDs:

```bash
# Get physical IDs from CloudFormation
aws cloudformation describe-stack-resources \
  --stack-name my-app-stack \
  --query 'StackResources[].[LogicalResourceId,PhysicalResourceId]' \
  --output table
```

Run the import:

```bash
terraform init
terraform plan   # Review the import plan
terraform apply  # Execute the imports
```

## Step 5: Verify the Import

Run terraform plan and ensure no changes are shown:

```bash
terraform plan
# Should show: No changes. Your infrastructure matches the configuration.
```

If there are differences, update your Terraform configuration to match the actual resource state.

## Step 6: Remove Resources from CloudFormation

This is the critical step. You need to remove resources from CloudFormation without deleting them. CloudFormation supports a DeletionPolicy of Retain:

```yaml
# Update the CloudFormation template to retain all resources
Resources:
  WebVPC:
    Type: AWS::EC2::VPC
    DeletionPolicy: Retain
    Properties:
      CidrBlock: 10.0.0.0/16
      # ...

  WebSubnet:
    Type: AWS::EC2::Subnet
    DeletionPolicy: Retain
    Properties:
      # ...

  WebInstance:
    Type: AWS::EC2::Instance
    DeletionPolicy: Retain
    Properties:
      # ...
```

Apply the updated template:

```bash
# Update the stack with DeletionPolicy: Retain on all resources
aws cloudformation update-stack \
  --stack-name my-app-stack \
  --template-body file://cf-template-with-retain.yaml

# Wait for the update to complete
aws cloudformation wait stack-update-complete --stack-name my-app-stack

# Now safely delete the stack (resources are retained)
aws cloudformation delete-stack --stack-name my-app-stack

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name my-app-stack
```

## Step 7: Final Verification

After deleting the CloudFormation stack, verify Terraform still manages the resources correctly:

```bash
# Verify Terraform still tracks the resources
terraform plan
# Should show: No changes.

# Verify resources are still running
aws ec2 describe-instances --instance-ids i-0abc123def456789a --query 'Reservations[0].Instances[0].State.Name'
```

## Automating the Migration

For stacks with many resources, automate the process:

```bash
#!/bin/bash
# cf-to-terraform.sh
# Generate Terraform imports from a CloudFormation stack

STACK_NAME=$1
OUTPUT_DIR="./migrated"
mkdir -p "$OUTPUT_DIR"

# Get all resources from the stack
RESOURCES=$(aws cloudformation describe-stack-resources \
  --stack-name "$STACK_NAME" \
  --query 'StackResources[].[ResourceType,LogicalResourceId,PhysicalResourceId]' \
  --output text)

echo "# Import blocks for stack: $STACK_NAME" > "$OUTPUT_DIR/imports.tf"

while IFS=$'\t' read -r type logical physical; do
  # Map CF type to Terraform type
  case "$type" in
    "AWS::EC2::Instance")
      TF_TYPE="aws_instance"
      ;;
    "AWS::EC2::VPC")
      TF_TYPE="aws_vpc"
      ;;
    "AWS::EC2::Subnet")
      TF_TYPE="aws_subnet"
      ;;
    "AWS::S3::Bucket")
      TF_TYPE="aws_s3_bucket"
      ;;
    *)
      echo "# Unsupported type: $type ($logical)" >> "$OUTPUT_DIR/imports.tf"
      continue
      ;;
  esac

  # Convert logical ID to Terraform name
  TF_NAME=$(echo "$logical" | sed 's/[A-Z]/_\L&/g' | sed 's/^_//')

  cat >> "$OUTPUT_DIR/imports.tf" <<EOF
import {
  to = ${TF_TYPE}.${TF_NAME}
  id = "${physical}"
}

EOF

done <<< "$RESOURCES"

echo "Generated import blocks in $OUTPUT_DIR/imports.tf"
```

## Using cf2tf for Automated Conversion

The cf2tf tool can automatically convert CloudFormation templates to Terraform:

```bash
# Install cf2tf
pip install cf2tf

# Convert a CloudFormation template to Terraform
cf2tf my-template.yaml --output ./terraform-output

# Review the generated Terraform code
cat ./terraform-output/main.tf
```

While the output needs review and cleanup, it provides a good starting point for large templates.

## Best Practices

Migrate one stack at a time to keep the process manageable. Always set DeletionPolicy to Retain before deleting CloudFormation stacks. Test the migration in a non-production environment first. Keep both CloudFormation templates and Terraform configurations in version control throughout the migration. Run `terraform plan` frequently during the process to catch issues early. Document each step of the migration for team reference.

## Conclusion

Migrating from CloudFormation to Terraform is a methodical process that requires careful coordination between the two tools. The key insight is using CloudFormation's DeletionPolicy Retain to safely transfer resource ownership. By following this step-by-step approach and automating where possible, you can migrate even large CloudFormation environments to Terraform without disrupting your running infrastructure.

For related migrations, see [How to Migrate from ARM Templates to Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-arm-templates-to-terraform/view) and [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view).
