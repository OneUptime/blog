# How to Configure SSH Connections for Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, SSH, Connection Blocks, Infrastructure as Code

Description: Learn how to configure SSH connection blocks in OpenTofu to authenticate provisioners to remote Linux and Unix resources using passwords, key files, or agent forwarding.

## Introduction

Before `file` or `remote-exec` provisioners can run on a remote resource, OpenTofu needs a `connection` block that tells it how to reach and authenticate to that resource. For Linux and Unix systems, this means configuring an SSH connection.

## Basic SSH Connection Block

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type = "ssh"
    user = "ubuntu"

    # Authenticate with a PEM private key file
    private_key = file(pathexpand("~/.ssh/my-ec2-key.pem"))

    # Connect to the instance's public IP
    host = self.public_ip
  }

  provisioner "remote-exec" {
    inline = ["echo Connected!"]
  }
}
```

## Authentication Methods

### Private Key File

```hcl
connection {
  type        = "ssh"
  user        = "ec2-user"
  private_key = file("${path.module}/keys/deploy.pem")
  host        = self.public_ip
}
```

### Private Key from Variable (Secure)

```hcl
# The private key content is supplied securely (e.g., from Vault or CI secrets)

variable "ssh_private_key" {
  type      = string
  sensitive = true
  ephemeral = true
}

connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = var.ssh_private_key
  host        = self.public_ip
}
```

### Dynamically Generated Key Pair

This is convenient for temporary environments, but the private key is stored in OpenTofu state.

```hcl
# Generate a key pair with OpenTofu and use it immediately
resource "tls_private_key" "deploy" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deploy" {
  key_name   = "deploy-key"
  public_key = tls_private_key.deploy.public_key_openssh
}

resource "aws_instance" "web" {
  key_name = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    # Use the generated private key value from state
    private_key = tls_private_key.deploy.private_key_pem
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = ["echo 'Provisioned with ephemeral key'"]
  }
}
```

### SSH Agent Authentication

```hcl
connection {
  type  = "ssh"
  user  = "ubuntu"
  host  = self.public_ip
  # Use keys loaded in the local SSH agent (no private_key needed)
  agent = true
}
```

## Connection Timeouts and Retries

SSH may not be immediately available after an instance boots. Configure the timeout generously:

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = tls_private_key.deploy.private_key_pem
  host        = self.public_ip

  # Wait up to 10 minutes for SSH to become available
  timeout = "10m"
}
```

## Connecting via a Bastion Host

For instances without public IPs, use the `bastion_host` arguments:

```hcl
connection {
  type = "ssh"
  user = "ubuntu"
  host = self.private_ip  # Target instance has only a private IP

  private_key = file(var.private_key_path)

  # Bastion / jump host configuration
  bastion_host        = aws_instance.bastion.public_ip
  bastion_user        = "ec2-user"
  bastion_private_key = file(var.bastion_private_key_path)
}
```

Resource-Level vs Provisioner-Level Connections

The `connection` block can be placed at the resource level (shared by all provisioners) or inside a specific provisioner:

```hcl
resource "aws_instance" "web" {
  # Resource-level connection: used by all provisioners unless overridden
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.deploy.private_key_pem
    host        = self.public_ip
  }

  provisioner "file" {
    source      = "config.txt"
    destination = "/tmp/config.txt"
    # Uses resource-level connection
  }

  provisioner "remote-exec" {
    inline = ["cat /tmp/config.txt"]

    # Override with a different connection for this provisioner only
    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = tls_private_key.deploy.private_key_pem
      host        = self.public_ip
      timeout     = "3m"
    }
  }
}
```

## Conclusion

A properly configured `connection` block is the foundation of all remote provisioning in OpenTofu. Dynamically generated key pairs can be useful for temporary environments, but the private key is stored in OpenTofu state, so protect state carefully. Always set a generous `timeout` to account for instance boot time.
