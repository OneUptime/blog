# How to Use the local-exec Provisioner in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, local-exec, Infrastructure as Code, Automation

Description: Learn how to use OpenTofu's local-exec provisioner to run commands on your local machine after a resource is created or destroyed.

## Introduction

OpenTofu provisioners allow you to execute scripts as part of resource creation or destruction. The `local-exec` provisioner runs commands on the machine executing OpenTofu - not on the remote resource - making it ideal for triggering local scripts, updating inventory files, or calling external APIs after provisioning.

## When to Use local-exec

According to OpenTofu best practices, provisioners are a last resort. However, `local-exec` is appropriate when:
- Registering a newly created resource with an external system
- Calling a webhook or API to notify about infrastructure changes
- Running a local Ansible playbook after VM creation
- Generating local configuration files based on resource outputs

## Basic Syntax

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "echo ${self.public_ip} >> /tmp/inventory.txt"
  }
}
```

## Using local-exec with Environment Variables

Pass sensitive values or dynamic data through environment variables:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags = {
    Name = "web"
  }

  provisioner "local-exec" {
    command = "python3 scripts/register_host.py"
    environment = {
      HOST_IP   = self.public_ip
      HOST_NAME = self.tags["Name"]
      API_TOKEN = var.api_token
    }
  }
}
```

## Running on Destroy

Use the `when` argument to run a command during resource destruction:

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    when    = destroy
    command = "python3 scripts/deregister_host.py ${self.public_ip}"
  }
}
```

## Specifying the Interpreter

By default, `local-exec` uses `/bin/sh -c` on Unix and `cmd /C` on Windows. Specify a custom interpreter:

```hcl
resource "terraform_data" "setup" {
  provisioner "local-exec" {
    interpreter = ["python3", "-c"]
    command     = "import boto3; print('Running setup')"
  }
}
```

Or run a PowerShell script on Windows:

```hcl
provisioner "local-exec" {
  interpreter = ["PowerShell", "-Command"]
  command     = "Write-Host 'Provisioning complete'"
}
```

## Using terraform_data with local-exec

When you need to run a local command that isn't tied to a specific resource lifecycle, use `terraform_data`:

```hcl
resource "terraform_data" "ansible_provisioner" {
  triggers_replace = [aws_instance.web.id]

  provisioner "local-exec" {
    command = <<-EOT
      ansible-playbook \
        -i '${aws_instance.web.public_ip},' \
        --private-key ${var.ssh_key_path} \
        -u ec2-user \
        playbooks/configure_web.yml
    EOT
  }

  depends_on = [aws_instance.web]
}
```

## Handling Failures

Control what happens if the command fails using `on_failure`:

```hcl
provisioner "local-exec" {
  command    = "bash scripts/optional_setup.sh"
  on_failure = continue  # or "fail" (default)
}
```

## Working Directory

Set the working directory for the command:

```hcl
provisioner "local-exec" {
  command     = "ansible-playbook site.yml"
  working_dir = "${path.module}/ansible"
}
```

## Best Practices

- Prefer native OpenTofu resources over provisioners whenever possible.
- Keep provisioner commands idempotent - they may run again if a resource is tainted.
- Avoid hardcoding credentials in commands; use environment variables instead.
- Use `triggers_replace` in `terraform_data` to control when provisioners re-run.
- Log command output to a file for debugging: `command = "my_script.sh 2>&1 | tee /tmp/provision.log"`

## Conclusion

The `local-exec` provisioner is a powerful escape hatch for integrating OpenTofu with external systems and local tooling. Used judiciously with proper error handling and idempotency, it bridges the gap between infrastructure provisioning and configuration management workflows.
