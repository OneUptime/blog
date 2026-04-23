# Remote-Exec Provisioner in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provisioner, remote-exec, SSH, Infrastructure as Code

Description: Learn how to use the remote-exec provisioner in OpenTofu to run scripts and commands on newly created remote resources via SSH or WinRM.

## What is the remote-exec Provisioner?

The `remote-exec` provisioner in OpenTofu allows you to run commands or scripts on a remote resource after it is created. It connects via SSH or WinRM and executes the specified commands.

> **Note:** The OpenTofu documentation recommends using `remote-exec` only as a last resort. Prefer user data, Packer images, or configuration management tools where possible.

## Basic Usage

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids = [aws_security_group.allow_ssh.id]

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y nginx",
      "sudo systemctl enable nginx",
      "sudo systemctl start nginx",
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

## Connection Block Configuration

### SSH Connection

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(pathexpand("~/.ssh/id_rsa"))
  host        = self.public_ip
  port        = 22
  timeout     = "5m"
  agent       = false
}
```

### SSH via Bastion Host

```hcl
connection {
  type        = "ssh"
  user        = "ubuntu"
  private_key = file(var.private_key_path)
  host        = self.private_ip

  bastion_host        = aws_instance.bastion.public_ip
  bastion_user        = "ubuntu"
  bastion_private_key = file(var.private_key_path)
}
```

### WinRM Connection

```hcl
connection {
  type     = "winrm"
  user     = "Administrator"
  password = var.admin_password
  host     = self.public_ip
  port     = 5985
  https    = false
  timeout  = "10m"
}
```

## Running a Script File

```hcl
provisioner "remote-exec" {
  scripts = [
    "${path.module}/scripts/install-deps.sh",
    "${path.module}/scripts/configure-app.sh",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Combining file and remote-exec

Copy a configuration file, then run the setup:

```hcl
provisioner "file" {
  source      = "${path.module}/configs/app.conf"
  destination = "/tmp/app.conf"

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}

provisioner "remote-exec" {
  inline = [
    "sudo mv /tmp/app.conf /etc/myapp/app.conf",
    "sudo systemctl restart myapp",
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## Destroy-Time Provisioners

```hcl
provisioner "remote-exec" {
  when = destroy

  inline = [
    "sudo systemctl stop myapp",
    "/usr/local/bin/deregister-from-loadbalancer.sh",
  ]

  on_failure = continue   # Don't block destroy if this fails

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = file(var.private_key_path)
    host        = self.public_ip
  }
}
```

## terraform_data Pattern

Use `terraform_data` with `remote-exec` when you need to re-run provisioning without recreating the target resource:

```hcl
resource "terraform_data" "configure" {
  triggers_replace = filemd5("${path.module}/configs/app.conf")

  provisioner "remote-exec" {
    inline = ["sudo systemctl restart myapp"]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = aws_instance.app.public_ip
    }
  }
}
```

## Troubleshooting

**Connection timeout:**
```text
Error: timeout - last error: dial tcp 1.2.3.4:22: i/o timeout
```
Check security group rules and ensure port 22 is accessible.

**Permission denied (publickey):**
Verify the key pair and username are correct. The instance may not be fully booted yet, so increase `timeout` and retry once SSH is available.

**Script failing silently:** Add `set -o errexit` as the first inline command to exit on the first error.

## Best Practices

1. **Always add `set -o errexit`** as the first inline command to catch failures
2. **Use `on_failure = continue`** for destroy provisioners
3. **Set a reasonable `timeout`** - default is 5 minutes which may be too short for slow connections
4. **Prefer user data** for bootstrapping that runs once at instance launch
5. **Log output to a file** on the remote host for debugging: `command 2>&1 | sudo tee /var/log/provision.log`

## Conclusion

The `remote-exec` provisioner is a powerful tool for running commands on newly provisioned infrastructure. While it should be used judiciously in favor of alternatives like user data or Packer, it remains invaluable for scenarios that require interactive or post-provision configuration steps.
