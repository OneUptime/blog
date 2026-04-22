# How to Run Scripts with Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Provisioner

Description: Learn how to run shell scripts and commands with local-exec and remote-exec provisioners in OpenTofu, including script files, inline commands, and environment variables.

## Introduction

When provisioners are necessary, OpenTofu provides two primary types for running scripts: `local-exec` (runs on the machine running OpenTofu) and `remote-exec` (runs on the created resource via SSH or WinRM). This guide covers both approaches, including how to use script files, pass environment variables, and handle different operating systems.

## Running Inline Commands with local-exec

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  # Single command
  provisioner "local-exec" {
    command = "echo ${self.id} created"
  }
}
```

## Running a Script File with local-exec

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  tags          = { Name = "web-server" }

  provisioner "local-exec" {
    # Run a local script file after instance creation
    command = "${path.module}/scripts/register-instance.sh"

    environment = {
      INSTANCE_ID       = self.id
      PRIVATE_IP        = self.private_ip
      CONSUL_DATACENTER = var.consul_datacenter
      ENV               = var.environment
    }
  }
}
```

```bash
#!/bin/bash
# scripts/register-instance.sh

set -e

echo "Registering instance $INSTANCE_ID at $PRIVATE_IP in datacenter $CONSUL_DATACENTER"

# Register in service discovery
curl -X PUT "https://consul.example.com/v1/catalog/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"Node\": \"$INSTANCE_ID\",
    \"Address\": \"$PRIVATE_IP\",
    \"Datacenter\": \"$CONSUL_DATACENTER\"
  }"

echo "Instance $INSTANCE_ID registered successfully"
```

## Multi-line Commands with local-exec

```hcl
resource "aws_s3_bucket" "artifacts" {
  bucket = var.bucket_name
}

resource "null_resource" "upload_artifacts" {
  depends_on = [aws_s3_bucket.artifacts]

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      echo "Uploading artifacts to ${aws_s3_bucket.artifacts.bucket}"
      aws s3 cp ./artifacts/ s3://${aws_s3_bucket.artifacts.bucket}/artifacts/ \
        --recursive \
        --exclude "*.tmp"
      echo "Upload complete"
    EOT

    interpreter = ["/bin/bash", "-c"]
  }
}
```

## Running Scripts with remote-exec

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  # Connection configuration required for remote-exec
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "set -e",
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
      "sudo systemctl start nginx",
      "sudo systemctl enable nginx"
    ]
  }
}
```

## Using a Script File with remote-exec

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # Upload the script first using file provisioner
  provisioner "file" {
    source      = "${path.module}/scripts/setup.sh"
    destination = "/tmp/setup.sh"
  }

  # Execute the uploaded script
  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/setup.sh",
      "sudo /tmp/setup.sh"
    ]
  }
}
```

## Platform-Specific Scripts

```hcl
# Windows instance using WinRM
resource "aws_instance" "windows" {
  ami           = var.windows_ami_id
  instance_type = "t3.medium"

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = var.admin_password
    host     = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "powershell -Command \"Install-WindowsFeature -Name Web-Server\"",
      "powershell -Command \"Start-Service W3SVC\""
    ]
  }
}
```

## Passing Environment Variables to Scripts

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  provisioner "local-exec" {
    command = "python3 ${path.module}/scripts/configure.py"

    environment = {
      INSTANCE_ID   = self.id
      PUBLIC_IP     = self.public_ip
      ENVIRONMENT   = var.environment
      AWS_REGION    = var.region
      DATABASE_HOST = var.db_endpoint
    }
  }
}
```

## Interpreter Options

```hcl
# Default shell
provisioner "local-exec" {
  command = "echo hello"
}

# Explicit bash
provisioner "local-exec" {
  command     = "echo hello"
  interpreter = ["/bin/bash", "-c"]
}

# Python inline code
provisioner "local-exec" {
  command     = "print('hello')"
  interpreter = ["python3", "-c"]
}

# PowerShell (Windows)
provisioner "local-exec" {
  command     = "Write-Output 'hello'"
  interpreter = ["PowerShell", "-Command"]
}
```

## Conclusion

Use `local-exec` for scripts that run on the OpenTofu host machine - good for API calls, file operations, and external system notifications. Use `remote-exec` for scripts that must run on the created resource itself - but prefer user_data or Systems Manager when possible. Pass dynamic values through environment variables rather than interpolating OpenTofu values directly into shell command strings to reduce injection risks. Keep scripts small and focused; complex logic belongs in configuration management tools, not provisioners.
