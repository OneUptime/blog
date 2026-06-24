# How to Use Ephemeral Values in Connection Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Resources, Connection Blocks, SSH, WinRM, HCL, Infrastructure as Code

Description: Learn how to use ephemeral values in connection blocks in OpenTofu to securely pass SSH keys and passwords without storing them in state.

---

In OpenTofu 1.11 and later, connection blocks configure how OpenTofu connects to a remote machine for provisioner execution. They support ephemeral values, so SSH private keys, passwords, and certificates are not stored in plan or state data, although provisioner logs can still expose connection values.

---

## SSH Connection with Ephemeral Private Key

```hcl
# Fetch SSH private key from Secrets Manager - never stored in state

ephemeral "aws_secretsmanager_secret_version" "ssh_private_key" {
  secret_id = "production/ssh/ec2-deploy-key"
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deploy.key_name

  connection {
    type        = "ssh"
    user        = "ec2-user"
    host        = self.public_ip

    # Ephemeral value: not stored in state
    private_key = ephemeral.aws_secretsmanager_secret_version.ssh_private_key.secret_string
  }

  provisioner "remote-exec" {
    inline = [
      "sudo yum update -y",
      "sudo systemctl restart app",
    ]
  }
}
```

---

## WinRM Connection with Ephemeral Password

WinRM connections can use ephemeral values, but WinRM support is deprecated in OpenTofu v1.12 and planned for removal in v1.13.

```hcl
# Fetch Windows administrator password ephemerally
ephemeral "aws_secretsmanager_secret_version" "win_password" {
  secret_id = "production/windows/admin-password"
}

resource "aws_instance" "windows" {
  ami           = data.aws_ami.windows.id
  instance_type = "t3.medium"

  connection {
    type     = "winrm"
    user     = "Administrator"
    host     = self.public_ip
    https    = true
    insecure = false

    # Ephemeral password
    password = ephemeral.aws_secretsmanager_secret_version.win_password.secret_string
  }

  provisioner "remote-exec" {
    inline = [
      "powershell -Command Install-WindowsFeature -name Web-Server",
    ]
  }
}
```

---

## SSH with a Bastion Host

```hcl
ephemeral "aws_secretsmanager_secret_version" "bastion_key" {
  secret_id = "production/ssh/bastion-key"
}

ephemeral "aws_secretsmanager_secret_version" "app_key" {
  secret_id = "production/ssh/app-server-key"
}

resource "aws_instance" "private_app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id

  # Connect through bastion using ephemeral keys for both hops
  connection {
    type        = "ssh"
    user        = "ec2-user"
    host        = self.private_ip
    private_key = ephemeral.aws_secretsmanager_secret_version.app_key.secret_string

    bastion_host        = aws_instance.bastion.public_ip
    bastion_user        = "ec2-user"
    bastion_private_key = ephemeral.aws_secretsmanager_secret_version.bastion_key.secret_string
  }

  provisioner "remote-exec" {
    inline = ["sudo systemctl start app"]
  }
}
```

---

## SSH Certificate-Based Authentication

```hcl
ephemeral "aws_secretsmanager_secret_version" "client_certificate" {
  secret_id = "production/ssh/client-certificate"
}

ephemeral "aws_secretsmanager_secret_version" "client_private_key" {
  secret_id = "production/ssh/client-private-key"
}

resource "null_resource" "tls_configure" {
  connection {
    type        = "ssh"
    user        = "admin"
    host        = var.target_host

    # SSH certificate and matching private key - neither stored in plan or state
    certificate = ephemeral.aws_secretsmanager_secret_version.client_certificate.secret_string
    private_key = ephemeral.aws_secretsmanager_secret_version.client_private_key.secret_string
  }

  provisioner "remote-exec" {
    script = "${path.module}/scripts/configure.sh"
  }
}
```

---

## Connection Block in null_resource

Connection blocks on `null_resource` (or `terraform_data`) also support ephemeral values:

```hcl
ephemeral "aws_ssm_parameter" "ssh_password" {
  arn             = "arn:aws:ssm:us-east-1:123456789012:parameter/production/servers/ssh-password"
  with_decryption = true
}

resource "null_resource" "post_deploy" {
  triggers = {
    deploy_id = var.deploy_id
  }

  connection {
    type     = "ssh"
    user     = "ubuntu"
    host     = var.server_host
    password = ephemeral.aws_ssm_parameter.ssh_password.value
    # Password never written to state
  }

  provisioner "remote-exec" {
    inline = [
      "cd /app && git pull",
      "sudo systemctl restart app",
    ]
  }
}
```

---

## What Gets Stored in State

When you use ephemeral values in connection blocks:

| Value | Stored in State or Plan? |
|---|---|
| `private_key` (ephemeral) | No |
| `password` (ephemeral) | No |
| `certificate` (ephemeral) | No |
| `bastion_private_key` (ephemeral) | No |

Ephemeral values are never stored in state or plan data. However, provisioner logs can still expose values from a connection block.

---

## Summary

In OpenTofu 1.11 and later, connection blocks support ephemeral values for `private_key`, `password`, `certificate`, and `bastion_private_key`. This allows configuring SSH and WinRM connections with credentials fetched from Secrets Manager, Parameter Store, or Vault without storing those credentials in plan or state data. WinRM support is deprecated in OpenTofu v1.12 and planned for removal in v1.13, and provisioner logs can still expose connection values.
