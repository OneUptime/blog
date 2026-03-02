# How to Use the connection Block for Provisioners in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provisioner, SSH, WinRM, Connection, Infrastructure as Code

Description: Learn how to configure the connection block in Terraform to establish SSH and WinRM connections for remote-exec and file provisioners with bastion hosts and authentication.

---

Every time you use a `remote-exec` or `file` provisioner, Terraform needs to know how to reach the remote machine. That is what the `connection` block does. It defines the protocol, authentication method, target host, and any intermediate jump hosts needed to establish a connection. Getting the connection right is often the hardest part of using provisioners, so understanding all the options is critical.

## Connection Block Placement

You can place the `connection` block in two locations:

### Resource-Level Connection

When defined at the resource level, all provisioners in that resource share the same connection settings.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Shared by all provisioners in this resource
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  provisioner "file" {
    source      = "config/app.conf"
    destination = "/tmp/app.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo cp /tmp/app.conf /etc/app/app.conf",
      "sudo systemctl restart app",
    ]
  }
}
```

### Provisioner-Level Connection

When defined inside a provisioner block, it overrides the resource-level connection for that specific provisioner.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  # Resource-level connection (default)
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }

  # This provisioner uses the default connection
  provisioner "file" {
    source      = "config/app.conf"
    destination = "/tmp/app.conf"
  }

  # This provisioner overrides the connection to use a different user
  provisioner "remote-exec" {
    inline = ["sudo systemctl restart app"]

    connection {
      type        = "ssh"
      user        = "admin"
      private_key = file(var.admin_key_path)
      host        = self.public_ip
    }
  }
}
```

## SSH Connection Arguments

SSH is the most common connection type. Here are all the available arguments.

```hcl
connection {
  type        = "ssh"          # Connection protocol
  user        = "ubuntu"       # Remote user
  private_key = file("~/.ssh/key.pem")  # SSH private key content
  host        = self.public_ip # Target host
  port        = 22             # SSH port (default: 22)
  timeout     = "5m"           # Connection timeout (default: 5m)
  agent       = false          # Use SSH agent (default: false)
}
```

### Authentication Methods

You have several ways to authenticate.

#### Private Key File

The most common approach. Read the key file content and pass it as a string.

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file("${path.module}/keys/deployer.pem")
  host        = self.public_ip
}
```

#### SSH Agent

If you have an SSH agent running with loaded keys, Terraform can use it.

```hcl
connection {
  type  = "ssh"
  user  = "ubuntu"
  agent = true
  host  = self.public_ip
}
```

This is useful in CI/CD environments where keys are managed by the agent rather than files on disk.

#### Password Authentication

Not recommended for production, but available for legacy systems.

```hcl
connection {
  type     = "ssh"
  user     = "admin"
  password = var.ssh_password
  host     = self.public_ip
}
```

#### Certificate-Based Authentication

For environments using SSH certificates.

```hcl
connection {
  type            = "ssh"
  user            = "ubuntu"
  private_key     = file(var.private_key_path)
  certificate     = file(var.certificate_path)
  host            = self.public_ip
}
```

## WinRM Connection Arguments

For Windows instances, use WinRM instead of SSH.

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  port     = 5986           # HTTPS WinRM port
  https    = true           # Use HTTPS
  insecure = true           # Skip certificate verification
  timeout  = "10m"
  use_ntlm = true           # Use NTLM authentication
}
```

### WinRM with HTTPS

For production Windows instances, always use HTTPS. You need to configure the instance to accept WinRM over HTTPS, which typically involves user_data that sets up the WinRM listener.

