# How to Use Packer Image IDs in OpenTofu Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Packer, AMI, Image Building, Infrastructure as Code

Description: Learn how to integrate HashiCorp Packer with OpenTofu by using Packer-built AMI IDs in your infrastructure configurations for immutable infrastructure deployments.

## Introduction

Packer builds machine images (AMIs, GCE images, Azure images) that are pre-configured with your application stack. OpenTofu then uses these images to provision infrastructure. Connecting the two tools creates an immutable infrastructure pipeline where each deployment uses a freshly built, tested image.

## The Immutable Infrastructure Workflow

```hcl
Code Change → Packer Build → New AMI → OpenTofu Apply → New Instances
```

1. Packer builds a new AMI with your application baked in.
2. The AMI ID is passed to OpenTofu.
3. OpenTofu provisions new instances with the new AMI.
4. Old instances are replaced (blue/green or rolling update).

## Step 1: Define a Packer Template

```hcl
# packer/app.pkr.hcl

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "app_version" {
  type = string
}

source "amazon-ebs" "app" {
  ami_name      = "myapp-${var.app_version}-{{timestamp}}"
  instance_type = "t3.small"
  region        = var.aws_region

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"]
  }

  communicator  = "ssh"
  ssh_username  = "ubuntu"

  tags = {
    App     = "myapp"
    Version = var.app_version
    Builder = "packer"
  }
}

build {
  sources = ["source.amazon-ebs.app"]

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx"
    ]
  }

  provisioner "file" {
    source      = "dist/myapp"
    destination = "/tmp/myapp"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/myapp /usr/local/bin/myapp",
      "sudo chmod +x /usr/local/bin/myapp"
    ]
  }
}
```

Build the AMI:

```bash
packer build \
  -var="app_version=1.2.3" \
  packer/app.pkr.hcl
```

Packer outputs the AMI ID: `ami-0123456789abcdef0`

## Step 2: Pass the AMI ID to OpenTofu

### Method 1: Variable Input

```hcl
# variables.tf

variable "app_ami_id" {
  type        = string
  description = "AMI ID built by Packer"
}

resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.app_ami_id
  instance_type = "t3.medium"
}
```

```bash
tofu apply -var="app_ami_id=ami-0123456789abcdef0"
```

### Method 2: Data Source Lookup by Tag

Look up the latest AMI by the tags Packer set:

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "tag:App"
    values = ["myapp"]
  }

  filter {
    name   = "tag:Version"
    values = [var.app_version]
  }
}

resource "aws_launch_template" "app" {
  name_prefix = "app-"
  image_id    = data.aws_ami.app.id
}
```

### Method 3: SSM Parameter Store

Have Packer write the AMI ID to SSM after building:

```hcl
# In Packer post-processor
post-processor "shell-local" {
  inline = [
    "AMI_ID=$(echo '{{ .ArtifactId }}' | cut -d: -f2)",
    "aws ssm put-parameter --name /app/production/ami-id --value $AMI_ID --type String --overwrite"
  ]
}
```

The amazon-ebs builder's `.ArtifactId` is formatted as `region:ami-id`, so we extract the AMI ID before writing it to SSM.

Read in OpenTofu:

```hcl
data "aws_ssm_parameter" "app_ami" {
  name = "/app/production/ami-id"
}

resource "aws_launch_template" "app" {
  image_id      = data.aws_ssm_parameter.app_ami.value
  instance_type = "t3.medium"
}
```

## Step 3: Complete CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

jobs:
  build-image:
    runs-on: ubuntu-latest
    outputs:
      ami_id: ${{ steps.packer.outputs.ami_id }}
    steps:
      - uses: actions/checkout@v4

      - name: Build AMI with Packer
        id: packer
        run: |
          packer build \
            -var="app_version=${{ github.sha }}" \
            -machine-readable \
            packer/app.pkr.hcl | tee packer_output.txt

          AMI_ID=$(grep "artifact,0,id" packer_output.txt | cut -d: -f2)
          echo "ami_id=$AMI_ID" >> $GITHUB_OUTPUT

  deploy:
    needs: build-image
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy with OpenTofu
        run: |
          tofu init
          tofu apply \
            -var="app_ami_id=${{ needs.build-image.outputs.ami_id }}" \
            -auto-approve
```

## Managing AMI Lifecycle

Use an OpenTofu data source to enumerate AMIs you've built so a separate cleanup process can deregister old ones:

```hcl
# List all AMIs tagged with App=myapp, sorted by creation date
data "aws_ami_ids" "old_apps" {
  owners = ["self"]

  filter {
    name   = "tag:App"
    values = ["myapp"]
  }
}
```

Note that data sources only read state - they do not deregister AMIs. You'll need a separate process (a script, scheduled job, or AWS Lambda) to call `aws ec2 deregister-image` against AMIs older than your retention threshold. Alternatively, use a lifecycle policy via AWS Image Builder, which Packer supports as a post-processor.

## Best Practices

- Always tag Packer-built AMIs with version, build date, and git commit.
- Use the AMI ID as a variable rather than hardcoding it to make deployments explicit.
- Store AMI IDs in SSM Parameter Store for multi-stage pipelines.
- Test Packer builds before passing AMIs to OpenTofu (smoke test the built image).
- Implement AMI lifecycle policies to deregister and delete old AMIs to control storage costs.

## Conclusion

Integrating Packer with OpenTofu creates a robust immutable infrastructure pipeline. Packer handles the image creation and configuration; OpenTofu handles the infrastructure provisioning and orchestration. By passing AMI IDs between the tools via variables, SSM, or data sources, you achieve reliable, reproducible deployments where every instance starts from a known-good, pre-tested image.
