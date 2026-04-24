# Provisioners as a Last Resort in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, Best Practice, Infrastructure as Code, Terraform

Description: Understand why OpenTofu provisioners should be treated as a last resort, what alternatives exist, and how to use them responsibly when no better option is available.

## What are Provisioners?

OpenTofu provisioners allow you to execute scripts or commands on local or remote machines as part of resource creation or destruction. They include:

- `local-exec` - Runs a command on the machine running OpenTofu
- `remote-exec` - Runs commands on a remote resource via SSH or WinRM
- `file` - Copies files from the local machine to the remote resource

## Why Provisioners Are a Last Resort

The OpenTofu documentation explicitly states that provisioners should be a "last resort." Here's why:

### 1. They Break Idempotency

```hcl
# Problem: Running this twice may fail or produce different results

resource "terraform_data" "example" {
  provisioner "local-exec" {
    command = "mkdir app"   # Fails if rerun because the directory already exists
  }
}
```

### 2. They Are Not Visible in Plans

Provisioners do not appear in `tofu plan` output. You cannot preview what will run before applying.

### 3. They Create Hidden State

Creation-time provisioners run only during resource creation, not updates. If the script changes later, OpenTofu will not re-run it unless the resource is replaced. This can lead to configuration drift.

### 4. They Can Leave Resources in Unknown States

Network failures, SSH issues, or script errors can leave resources in unknown states.

## Better Alternatives

### For Instance Configuration: Use User Data

```hcl
# PREFERRED: user_data/cloud-init runs during boot and avoids SSH-based provisioning
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  user_data = <<-EOT
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOT
}
```

### For Pre-Baked Images: Use Packer

Build AMIs with software pre-installed:

```hcl
# Use a Packer-built AMI - no provisioner needed
resource "aws_instance" "web" {
  ami           = data.aws_ami.app.id   # Pre-baked with nginx
  instance_type = "t3.micro"
}
```

### For Kubernetes: Use Helm or Kubernetes Provider

```hcl
# PREFERRED: Use the helm_release resource
resource "helm_release" "nginx" {
  name       = "nginx"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "nginx"
}
```

### For Configuration Management: Use Ansible After Apply

Invoke Ansible from `local-exec` only if you truly must:

```hcl
resource "terraform_data" "configure" {
  triggers_replace = [aws_instance.web.id]

  provisioner "local-exec" {
    command = "ansible-playbook -i '${aws_instance.web.public_ip},' playbook.yml"
  }
}
```

## When Provisioners Are Acceptable

Despite the warnings, some scenarios genuinely require provisioners:

1. **Initial bootstrapping** when no API exists for the task
2. **Legacy systems** that cannot use cloud-init or Packer
3. **Third-party integrations** with no provider support
4. **Destroy-time cleanup** - deregistering from external systems

## Responsible Provisioner Usage

When you must use a provisioner:

```hcl
resource "aws_instance" "legacy" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "remote-exec" {
    inline = [
      "set -o errexit",                 # Exit on any error
      "sudo apt-get update -qq",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
      "sudo systemctl is-active --quiet nginx",  # Verify the service is running
    ]

    on_failure = fail   # Be explicit about failure behavior

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
}
```

## Checklist Before Using a Provisioner

- [ ] Is there a native provider resource that does this? (check the registry)
- [ ] Can this be done with user data / cloud-init?
- [ ] Can the image be pre-baked with Packer?
- [ ] Can a configuration management tool (Ansible, Chef) handle this?
- [ ] Is there a Kubernetes operator or Helm chart?
- [ ] If none of the above, document why the provisioner is necessary

## Conclusion

Provisioners are a powerful escape hatch in OpenTofu, but they come with significant tradeoffs: no plan visibility, broken idempotency, and fragile execution. Always exhaust alternatives - user data, Packer, provider resources, and configuration management tools - before reaching for a provisioner. When you do use one, write defensive scripts with `set -o errexit`, explicit error handling, and verification steps.