```hcl
resource "aws_instance" "windows" {
  ami           = var.windows_ami_id
  instance_type = "t3.large"

  user_data = <<-EOF
    <powershell>
    # Enable WinRM HTTPS
    $cert = New-SelfSignedCertificate -DnsName $env:COMPUTERNAME -CertStoreLocation cert:\LocalMachine\My
    winrm create winrm/config/Listener?Address=*+Transport=HTTPS "@{Hostname=`"$env:COMPUTERNAME`";CertificateThumbprint=`"$($cert.Thumbprint)`"}"
    winrm set winrm/config/service '@{AllowUnencrypted="false"}'
    winrm set winrm/config/service/auth '@{Basic="true"}'
    </powershell>
  EOF

  connection {
    type     = "winrm"
    user     = "Administrator"
    password = var.admin_password
    host     = self.public_ip
    port     = 5986
    https    = true
    insecure = true
    timeout  = "15m"
  }

  provisioner "remote-exec" {
    inline = [
      "powershell.exe -Command Install-WindowsFeature -Name Web-Server",
    ]
  }
}
```

## Bastion Host Configuration

When your target instances are in private subnets, you need a bastion (jump) host to reach them.

```hcl
resource "aws_instance" "private_app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = var.private_subnet_id
  key_name      = var.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.private_ip  # Target's private IP

    # Bastion host configuration
    bastion_host        = var.bastion_public_ip
    bastion_port        = 22
    bastion_user        = "ubuntu"
    bastion_private_key = file(var.bastion_key_path)
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y docker.io",
    ]
  }
}
```

### Different Keys for Bastion and Target

Often the bastion host and the target instance use different SSH keys.

```hcl
connection {
  type        = "ssh"
  user        = "ec2-user"
  private_key = file("keys/app-server.pem")  # Key for the target
  host        = self.private_ip

  bastion_host        = data.aws_instance.bastion.public_ip
  bastion_user        = "ec2-user"
  bastion_private_key = file("keys/bastion.pem")  # Key for the bastion
}
```

### Bastion with SSH Agent

```hcl
connection {
  type  = "ssh"
  user  = "ubuntu"
  agent = true
  host  = self.private_ip

  bastion_host = var.bastion_ip
  bastion_user = "ubuntu"
}
```

When using an SSH agent, the agent forwards authentication for both the bastion and the target.

## The self Reference

Inside a connection block within a resource, `self` refers to the parent resource. This is how you access the instance's IP address, DNS name, or other attributes.

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    # self.public_ip is the IP of THIS aws_instance
    host        = self.public_ip
  }
}
```

Common `self` attributes for AWS instances:
- `self.public_ip` - Public IP address
- `self.private_ip` - Private IP address
- `self.public_dns` - Public DNS name
- `self.id` - Instance ID

## Connection Timeout and Retries

The `timeout` argument controls how long Terraform waits for the initial connection. During this period, Terraform retries the connection automatically.

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(var.private_key_path)
  host        = self.public_ip
  timeout     = "10m"  # Retry for up to 10 minutes
}
```

For instances that take a long time to boot (like large Windows servers), increase the timeout generously.

## Troubleshooting Connection Issues

### Enable Debug Logging

```bash
# Set Terraform to output debug logs
export TF_LOG=DEBUG
terraform apply
```

This shows the exact SSH commands, connection attempts, and error messages.

### Common Problems

1. **Security group does not allow SSH.** Verify port 22 is open from the Terraform host's IP.

```hcl
resource "aws_security_group" "allow_ssh" {
  name_prefix = "allow-ssh-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.terraform_host_cidr]  # Your IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

2. **Wrong username.** Different AMIs use different default users:
   - Amazon Linux: `ec2-user`
   - Ubuntu: `ubuntu`
   - Debian: `admin`
   - CentOS: `centos`
   - RHEL: `ec2-user`

3. **Instance not ready yet.** The instance might be running but SSH daemon has not started. Increase the `timeout`.

4. **Private IP but no route.** If using `self.private_ip`, make sure there is a network path from the Terraform host (or bastion) to the private subnet.

## Summary

The connection block is the foundation for all remote provisioners in Terraform. Whether you are connecting via SSH to a Linux instance or WinRM to a Windows server, the connection block defines how Terraform reaches the target. Use resource-level connections for shared settings, provisioner-level connections for overrides, and bastion host configuration for private subnet instances. Always test connectivity before adding complex provisioners, and increase timeouts for slow-booting instances.

For more on what you can do once connected, see our posts on [remote-exec](https://oneuptime.com/blog/post/2026-02-23-terraform-remote-exec-provisioner/view) and [file provisioners](https://oneuptime.com/blog/post/2026-02-23-terraform-file-provisioner/view).
