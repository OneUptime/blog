# How to Use Provisioners with Connection Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Provisioner

Description: Learn how to configure connection blocks in OpenTofu for remote-exec and file provisioners to connect to EC2 instances via SSH and WinRM.

## Introduction

The `connection` block tells OpenTofu how to connect to a remote resource when using `remote-exec` and `file` provisioners. Without a connection block, these provisioners cannot execute. Connection blocks support SSH and WinRM, with options for authentication, timeouts, and bastion hosts.

## Basic SSH Connection

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  # Connection block tells OpenTofu how to SSH into this instance
  connection {
    type        = "ssh"
    user        = "ubuntu"           # AMI-specific: ubuntu, ec2-user, admin, centos
    private_key = file(pathexpand("~/.ssh/id_rsa"))
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected successfully'"]
  }
}
```

## SSH Connection with Key from Variable

```hcl
resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  public_key = var.ssh_public_key
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  # Ensure the instance gets a public IP
  associate_public_ip_address = true

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = var.ssh_private_key  # Keep the key in a sensitive variable or secret manager
    host        = self.public_ip

    # Timeout for connection (default is 5m)
    timeout = "10m"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx"
    ]
  }
}
```

## SSH via Bastion Host

```hcl
resource "aws_instance" "private_app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id  # Private subnet - no public IP

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand(var.private_key_path))
    host        = self.private_ip  # Use private IP

    # Bastion host configuration
    bastion_host        = aws_instance.bastion.public_ip
    bastion_user        = "ubuntu"
    bastion_private_key = file(pathexpand(var.bastion_private_key_path))
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected to private instance via bastion'"]
  }
}
```

## SSH with SSH Agent Authentication

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  connection {
    type  = "ssh"
    user  = "ubuntu"
    host  = self.public_ip

    # Use SSH agent authentication
    agent = true
  }

  provisioner "remote-exec" {
    inline = ["hostname"]
  }
}
```

## WinRM Connection for Windows

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Retrieve the generated Administrator password from the launch key pair
  get_password_data = true

  # Ensure the instance gets a public IP
  associate_public_ip_address = true

  # Windows AMIs need WinRM configured via user_data
  user_data = <<-EOF
    <powershell>
    winrm quickconfig -q
    winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="300"}'
    winrm set winrm/config '@{MaxTimeoutms="1800000"}'
    winrm set winrm/config/service '@{AllowUnencrypted="true"}'
    winrm set winrm/config/service/auth '@{Basic="true"}'
    netsh advfirewall firewall add rule name="WinRM 5985" protocol=TCP dir=in localport=5985 action=allow
    </powershell>
  EOF

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = rsadecrypt(self.password_data, file(pathexpand(var.private_key_path)))
    host     = self.public_ip

    # WinRM settings
    port    = 5985
    https   = false
    timeout = "15m"
  }

  provisioner "remote-exec" {
    inline = [
      "powershell -Command \"Get-WindowsFeature | Where-Object { $_.Installed }\""
    ]
  }
}
```

## Connection Block on Provisioner Level

Override the resource-level connection for a specific provisioner:

```hcl
resource "aws_instance" "app" {
  ami      = var.ami_id
  key_name = aws_key_pair.deployer.key_name

  # Default connection for all provisioners
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(pathexpand(var.key_path))
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = ["echo 'Using default connection'"]
  }

  provisioner "remote-exec" {
    # Override: use a different user for this specific provisioner
    connection {
      type        = "ssh"
      user        = "app-user"
      private_key = file(pathexpand(var.app_key_path))
      host        = self.public_ip
    }

    inline = ["echo 'Using overridden connection'"]
  }
}
```

## Connection Timeout Configuration

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(pathexpand(var.key_path))
  host        = self.public_ip

  # Wait up to 5 minutes for SSH to become available
  # Useful for instances that take time to boot
  timeout = "5m"
}
```

## Conclusion

Connection blocks are required for `remote-exec` and `file` provisioners. Use SSH for key-based authentication, WinRM for Windows, and the `bastion_host` parameters when instances are in private subnets. Avoid hardcoding private keys in configuration, and use sensitive variables, key files, or a secrets manager instead. Set appropriate timeouts for instances that take time to boot. Where possible, prefer user_data or AWS Systems Manager over connection-based provisioners.
