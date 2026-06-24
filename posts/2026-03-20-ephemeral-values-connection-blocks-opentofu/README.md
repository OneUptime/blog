# How to Use Ephemeral Values in Connection Blocks in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Values, Connection Blocks, Provisioner, SSH, Infrastructure as Code, DevOps

Description: A guide to using ephemeral values in connection blocks in OpenTofu to securely manage SSH keys and passwords without persisting them in state.

## Introduction

Connection blocks in OpenTofu define how provisioners connect to remote machines. In OpenTofu v1.11 and later, you can use ephemeral values for connection credentials (SSH private keys, passwords, bastion host keys) so they are used during provisioning but never written to the state or plan.

## Basic Ephemeral SSH Private Key in Connection Block

```hcl
variable "provisioner_public_key" {
  type = string
}

variable "provisioner_private_key" {
  type      = string
  sensitive = true
  ephemeral = true
}

# Register the public key with AWS
resource "aws_key_pair" "provisioner" {
  key_name   = "temp-provisioner-${var.deployment_id}"
  public_key = var.provisioner_public_key
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.provisioner.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    # Private key is ephemeral - not stored in state or plan
    private_key = var.provisioner_private_key
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
    ]
  }
}
```

## Using Vault for SSH Keys

```hcl
# Get SSH private key from Vault
ephemeral "vault_kv_secret_v2" "ssh_key" {
  mount = "secret"
  name  = "platform/provisioner-ssh-key"
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = var.existing_key_name

  connection {
    type        = "ssh"
    user        = "ec2-user"
    # Key fetched from Vault, not stored in state or plan
    private_key = ephemeral.vault_kv_secret_v2.ssh_key.data["private_key"]
    host        = self.private_ip
  }

  provisioner "remote-exec" {
    script = "${path.module}/scripts/configure.sh"
  }
}
```

## WinRM Connection with Ephemeral Password

```hcl
# Get Windows admin password from Secrets Manager
ephemeral "aws_secretsmanager_secret_version" "windows_admin" {
  secret_id = "platform/windows-admin-password"
}

resource "aws_instance" "windows" {
  ami           = var.windows_ami_id
  instance_type = "t3.medium"

  connection {
    type     = "winrm"
    user     = "Administrator"
    # Password ephemeral - not in state or plan
    password = jsondecode(
      ephemeral.aws_secretsmanager_secret_version.windows_admin.secret_string
    ).password
    host     = self.public_ip
    https    = true
    insecure = false
  }

  provisioner "remote-exec" {
    inline = [
      "powershell.exe -Command \"Install-WindowsFeature -Name Web-Server\"",
    ]
  }
}
```

## Bastion Host Connection with Ephemeral Keys

```hcl
# Get both bastion and target host SSH keys from Vault
ephemeral "vault_kv_secret_v2" "bastion_key" {
  mount = "secret"
  name  = "platform/bastion-ssh-key"
}

ephemeral "vault_kv_secret_v2" "target_key" {
  mount = "secret"
  name  = "platform/target-ssh-key"
}

resource "aws_instance" "private_server" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id

  connection {
    type        = "ssh"
    user        = "ubuntu"
    # Target server key
    private_key = ephemeral.vault_kv_secret_v2.target_key.data["private_key"]
    host        = self.private_ip

    # Bastion host configuration
    bastion_host        = aws_instance.bastion.public_ip
    bastion_user        = "ubuntu"
    # Bastion key - also ephemeral
    bastion_private_key = ephemeral.vault_kv_secret_v2.bastion_key.data["private_key"]
  }

  provisioner "remote-exec" {
    inline = [
      "sudo systemctl start myapp",
    ]
  }
}
```

## Dynamic Key Pair Registration per Deployment

```hcl
# Use a unique key pair name per deployment
variable "deploy_public_key" {
  type = string
}

variable "deploy_private_key" {
  type      = string
  sensitive = true
  ephemeral = true
}

resource "terraform_data" "deployment_id" {
  input = var.deployment_id
}

# Register the public key with AWS for this deployment
resource "aws_key_pair" "deploy" {
  key_name   = "deploy-${terraform_data.deployment_id.output}"
  public_key = var.deploy_public_key

  lifecycle {
    # Register the replacement key pair before removing the old one
    create_before_destroy = true
  }
}

resource "aws_instance" "configured" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = var.deploy_private_key
    host        = self.public_ip
    timeout     = "5m"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo bash /tmp/setup.sh",
    ]
  }
}
```

## terraform_data with Ephemeral Connection

```hcl
# Run configuration after instance is ready
ephemeral "aws_secretsmanager_secret_version" "instance_key" {
  secret_id = "myapp/instance-ssh-key"
}

resource "terraform_data" "configure_instance" {
  triggers_replace = {
    instance_id  = aws_instance.app.id
    config_hash  = sha256(file("${path.module}/scripts/configure.sh"))
  }

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = jsondecode(
      ephemeral.aws_secretsmanager_secret_version.instance_key.secret_string
    ).private_key
    host        = aws_instance.app.public_ip
  }

  provisioner "file" {
    source      = "${path.module}/scripts/configure.sh"
    destination = "/tmp/configure.sh"
  }

  provisioner "remote-exec" {
    inline = ["bash /tmp/configure.sh"]
  }
}
```

## Conclusion

Using ephemeral values in connection blocks prevents SSH private keys and passwords from being written to the state or plan - a critical security improvement. When OpenTofu needs connection credentials during provisioning, it can fetch or accept them ephemerally, use them, and discard them. This approach works well with secrets rotation, as each deployment automatically picks up current credentials from your secrets management system or ephemeral input values. Combine ephemeral connection credentials with short-lived key pairs for maximum security in production environments. Also note that resource-level connection blocks do not automatically trigger provisioner log suppression, so avoid logging credential material from your provisioners.
