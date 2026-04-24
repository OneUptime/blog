# How to Use Provisioners as a Last Resort in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Provisioner

Description: Understand when and why to use provisioners in OpenTofu only as a last resort, and learn the preferred alternatives for common provisioner use cases.

## Introduction

Provisioners in OpenTofu execute scripts or commands during resource creation or destruction. The OpenTofu documentation explicitly labels them a "last resort" because they introduce complexity, can leave resources in semi-configured states, and break the declarative model. This guide explains why they're problematic, when they're acceptable, and what alternatives to use instead.

## Why Provisioners Are a Last Resort

Provisioners break OpenTofu's declarative model in several ways:

1. **Not inherently idempotent**: Provisioner scripts may produce different results across runs
2. **No drift detection**: OpenTofu doesn't track what the provisioner did
3. **Can leave resources in semi-configured states**: If a provisioner fails mid-execution
4. **No preview**: `tofu plan` can't model what provisioners will do
5. **Tight coupling**: Embeds imperative logic into declarative config

```hcl
# Example of what NOT to do - using provisioner for software installation

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  connection {
    type        = "ssh"
    user        = var.ssh_user
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # ❌ Don't install software with provisioners
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
    ]
  }
}
```

## Preferred Alternatives

### Use User Data Instead of remote-exec

```hcl
# ✅ Better: Use user_data for initialization scripts
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
  EOF
}
```

### Use Pre-baked AMIs (Packer)

```hcl
# ✅ Better: Use a custom AMI with software pre-installed
data "aws_ami" "nginx" {
  most_recent = true
  owners      = ["self"]  # Your organization's AMIs

  filter {
    name   = "name"
    values = ["nginx-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.nginx.id
  instance_type = "t3.micro"
}
```

### Use AWS Systems Manager State Manager

```hcl
# ✅ Better: Use State Manager to apply commands to managed instances
resource "aws_ssm_document" "run_script" {
  name          = "RunInitScript"
  document_type = "Command"
  target_type   = "/AWS::EC2::Instance"

  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Run initialization script"
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "runScript"
      inputs = {
        runCommand = ["bash /tmp/init.sh"]
      }
    }]
  })
}

resource "aws_ssm_association" "run_script" {
  name = aws_ssm_document.run_script.name

  targets {
    key    = "InstanceIds"
    values = [aws_instance.web.id]
  }
}
```

### Use Configuration Management Tools

For complex software configuration:

- **Ansible**: Best for applying playbooks after instance creation
- **Chef/Puppet**: For policy-based configuration management
- **Cloud-init**: For AWS, Azure, and GCP instance initialization

## When Provisioners Are Acceptable

Despite the drawbacks, provisioners are acceptable in specific scenarios:

1. **Bootstrapping configuration management**: Installing a config management agent
2. **No provider support**: The cloud resource doesn't have an API that OpenTofu can use
3. **Generating local files**: Using `local-exec` to save outputs to files
4. **Triggering external systems**: Notifying a deployment system after resource creation

```hcl
# Acceptable: Notifying external system after resource creation
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    # ✅ Acceptable: external notification, not resource configuration
    command = "curl -X POST https://deploy.example.com/notify -d 'instance_id=${self.id}'"
  }
}
```

## Provisioner Configuration

When you must use a provisioner:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  # Run on creation (default)
  provisioner "local-exec" {
    command = "echo ${self.id} > instance-id.txt"
  }

  # Run on destruction
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Destroying ${self.id}'"
  }

  # Continue even if provisioner fails (use sparingly)
  provisioner "local-exec" {
    command    = "optional-script.sh"
    on_failure = continue
  }
}
```

## Conclusion

Provisioners should be used only when there is no better alternative. Before reaching for a provisioner, consider user data scripts, custom AMIs, AWS Systems Manager, or configuration management tools. When you do use provisioners, prefer `local-exec` (runs on your machine) over `remote-exec` (requires SSH/WinRM access), keep them simple, and document why they were necessary. The declarative alternatives are more maintainable, idempotent, and predictable.
