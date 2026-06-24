# How to Use the local-exec Provisioner in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, local-exec, Infrastructure as Code, Automation

Description: Learn how to use the `local-exec` provisioner in OpenTofu to run commands on the machine executing OpenTofu after a resource is created or destroyed.

## Introduction

The `local-exec` provisioner runs a command on the local machine-the computer or CI runner where OpenTofu is executing-after a resource is created. It is commonly used to trigger post-provisioning scripts, register resources with external systems, or invoke tools that do not have an OpenTofu provider.

> **Note:** OpenTofu considers provisioners a last resort. Prefer cloud-init, user data, or proper provider resources where possible. See the post on why provisioners are a last resort for details.

## Basic Syntax

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"

  # The local-exec provisioner runs after the instance is created
  provisioner "local-exec" {
    # 'command' is the shell command to execute locally
    command = "echo 'Instance ${self.id} created at ${self.public_ip}' >> deployment.log"
  }
}
```

## Specifying the Interpreter

By default, `local-exec` chooses sensible defaults based on the operating system. Use `interpreter` to change this:

```hcl
provisioner "local-exec" {
  # Run a Python script instead of a shell command
  interpreter = ["python3", "-c"]
  command     = "print('Instance created:', '${self.id}')"
}

provisioner "local-exec" {
  # Run PowerShell on Windows
  interpreter = ["PowerShell", "-Command"]
  command     = "Write-Host 'Instance ${self.id} is ready'"
}
```

## Setting Environment Variables

Pass values to the command via environment variables to avoid shell escaping issues:

```hcl
provisioner "local-exec" {
  command = "ansible-playbook -i '${self.public_ip},' playbooks/configure.yml"

  environment = {
    # Pass the instance ID as an environment variable
    INSTANCE_ID  = self.id
    # Use a sensitive value from a variable without embedding it in the command
    API_TOKEN    = var.api_token
  }
}
```

## Working Directory

Use `working_dir` to set the directory where the command executes:

```hcl
provisioner "local-exec" {
  # Run from the scripts directory in the current module
  working_dir = "${path.module}/scripts"
  command     = "./post-deploy.sh ${self.id} ${self.private_ip}"
}
```

## Practical Example: Register Instance with Consul

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.small"

  tags = {
    Name = "app-server"
  }

  # After creation, register the instance with Consul
  provisioner "local-exec" {
    command = <<-EOT
      consul services register \
        -name="app-server" \
        -id="${self.id}" \
        -address="${self.private_ip}" \
        -port=8080
    EOT

    environment = {
      CONSUL_HTTP_ADDR  = var.consul_address
      CONSUL_HTTP_TOKEN = var.consul_token
    }
  }
}
```

## Multiline Commands

Use heredoc syntax for complex multi-step commands:

```hcl
provisioner "local-exec" {
  command = <<-EOT
    set -e
    echo "Waiting for instance ${self.id} to be reachable..."
    aws ec2 wait instance-status-ok --instance-ids ${self.id}
    echo "Instance is ready. Running post-provisioning tasks..."
    ./scripts/configure-monitoring.sh ${self.id} ${self.private_ip}
  EOT

  environment = {
    AWS_DEFAULT_REGION = var.region
  }
}
```

## Limitations

- `local-exec` runs on the OpenTofu host, not the remote resource. For running commands on the resource itself, use `remote-exec`.
- Output from `local-exec` is captured but not stored in state.
- Non-zero exit codes cause the apply to fail (unless `on_failure = continue` is set).

## Conclusion

The `local-exec` provisioner bridges OpenTofu with external tooling by running local commands after resource creation, or before destruction when `when = destroy` is set. Use it sparingly and prefer proper provider resources or cloud-init for configuration management tasks.
