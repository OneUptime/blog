# How to Use the remote-exec Provisioner in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioners, remote-exec, SSH, Infrastructure as Code

Description: Learn how to use the remote-exec provisioner in Terraform to execute commands on remote resources over SSH or WinRM for post-creation configuration and bootstrapping.

---

The `remote-exec` provisioner connects to a newly created resource and runs commands directly on it. Unlike `local-exec` which runs on your workstation, `remote-exec` operates on the target machine over SSH or WinRM. This makes it useful for installing packages, configuring services, and bootstrapping instances before handing off to a proper configuration management tool.

That said, `remote-exec` comes with more complexity and more failure modes than `local-exec`. You need network connectivity, authentication, and a running SSH daemon on the target. When any of these are not ready, the provisioner fails. Understanding these challenges is key to using it reliably.

## Basic Usage

At minimum, you need a command to run and a connection configuration.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids = [aws_security_group.ssh.id]

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file("~/.ssh/deployer.pem")
      host        = self.public_ip
    }
  }
}
```

The `connection` block tells Terraform how to reach the instance. The `inline` argument provides a list of commands to run sequentially.

## Three Ways to Specify Commands

### inline

A list of command strings executed one at a time.

```hcl
provisioner "remote-exec" {
  inline = [
    "echo 'Starting setup'",
    "sudo yum update -y",
    "sudo yum install -y httpd",
    "sudo systemctl start httpd",
    "echo 'Setup complete'",
  ]

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

Each command is executed separately. If any command returns a non-zero exit code, the provisioner fails and subsequent commands are skipped.

### script

Upload and execute a single script file.

```hcl
provisioner "remote-exec" {
  script = "${path.module}/scripts/setup.sh"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

Terraform copies the script to the remote machine and executes it. The script must be executable and have a proper shebang line (`#!/bin/bash`).

Here is what `scripts/setup.sh` might look like:

```bash
#!/bin/bash
set -euo pipefail

# Update packages
sudo apt-get update
sudo apt-get upgrade -y

# Install application dependencies
sudo apt-get install -y \
  python3 \
  python3-pip \
  nginx \
  certbot

# Configure nginx
sudo cp /tmp/nginx.conf /etc/nginx/sites-available/default
sudo nginx -t
sudo systemctl restart nginx

echo "Setup completed successfully"
```

### scripts

Upload and execute multiple script files in order.

```hcl
provisioner "remote-exec" {
  scripts = [
    "${path.module}/scripts/01-base-packages.sh",
    "${path.module}/scripts/02-security-hardening.sh",
    "${path.module}/scripts/03-app-install.sh",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

Scripts are executed in the order listed. If one fails, the rest are skipped.

## Connection Configuration

The connection block is critical for `remote-exec`. Getting it wrong is the most common source of provisioner failures.

### SSH Connection

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file("~/.ssh/id_rsa")
  host        = self.public_ip
  port        = 22
  timeout     = "5m"
}
```

### SSH with Agent Forwarding

If you use an SSH agent instead of a key file:

```hcl
connection {
  type  = "ssh"
  user  = "ubuntu"
  agent = true
  host  = self.public_ip
}
```

### SSH Through a Bastion Host

For instances in private subnets, you need to go through a bastion (jump host).

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(var.private_key_path)
  host        = self.private_ip

  bastion_host        = var.bastion_public_ip
  bastion_user        = "ubuntu"
  bastion_private_key = file(var.bastion_key_path)
  bastion_port        = 22
}
```

### WinRM Connection for Windows

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami_id
  instance_type = "t3.large"

  provisioner "remote-exec" {
    inline = [
      "powershell.exe -Command Install-WindowsFeature -Name Web-Server -IncludeManagementTools",
    ]

    connection {
      type     = "winrm"
      user     = "Administrator"
      password = var.admin_password
      host     = self.public_ip
      port     = 5986
      https    = true
      insecure = true
      timeout  = "10m"
    }
  }
}
```

## Handling the Timing Problem

The biggest challenge with `remote-exec` is timing. Terraform creates the instance and immediately tries to connect, but the instance might not have SSH running yet. The connection `timeout` parameter helps, but you can also add explicit waits.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # First, wait for cloud-init to finish
  provisioner "remote-exec" {
    inline = [
      "cloud-init status --wait",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
      timeout     = "10m"  # Give the instance time to boot
    }
  }

  # Then do the actual setup
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get install -y docker.io",
      "sudo usermod -aG docker ubuntu",
      "sudo systemctl enable docker",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }
}
```

The first provisioner waits for cloud-init to complete, making sure the system is fully initialized before running the setup commands.

## Passing Variables to Remote Scripts

You cannot use Terraform variables directly inside remote scripts. Instead, pass them as command arguments or environment variables.

### As Command Arguments

```hcl
provisioner "remote-exec" {
  inline = [
    "sudo bash /tmp/setup.sh --db-host '${aws_db_instance.main.address}' --environment '${var.environment}'",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

### Using a File Provisioner First

A cleaner approach is to write a config file first, then reference it in the script.

```hcl
# Write the environment file
provisioner "file" {
  content = <<-EOT
    DB_HOST=${aws_db_instance.main.address}
    DB_PORT=5432
    REDIS_HOST=${aws_elasticache_cluster.main.cache_nodes[0].address}
    ENVIRONMENT=${var.environment}
  EOT
  destination = "/tmp/app.env"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}

# Run the setup script which reads from the env file
provisioner "remote-exec" {
  inline = [
    "set -a && source /tmp/app.env && set +a",
    "sudo -E /opt/app/setup.sh",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Security Considerations

1. **Private keys in state.** If you use `file()` to read a private key, the key content ends up in the Terraform state file. Make sure your state backend is encrypted.

2. **Commands in logs.** Terraform logs the commands it runs. Avoid putting passwords or tokens directly in `inline` commands.

3. **Network exposure.** The instance needs to be reachable from wherever Terraform runs. For CI/CD, this means the CI runner needs network access to the instance.

## When to Use remote-exec vs. Alternatives

Use `remote-exec` when you need to run a quick setup that cannot be done with user_data or cloud-init. For example:

- Installing a package that needs the instance to be running
- Running a one-time database migration
- Registering the instance with an external service that requires SSH

Use alternatives when:
- **User data / cloud-init** can handle the initialization (preferred for most EC2 setup)
- **Packer** can bake the configuration into an AMI (preferred for repeatable builds)
- **Ansible / Chef / Puppet** should handle complex configuration management
- **AWS Systems Manager** can run commands without SSH access

## Summary

The `remote-exec` provisioner is a powerful but brittle tool. It lets you run commands on remote resources over SSH or WinRM, which is useful for bootstrapping and one-time configuration tasks. The main challenges are timing (waiting for the instance to be ready), connectivity (SSH access, bastion hosts), and idempotency (making sure commands can run safely more than once).

For most use cases, prefer `user_data` or a baked AMI. Reserve `remote-exec` for situations where you genuinely need to run commands interactively on a newly created resource. For local automation, see our post on [local-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-local-exec-provisioner/view).
