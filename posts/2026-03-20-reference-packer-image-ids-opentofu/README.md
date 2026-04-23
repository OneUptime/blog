# How to Reference Packer Image IDs in OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, Image IDs, Data Source, Versioning

Description: Learn multiple strategies for referencing Packer-built image IDs in OpenTofu configurations, from dynamic data source lookups to pinned version variables.

## Introduction

Referencing Packer image IDs in OpenTofu requires deciding between dynamic (always-latest) and pinned (specific-version) strategies. The right approach depends on whether you want automatic or controlled rollouts.

## Strategy 1: Data Source with Tag Filters (Dynamic)

```hcl
# Always use the most recent image

data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:Application"
    values = ["myapp"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_launch_template" "app" {
  image_id = data.aws_ami.app.id
}
```

## Strategy 2: Pin via Variable (Controlled Rollout)

```hcl
# variables.tf
variable "app_ami_id" {
  type        = string
  description = "AMI ID for the application server (from Packer build)"
  # No default - must be explicitly set
}

# main.tf
resource "aws_launch_template" "app" {
  image_id = var.app_ami_id
}
```

```bash
# CI/CD: Get AMI ID from Packer manifest and pass to OpenTofu
AMI_ID=$(cat packer-manifest.json | jq -r '.builds[-1].artifact_id | split(":") | .[1]')

tofu apply -var="app_ami_id=${AMI_ID}" -auto-approve
```

## Reading from Packer Manifest File

```hcl
# Read the Packer manifest directly in OpenTofu
locals {
  packer_manifest = jsondecode(file("${path.module}/packer-manifest.json"))
  latest_build    = local.packer_manifest.builds[length(local.packer_manifest.builds) - 1]
  # artifact_id format: "us-east-1:ami-0123456789abcdef0"
  ami_id          = split(":", local.latest_build.artifact_id)[1]
  # custom_data is only present if the manifest post-processor was configured with it
  image_version   = try(local.latest_build.custom_data.version, null)
}

resource "aws_launch_template" "app" {
  image_id = local.ami_id

  tags = local.image_version != null ? {
    ImageVersion = local.image_version
  } : {}
}
```

## Packer Manifest Structure

```json
{
  "builds": [
    {
      "name": "app-server",
      "builder_type": "amazon-ebs",
      "build_time": 1705334400,
      "artifact_id": "us-east-1:ami-0123456789abcdef0",
      "custom_data": {
        "version": "1.2.3",
        "git_sha": "abc1234"
      }
    }
  ],
  "last_run_uuid": "abc-def-123"
}
```

## Strategy 3: SSM Parameter Store as Image Registry

```bash
# After Packer build, store the AMI ID in SSM
AMI_ID=$(cat packer-manifest.json | jq -r '.builds[-1].artifact_id | split(":") | .[1]')
aws ssm put-parameter \
  --name "/images/app-server/latest" \
  --value "$AMI_ID" \
  --type String \
  --overwrite

# Store versioned reference too
APP_VERSION="1.2.3"
aws ssm put-parameter \
  --name "/images/app-server/${APP_VERSION}" \
  --value "$AMI_ID" \
  --type String \
  --overwrite
```

```hcl
# OpenTofu reads from SSM
variable "use_latest_ami" {
  type    = bool
  default = true
}

variable "app_version" {
  type        = string
  description = "Pinned app version when use_latest_ami is false"
  default     = "1.2.3"
}

data "aws_ssm_parameter" "app_ami" {
  name = var.use_latest_ami ? "/images/app-server/latest" : "/images/app-server/${var.app_version}"
}

resource "aws_launch_template" "app" {
  image_id = data.aws_ssm_parameter.app_ami.value
}
```

## Multi-Region Image References

```hcl
# For multi-region deployments, Packer copies to multiple regions
locals {
  region_ami_map = {
    "us-east-1" = "ami-0123456789abcdef0"
    "us-west-2" = "ami-0987654321fedcba0"
    "eu-west-1" = "ami-0abcdef1234567890"
  }
}

variable "aws_region" {
  type = string
}

resource "aws_launch_template" "app" {
  image_id = local.region_ami_map[var.aws_region]
}
```

## Conclusion

For development and staging, use data source lookups with tag filters to automatically pick up the latest image. For production, pin the AMI ID either as a variable or through SSM Parameter Store, with CI/CD updating the reference as part of the image promotion process. The SSM Parameter Store approach is the most flexible - it decouples the image registry from OpenTofu configurations and enables environment-specific promotion workflows.
