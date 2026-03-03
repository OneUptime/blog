# How to Use Terraformer to Auto-Generate Terraform from Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraformer, Infrastructure as Code, Cloud Migration, Reverse Engineering

Description: Learn how to use Terraformer to automatically generate Terraform configuration files from your existing cloud infrastructure resources.

---

Managing cloud infrastructure manually is tedious and error-prone. If you already have resources running in the cloud but lack Terraform configurations for them, rewriting everything by hand can take days or weeks. Terraformer solves this problem by reverse-engineering your existing cloud infrastructure into Terraform code. In this guide, you will learn how to install, configure, and use Terraformer to auto-generate Terraform configurations from AWS, GCP, Azure, and other cloud providers.

## What Is Terraformer?

Terraformer is an open-source CLI tool created by Google that generates Terraform files from existing infrastructure. It connects to your cloud provider APIs, reads the current state of your resources, and outputs both `.tf` configuration files and `.tfstate` state files. This means you can bring existing infrastructure under Terraform management without writing a single line of HCL from scratch.

Terraformer supports a wide range of providers including AWS, GCP, Azure, Kubernetes, GitHub, Datadog, and many more. It is especially useful when teams have been provisioning resources manually through the console and need to adopt Infrastructure as Code practices.

## Installing Terraformer

Before installing Terraformer, make sure you have Terraform installed on your machine. Terraformer depends on Terraform to validate and format the generated configurations.

On macOS, you can install Terraformer using Homebrew:

```bash
# Install Terraformer via Homebrew
brew install terraformer
```

On Linux, download the binary directly:

```bash
# Download the Terraformer binary for Linux
export PROVIDER=aws
curl -LO "https://github.com/GoogleCloudPlatform/terraformer/releases/download/$(curl -s https://api.github.com/repos/GoogleCloudPlatform/terraformer/releases/latest | grep tag_name | cut -d '"' -f 4)/terraformer-${PROVIDER}-linux-amd64"

# Make the binary executable
chmod +x terraformer-${PROVIDER}-linux-amd64

# Move it to your PATH
sudo mv terraformer-${PROVIDER}-linux-amd64 /usr/local/bin/terraformer
```

You also need the Terraform provider plugin for your cloud provider. Create a directory and initialize it:

```bash
# Create a working directory
mkdir terraformer-import && cd terraformer-import

# Create a minimal provider configuration
cat > main.tf <<EOF
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
EOF

# Initialize Terraform to download the provider plugin
terraform init
```

## Generating Terraform from AWS

Once installed and configured, you can generate Terraform code from your AWS account. Terraformer reads your AWS credentials from environment variables or your AWS credentials file.

```bash
# Export AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Import all EC2 instances
terraformer import aws --resources=ec2_instance --regions=us-east-1

# Import multiple resource types
terraformer import aws --resources=ec2_instance,vpc,subnet,security_group --regions=us-east-1

# Import all supported resources
terraformer import aws --resources=* --regions=us-east-1
```

Terraformer creates a `generated/` directory with subdirectories organized by provider and resource type. Each resource type gets its own `.tf` file and a corresponding state file.

## Generating Terraform from GCP

For Google Cloud Platform, authenticate using a service account or your default credentials:

```bash
# Set your GCP project
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_PROJECT="my-gcp-project"

# Import compute instances from GCP
terraformer import google --resources=instances --projects=my-gcp-project --regions=us-central1

# Import networking resources
terraformer import google --resources=networks,subnetworks,firewalls --projects=my-gcp-project --regions=us-central1
```

## Generating Terraform from Azure

For Azure, ensure you have the Azure CLI installed and authenticated:

```bash
# Login to Azure
az login

# Import Azure resources
terraformer import azure --resources=resource_group,virtual_machine --resource-group=my-rg
```

## Filtering Resources

Terraformer supports filtering to import only specific resources. This is useful when you have hundreds of resources but only want to manage a subset with Terraform.

```bash
# Filter by resource ID
terraformer import aws --resources=ec2_instance \
  --filter="Name=id;Value=i-0abc123def456789a:i-0def456ghi789012b" \
  --regions=us-east-1

# Filter by tags
terraformer import aws --resources=ec2_instance \
  --filter="Name=tags.Environment;Value=production" \
  --regions=us-east-1
```

## Understanding the Output

After running Terraformer, examine the generated directory structure:

```text
generated/
  aws/
    ec2_instance/
      instance.tf        # Resource configurations
      outputs.tf         # Output definitions
      provider.tf        # Provider configuration
      terraform.tfstate  # State file
    vpc/
      vpc.tf
      outputs.tf
      provider.tf
      terraform.tfstate
```

The generated `.tf` files contain your resources with all their attributes. However, they often include read-only attributes and computed values that you should clean up:

```hcl
# Example generated EC2 instance (before cleanup)
resource "aws_instance" "tfer--i-0abc123def456789a" {
  ami                         = "ami-0abcdef1234567890"
  instance_type               = "t3.medium"
  key_name                    = "my-key"
  subnet_id                   = "subnet-0abc123"
  vpc_security_group_ids      = ["sg-0abc123"]

  # These computed attributes should be removed
  arn                         = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123def456789a"
  private_ip                  = "10.0.1.50"
  public_ip                   = "54.123.45.67"

  tags = {
    Name        = "web-server-1"
    Environment = "production"
  }
}
```

## Cleaning Up Generated Code

The auto-generated code usually needs cleanup before it is production-ready. Here are the key steps:

1. Remove computed and read-only attributes that Terraform manages automatically.
2. Replace hardcoded IDs with references to other resources.
3. Rename resources from auto-generated names to meaningful ones.
4. Add variables for values that differ between environments.
5. Organize resources into logical modules.

```hcl
# Cleaned up version
resource "aws_instance" "web_server" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name        = "web-server-1"
    Environment = var.environment
  }
}
```

## Migrating the State

After cleaning up the generated code, you need to handle the state file. Terraformer generates individual state files per resource type. You can merge them into a single state file:

```bash
# Initialize a new Terraform workspace with your cleaned-up code
terraform init

# Move state from generated files to your new state
terraform state mv -state=generated/aws/ec2_instance/terraform.tfstate \
  -state-out=terraform.tfstate \
  aws_instance.tfer--i-0abc123def456789a \
  aws_instance.web_server

# Verify the plan shows no changes
terraform plan
```

The goal is to reach a state where `terraform plan` shows no changes, confirming that your configuration matches the actual infrastructure.

## Best Practices

When using Terraformer, keep these recommendations in mind. Start with a small subset of resources rather than importing everything at once. This makes the cleanup process manageable. Always run `terraform plan` after importing to verify that your configuration matches the real infrastructure. Use version control to track your generated and cleaned-up configurations separately. Consider using Terraformer as a starting point and not as a final solution since the generated code will always need human review and refinement.

For large-scale imports, consider writing a script that runs Terraformer for each resource type, cleans up common issues automatically, and then merges the results. This approach scales much better than manual cleanup for hundreds of resources.

## Conclusion

Terraformer is a powerful tool for bringing existing cloud infrastructure under Terraform management. By auto-generating configurations and state files, it eliminates the most tedious part of adopting Infrastructure as Code. While the generated code needs cleanup, it provides a solid foundation that saves hours of manual work. Start with a small import, refine your workflow, and gradually bring your entire cloud environment under Terraform control.

For more Terraform migration strategies, check out our guide on [How to Import Resources into Modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-resources-into-modules-in-terraform/view) and [How to Import Large Numbers of Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-large-numbers-of-resources-in-terraform/view).
